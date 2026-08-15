import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount, type JSX } from 'solid-js';
import type { OpsDashboardVolumePoint, OpsDashboardStatusBreakdown } from '~/types/admin';
import { formatAmount, formatCompactNumber } from '~/utils/format';

export function statusTone(status?: string | null): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  const value = (status || '').toLowerCase();

  if (!value) {
    return 'neutral';
  }

  if (
    value.includes('finished') ||
    value.includes('completed') ||
    value.includes('delivered') ||
    value.includes('paid') ||
    value.includes('valid') ||
    value.includes('ok')
  ) {
    return 'success';
  }

  if (
    value.includes('failed') ||
    value.includes('expired') ||
    value.includes('error') ||
    value.includes('refund') ||
    value.includes('rejected') ||
    value.includes('invalid') ||
    value.includes('dlq')
  ) {
    return 'danger';
  }

  if (
    value.includes('waiting') ||
    value.includes('pending') ||
    value.includes('queued') ||
    value.includes('confirm') ||
    value.includes('stale') ||
    value.includes('retry')
  ) {
    return 'warning';
  }

  if (value.includes('sending') || value.includes('processing') || value.includes('sync')) {
    return 'info';
  }

  return 'neutral';
}

export function StatusChip(props: { status?: string | null; label?: string }) {
  const tone = createMemo(() => statusTone(props.status || props.label));

  return <span class={`status-chip status-chip--${tone()}`}>{props.label || props.status || 'Unknown'}</span>;
}

export function MetricCard(props: { label: string; value: string; caption?: string }) {
  return (
    <div class="metric-card metric-card--dense">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      <Show when={props.caption}>
        <small>{props.caption}</small>
      </Show>
    </div>
  );
}

