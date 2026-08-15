import { Title } from '@solidjs/meta';
import { A } from '@solidjs/router';
import { createMemo, createSignal, For, Show } from 'solid-js';
import { adminApi } from '~/api/endpoints/admin';
import AdminShell from '~/components/admin/AdminShell';
import { StatusChip, StatusDonutChart, VolumeTrendChart } from '~/components/admin/AdminUI';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { adminDataKeys, createAdminCachedQuery } from '~/lib/admin-data';
import { formatCompactNumber, formatCurrencyAmount, formatDateTime } from '~/utils/format';

type TimeWindow = '7d' | '30d' | 'all';
type RankingKind = 'pairs' | 'giftcards';

function activityHref(entityType: string, entityId: string, detailPath: string) {
  if (entityType === 'swap') {
    return `/swaps?selected=${encodeURIComponent(entityId)}`;
  }

  if (entityType.includes('gift')) {
    return `/giftcards?selected=${encodeURIComponent(entityId)}`;
  }

  return detailPath;
}

function normalizeStatus(status?: string | null) {
  return (status || '').trim().toLowerCase();
}

function matchesWindow(value: string | undefined | null, window: TimeWindow, reference: string) {
  if (window === 'all' || !value) {
    return true;
  }

  const date = new Date(value);
  const end = new Date(reference);
  if (Number.isNaN(date.getTime()) || Number.isNaN(end.getTime())) {
    return true;
  }

  const hours = window === '7d' ? 24 * 7 : 24 * 30;
  const cutoff = end.getTime() - hours * 60 * 60 * 1000;
  return date.getTime() >= cutoff;
}

function activityTypeLabel(entityType: string) {
  return entityType === 'swap' ? 'Swap' : 'Gift card';
}

function formatActivityTitle(entityType: string, title: string) {
  if (entityType === 'swap') {
    return title
      .split(' -> ')
      .map((segment) => segment.toUpperCase())
      .join(' → ');
  }

  if (/^\d+$/.test(title)) {
    return `Product ${title}`;
  }

  return title;
}

function healthState(worker: {
  giftcard_retry_pending: number;
  giftcard_queued: number;
  swap_polling_stale: number;
  webhook_retry_due: number;
  webhook_dead_letters: number;
}) {
  if (worker.webhook_dead_letters > 0 || worker.swap_polling_stale > 0) {
    return { label: 'Attention', status: 'failed' };
  }

  if (worker.webhook_retry_due > 0 || worker.giftcard_retry_pending > 0) {
    return { label: 'Watch', status: 'waiting' };
  }

  return { label: 'Healthy', status: 'completed' };
}

export default function OverviewPage() {
  const auth = useAdminAccess();
  const [windowFilter, setWindowFilter] = createSignal<TimeWindow>('30d');
  const [rankingKind, setRankingKind] = createSignal<RankingKind>('pairs');

  const dashboard = createAdminCachedQuery({
    source: () => (auth.ready() ? 'dashboard' : null),
    getKey: () => adminDataKeys.dashboard(),
    fetcher: () => adminApi.getDashboard(),
  });

  const data = createMemo(() => dashboard.data());

  const kpis = createMemo(() => {
    const metrics = data()?.kpis;
    if (!metrics) {
      return [];
    }

    return [
      {
        label: 'Total swap volume',
        value: formatCurrencyAmount(metrics.total_swap_volume, 'USD'),
        caption: 'Recorded swap input volume across all traffic',
        href: '/swaps',
      },
      {
        label: 'Total gift card sales',
        value: formatCurrencyAmount(metrics.total_giftcard_sales, 'USD'),
        caption: 'Recorded gift card face value across all traffic',
        href: '/giftcards',
      },
      {
        label: 'Net revenue',
        value: formatCurrencyAmount(metrics.total_platform_revenue, 'USD'),
        caption: 'Realized on completed transactions only',
        href: '/finance',
      },
      {
        label: 'Total transactions',
        value: formatCompactNumber(metrics.total_transactions, 0),
        caption: 'Swaps and gift card orders recorded',
        href: '/search',
      },
    ];
  });

  const filteredTrend = createMemo(() => {
    const rows = [...(data()?.volume_trend || [])].sort((left, right) => left.date.localeCompare(right.date));
    const reference = data()?.generated_at || new Date().toISOString();
    return rows.filter((row) => matchesWindow(`${row.date}T23:59:59Z`, windowFilter(), reference));
  });

  const filteredActivity = createMemo(() => {
    const reference = data()?.generated_at || new Date().toISOString();
    return [...(data()?.recent_activity || [])]
      .filter((item) => matchesWindow(item.created_at, windowFilter(), reference))
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .slice(0, 10);
  });

  const rankedItems = createMemo(() => {
    if (rankingKind() === 'giftcards') {
      return (data()?.top_giftcards || []).map((item) => ({
        title: /^\d+$/.test(item.product) ? `Product ${item.product}` : item.product,
        subtitle: item.currency || '—',
        count: item.orders,
        volume: formatCurrencyAmount(item.volume, item.currency, 2),
      }));
    }

    return (data()?.top_pairs || []).map((item) => ({
      title: `${item.from_currency} → ${item.to_currency}`,
      subtitle: `${item.from_network} to ${item.to_network}`,
      count: item.trades,
      volume: formatCurrencyAmount(item.volume_input, item.from_currency, 4),
    }));
  });

  const systemHealth = createMemo(() => {
    const snapshot = data();
    if (!snapshot) {
      return null;
    }

    const routing = healthState(snapshot.worker);
    const queueBacklog = snapshot.worker.giftcard_queued + snapshot.worker.giftcard_retry_pending;

    return {
      routing,
      queueBacklog,
      riskCount: snapshot.risk_flags.length,
      activeUsers: snapshot.kpis.active_users,
      providerCount: snapshot.providers.length,
    };
  });

  return (
    <AdminShell
      title="Operations overview"
      subtitle="A minimal command surface for volume, health, routing, and live activity."
      actions={
        <div class="overview-actions-row">
          <label class="field field-inline overview-window-field">
            <span>Window</span>
            <select class="text-input select-input" value={windowFilter()} onChange={(event) => setWindowFilter(event.currentTarget.value as TimeWindow)}>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </label>
          <button class="button button-secondary" type="button" onClick={() => void dashboard.refetch()}>
            {dashboard.refreshing() ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      }
    >
      <Title>Assetar Back Office</Title>

      <Show when={dashboard.status() !== 'loading' || data()} fallback={<section class="panel">Loading dashboard…</section>}>
        <Show when={data()} fallback={<section class="panel empty-state">No overview data available yet.</section>}>
          {(dashboardData) => (
            <div class="page-stack overview-minimal">
              <section class="panel stack-gap overview-minimal__hero">
                <div class="overview-minimal__hero-copy">
                  <p class="eyebrow">Overview</p>
                  <h3>Operational picture at a glance.</h3>
                  <p class="muted">Recorded volume, transaction mix, route demand, and the most recent desk-visible activity all in one place.</p>
                </div>
                <div class="overview-minimal__timestamp">Updated {formatDateTime(dashboardData().generated_at)}</div>
                <div class="overview-kpi-strip">
                  <For each={kpis()}>
                    {(card) => (
                      <A class="metric-card metric-card--dense metric-card--interactive" href={card.href}>
                        <span>{card.label}</span>
                        <strong>{card.value}</strong>
                        <small>{card.caption}</small>
                      </A>
                    )}
                  </For>
                </div>
              </section>

              <div class="overview-minimal__grid overview-minimal__grid--top">
                <section class="panel stack-gap">
                  <div class="section-heading">
                    <div>
                      <p class="eyebrow">Volume</p>
                      <h3>Daily transaction volume</h3>
                    </div>
                  </div>
                  <VolumeTrendChart points={filteredTrend()} />
                </section>

                <div class="overview-side-stack">
                  <section class="panel stack-gap overview-health-card">
                    <div class="section-heading">
                      <div>
                        <p class="eyebrow">System health</p>
                        <h3>Routing and queue status</h3>
                      </div>
                      <Show when={systemHealth()}>
                        {(health) => <StatusChip status={health().routing.status} label={health().routing.label} />}
                      </Show>
                    </div>
                    <Show when={systemHealth()}>
                      {(health) => (
                        <div class="overview-health-card__grid">
                          <div>
                            <span>Webhook backlog</span>
                            <strong>{formatCompactNumber(dashboardData().worker.webhook_retry_due + dashboardData().worker.webhook_dead_letters, 0)}</strong>
                          </div>
                          <div>
                            <span>Queue backlog</span>
                            <strong>{formatCompactNumber(health().queueBacklog, 0)}</strong>
                          </div>
                          <div>
                            <span>Risk flags</span>
                            <strong>{formatCompactNumber(health().riskCount, 0)}</strong>
                          </div>
                          <div>
                            <span>Active users</span>
                            <strong>{formatCompactNumber(health().activeUsers, 0)}</strong>
                          </div>
                        </div>
                      )}
                    </Show>
                  </section>

                  <section class="panel stack-gap">
                    <div class="section-heading">
                      <div>
                        <p class="eyebrow">Status mix</p>
                        <h3>Transaction outcome breakdown</h3>
                      </div>
                    </div>
                    <StatusDonutChart breakdown={dashboardData().status_breakdown} />
                  </section>
                </div>
              </div>

              <div class="overview-minimal__grid overview-minimal__grid--bottom">
                <section class="panel stack-gap">
                  <div class="section-heading section-heading--split">
                    <div>
                      <p class="eyebrow">Top performers</p>
                      <h3>{rankingKind() === 'pairs' ? 'Most routed swap pairs' : 'Top gift card products'}</h3>
                    </div>
                    <label class="field field-inline overview-window-field">
                      <span>Show</span>
                      <select class="text-input select-input" value={rankingKind()} onChange={(event) => setRankingKind(event.currentTarget.value as RankingKind)}>
                        <option value="pairs">Swap pairs</option>
                        <option value="giftcards">Gift cards</option>
                      </select>
                    </label>
                  </div>
                  <div class="overview-ranking-list">
                    <For each={rankedItems().slice(0, 5)}>
                      {(item) => (
                        <div class="overview-ranking-row">
                          <div>
                            <strong>{item.title}</strong>
                            <span>{item.subtitle}</span>
                          </div>
                          <div class="overview-ranking-row__meta">
                            <small>{formatCompactNumber(item.count, 0)} records</small>
                            <strong>{item.volume}</strong>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </section>

                <section class="panel stack-gap">
                  <div class="section-heading">
                    <div>
                      <p class="eyebrow">Live activity</p>
                      <h3>Latest transactions</h3>
                    </div>
                  </div>
                  <div class="overview-activity-feed">
                    <For each={filteredActivity()}>
                      {(item) => (
                        <A class="overview-activity-row" href={activityHref(item.entity_type, item.entity_id, item.detail_path)}>
                          <div class="overview-activity-row__copy">
                            <div class="overview-activity-row__topline">
                              <strong>{formatActivityTitle(item.entity_type, item.title)}</strong>
                              <StatusChip status={item.status} />
                            </div>
                            <span>{activityTypeLabel(item.entity_type)} · {item.provider || 'Direct'} · {formatDateTime(item.created_at)}</span>
                          </div>
                          <div class="overview-activity-row__meta">
                            <strong>{formatCurrencyAmount(item.amount, item.currency)}</strong>
                          </div>
                        </A>
                      )}
                    </For>
                  </div>
                </section>
              </div>
            </div>
          )}
        </Show>
      </Show>
    </AdminShell>
  );
}