export function CopyButton(props: { value?: string | null; label?: string }) {
  const [copied, setCopied] = createSignal(false);

  const copy = async () => {
    if (!props.value || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(props.value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button class="button button-secondary button-compact" type="button" onClick={() => void copy()}>
      {copied() ? 'Copied' : props.label || 'Copy'}
    </button>
  );
}

export function Drawer(props: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  actions?: JSX.Element;
  children: JSX.Element;
}) {
  const [mounted, setMounted] = createSignal(false);

  onMount(() => {
    setMounted(true);
  });

  createEffect(() => {
    if (!props.open || typeof document === 'undefined') {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        props.onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    onCleanup(() => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', handleEscape);
    });
  });

  return (
    <Show when={mounted() && props.open}>
      <div class="drawer-layer">
        <button class="drawer-backdrop" type="button" aria-label="Close details" onClick={props.onClose} />
        <aside class="drawer-panel" aria-modal="true" role="dialog">
          <div class="drawer-header">
            <div class="drawer-header__copy">
              <p class="eyebrow">Detail view</p>
              <h3>{props.title}</h3>
              <Show when={props.subtitle}>
                <p class="muted">{props.subtitle}</p>
              </Show>
            </div>
            <div class="drawer-header__actions">
              {props.actions}
              <button class="button button-secondary button-compact" type="button" onClick={props.onClose}>
                Close
              </button>
            </div>
          </div>
          <div class="drawer-body">{props.children}</div>
        </aside>
      </div>
    </Show>
  );
}

export function LoadingSkeleton(props: { rows?: number }) {
  const count = props.rows || 5;
  return (
    <div class="skeleton-stack">
      {Array.from({ length: count }).map(() => (
        <div class="skeleton-row" />
      ))}
    </div>
  );
}

export function VolumeTrendChart(props: { points: OpsDashboardVolumePoint[] }) {
  const width = 560;
  const height = 240;
  const padding = 24;

  const points = createMemo(() => [...props.points].sort((left, right) => left.date.localeCompare(right.date)));
  const swapPoints = createMemo(() => points().map((point) => point.swap_volume_input));
  const giftcardPoints = createMemo(() => points().map((point) => point.giftcard_volume));
  const max = createMemo(() => Math.max(1, ...swapPoints(), ...giftcardPoints()));
  const gridLevels = [0.25, 0.5, 0.75, 1];

  const buildPath = (values: number[]) => {
    if (!values.length) {
      return '';
    }

    return values
      .map((value, index) => {
        const x = padding + (index * (width - padding * 2)) / Math.max(1, values.length - 1);
        const y = height - padding - ((height - padding * 2) * value) / max();
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  };

  const swapPath = createMemo(() => buildPath(swapPoints()));
  const giftcardPath = createMemo(() => buildPath(giftcardPoints()));

  return (
    <div class="trend-chart">
      <div class="trend-chart__legend">
        <span><i class="swaps" /> Swap volume</span>
        <span><i class="giftcards" /> Gift card volume</span>
        <strong>{formatCompactNumber(max())}</strong>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} aria-label="Volume trend chart">
        <rect x="0" y="0" width={width} height={height} rx="20" fill="#fafafa" />
        <For each={gridLevels}>
          {(level) => {
            const y = height - padding - (height - padding * 2) * level;
            return <path d={`M ${padding} ${y.toFixed(2)} L ${width - padding} ${y.toFixed(2)}`} stroke="#ececec" stroke-width="1" />;
          }}
        </For>
        <path d={swapPath()} fill="none" stroke="#171717" stroke-width="2.8" stroke-linecap="round" />
        <path d={giftcardPath()} fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="6 6" />
      </svg>
      <div class="trend-chart__axis">
        <Show when={points().length} fallback={<span>No history yet</span>}>
          <>
            <span>{points()[0]?.date || '—'}</span>
            <span>{points()[Math.floor(points().length / 2)]?.date || '—'}</span>
            <span>{points()[points().length - 1]?.date || '—'}</span>
          </>
        </Show>
      </div>
    </div>
  );
}

export function StatusDonutChart(props: { breakdown: OpsDashboardStatusBreakdown }) {
  const items = createMemo(() => {
    const rows = [
      { key: 'completed', label: 'Completed', value: props.breakdown.completed, color: '#171717' },
      { key: 'failed', label: 'Failed', value: props.breakdown.failed, color: '#ef4444' },
      { key: 'expired', label: 'Expired', value: props.breakdown.expired, color: '#f59e0b' },
      { key: 'refunded', label: 'Refunded', value: props.breakdown.refunded, color: '#10b981' },
      { key: 'open', label: 'Open', value: props.breakdown.open, color: '#94a3b8' },
    ];

    return rows.filter((item) => item.value > 0);
  });

  const total = createMemo(() => items().reduce((sum, item) => sum + item.value, 0));
  const circumference = 2 * Math.PI * 48;

  const segments = createMemo(() => {
    let offset = 0;
    return items().map((item) => {
      const length = total() > 0 ? (item.value / total()) * circumference : 0;
      const segment = {
        ...item,
        length,
        offset,
      };
      offset += length;
      return segment;
    });
  });

  return (
    <div class="status-donut">
      <div class="status-donut__chart">
        <svg viewBox="0 0 140 140" aria-label="Status breakdown donut chart">
          <circle cx="70" cy="70" r="48" fill="none" stroke="#ededed" stroke-width="16" />
          <For each={segments()}>
            {(segment) => (
              <circle
                cx="70"
                cy="70"
                r="48"
                fill="none"
                stroke={segment.color}
                stroke-width="16"
                stroke-linecap="butt"
                stroke-dasharray={`${segment.length} ${circumference - segment.length}`}
                stroke-dashoffset={-segment.offset}
                transform="rotate(-90 70 70)"
              />
            )}
          </For>
        </svg>
        <div class="status-donut__center">
          <strong>{formatCompactNumber(total(), 0)}</strong>
          <span>Transactions</span>
        </div>
      </div>

      <div class="status-donut__legend">
        <For each={items()}>
          {(item) => (
            <div class="status-donut__legend-row">
              <div class="status-donut__legend-label">
                <i style={{ background: item.color }} />
                <span>{item.label}</span>
              </div>
              <strong>{formatCompactNumber(item.value, 0)}</strong>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

export function ValueHighlight(props: { value?: number | null; currency?: string | null; digits?: number }) {
  return <strong>{props.currency ? `${formatAmount(props.value, props.digits)} ${props.currency}` : formatAmount(props.value, props.digits)}</strong>;
}
