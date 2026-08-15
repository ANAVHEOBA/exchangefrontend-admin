import { Title } from '@solidjs/meta';
import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { adminApi } from '~/api/endpoints/admin';
import AdminShell from '~/components/admin/AdminShell';
import { CopyButton, Drawer, LoadingSkeleton, StatusChip } from '~/components/admin/AdminUI';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { adminDataKeys, createAdminCachedQuery } from '~/lib/admin-data';
import { formatAmount, formatDateTime, formatPair, truncateMiddle } from '~/utils/format';
import type { ApiError } from '~/types/api';

function removeSelected(params: Record<string, string>): Record<string, string | undefined> {
  return { ...params, selected: undefined };
}

export default function SwapsPage() {
  const auth = useAdminAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const [exporting, setExporting] = createSignal(false);
  const [exportError, setExportError] = createSignal<string | null>(null);
  const [actionState, setActionState] = createSignal<'refresh' | 'reconcile' | null>(null);
  const [actionError, setActionError] = createSignal<string | null>(null);
  const [actionMessage, setActionMessage] = createSignal<string | null>(null);

  const query = createMemo(() => ({
    cursor: searchParams.cursor || undefined,
    limit: Number(searchParams.limit || 20),
    status: searchParams.status || undefined,
    provider: searchParams.provider || undefined,
    from_currency: searchParams.from_currency || undefined,
    to_currency: searchParams.to_currency || undefined,
    date_from: searchParams.date_from || undefined,
    date_to: searchParams.date_to || undefined,
  }));

  const swaps = createAdminCachedQuery({
    source: () => (auth.ready() ? query() : null),
    getKey: (currentQuery) => adminDataKeys.swaps(currentQuery),
    fetcher: (currentQuery) => adminApi.listSwaps(currentQuery),
  });

  const selectedId = createMemo(() => searchParams.selected || null);
  const [swapDetail, { refetch: refetchSwapDetail }] = createResource(
    () => (auth.ready() ? selectedId() : null),
    (id) => adminApi.getSwap(id),
  );
  const [timeline, { refetch: refetchTimeline }] = createResource(
    () => (auth.ready() ? selectedId() : null),
    (id) => adminApi.getSwapTimeline(id),
  );


  const swapFilterOptions = createMemo(() => {
    const rows = swaps.data()?.swaps || [];
    const collect = (selector: (row: (typeof rows)[number]) => string) =>
      Array.from(new Set(rows.map(selector).map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right),
      );
    const ensureCurrent = (values: string[], current?: string) =>
      current && current.trim() && !values.includes(current) ? [current, ...values] : values;

    return {
      statuses: ensureCurrent(collect((row) => row.status), searchParams.status || undefined),
      providers: ensureCurrent(collect((row) => row.provider), searchParams.provider || undefined),
      fromCurrencies: ensureCurrent(collect((row) => row.from_currency), searchParams.from_currency || undefined),
      toCurrencies: ensureCurrent(collect((row) => row.to_currency), searchParams.to_currency || undefined),
    };
  });

  const updateFilter = (name: string, value: string) => {
    setSearchParams({ ...searchParams, [name]: value || undefined, cursor: undefined });
  };

  const clearFilters = () => {
    setSearchParams({ limit: String(query().limit || 20) });
  };

  const openDetail = (id: string) => {
    setSearchParams({ ...searchParams, selected: id });
  };

  const closeDetail = () => {
    setSearchParams(removeSelected(searchParams));
    setActionError(null);
    setActionMessage(null);
  };

  const downloadExport = async () => {
    setExporting(true);
    setExportError(null);

    try {
      const blob = await adminApi.exportSwapsCsv({
        status: query().status,
        provider: query().provider,
        from_currency: query().from_currency,
        to_currency: query().to_currency,
        date_from: query().date_from,
        date_to: query().date_to,
      });

      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = 'assetar-swaps.csv';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setExportError(apiError.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const runAction = async (action: 'refresh' | 'reconcile') => {
    if (!selectedId()) {
      return;
    }

    setActionState(action);
    setActionError(null);
    setActionMessage(null);

    try {
      const response =
        action === 'refresh'
          ? await adminApi.refreshSwap(selectedId() as string)
          : await adminApi.reconcileSwap(selectedId() as string);
      setActionMessage(response.message);
      await Promise.all([swaps.refetch(), refetchSwapDetail(), refetchTimeline()]);
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setActionError(apiError.message || 'Action failed.');
    } finally {
      setActionState(null);
    }
  };

  return (
    <AdminShell
      title="Swap operations"
      subtitle="Review the full swap timeline, refresh provider status, and inspect payout state without leaving the queue."
      actions={
        <div class="actions-row">
          <button class="button button-secondary" type="button" onClick={() => void swaps.refetch()}>
            {swaps.refreshing() ? 'Refreshing…' : 'Refresh'}
          </button>
          <button class="button button-primary" type="button" disabled={exporting()} onClick={downloadExport}>
            {exporting() ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      }
    >
      <Title>Swap Operations</Title>

      <section class="panel stack-gap">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Swap queue</p>
            <h3>Filter active and historical swaps</h3>
          </div>
        </div>

        <div class="filter-grid filter-grid--wide">
          <label class="field">
            <span>Status</span>
            <select class="text-input select-input" value={searchParams.status || ''} onChange={(event) => updateFilter('status', event.currentTarget.value)}>
              <option value="">All statuses</option>
              <For each={swapFilterOptions().statuses}>{(value) => <option value={value}>{value}</option>}</For>
            </select>
          </label>
          <label class="field">
            <span>Provider</span>
            <select class="text-input select-input" value={searchParams.provider || ''} onChange={(event) => updateFilter('provider', event.currentTarget.value)}>
              <option value="">All providers</option>
              <For each={swapFilterOptions().providers}>{(value) => <option value={value}>{value}</option>}</For>
            </select>
          </label>
          <label class="field">
            <span>From</span>
            <select class="text-input select-input" value={searchParams.from_currency || ''} onChange={(event) => updateFilter('from_currency', event.currentTarget.value)}>
              <option value="">All source assets</option>
              <For each={swapFilterOptions().fromCurrencies}>{(value) => <option value={value}>{value}</option>}</For>
            </select>
          </label>
          <label class="field">
            <span>To</span>
            <select class="text-input select-input" value={searchParams.to_currency || ''} onChange={(event) => updateFilter('to_currency', event.currentTarget.value)}>
              <option value="">All destination assets</option>
              <For each={swapFilterOptions().toCurrencies}>{(value) => <option value={value}>{value}</option>}</For>
            </select>
          </label>
          <label class="field">
            <span>Date from</span>
            <input class="text-input" type="date" value={searchParams.date_from || ''} onInput={(event) => updateFilter('date_from', event.currentTarget.value)} />
          </label>
          <label class="field">
            <span>Date to</span>
            <input class="text-input" type="date" value={searchParams.date_to || ''} onInput={(event) => updateFilter('date_to', event.currentTarget.value)} />
          </label>
        </div>

        <div class="actions-row">
          <button class="button button-secondary" type="button" onClick={clearFilters}>Clear filters</button>
          <Show when={exportError()}>{(message) => <span class="inline-error">{message()}</span>}</Show>
        </div>
      </section>

      <section class="panel table-card">
        <Show when={swaps.error()}>{(message) => <div class="empty-state">{message()}</div>}</Show>
        <Show when={swaps.status() !== 'loading' || swaps.data()} fallback={<div class="empty-state">Loading swaps…</div>}>
          <Show when={swaps.data()?.swaps.length} fallback={<div class="empty-state">No swaps matched the current filters.</div>}>
            <div class="table-scroll">
              <table class="data-table data-table--interactive">
                <thead>
                  <tr>
                    <th>Trade ID</th>
                    <th>Date</th>
                    <th>Pair</th>
                    <th>Amount</th>
                    <th>Provider</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={swaps.data()?.swaps || []}>
                    {(swap) => (
                      <tr class="clickable-row" onClick={() => openDetail(swap.id)}>
                        <td class="mono">{truncateMiddle(swap.id, 7)}</td>
                        <td>{formatDateTime(swap.created_at)}</td>
                        <td>{formatPair(swap.from_currency, swap.from_network, swap.to_currency, swap.to_network)}</td>
                        <td>{formatAmount(swap.amount, 6)} {swap.from_currency}</td>
                        <td>{swap.provider}</td>
                        <td>{swap.rate_type}</td>
                        <td><StatusChip status={swap.status} /></td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </Show>

        <Show when={swaps.data()?.pagination}>
          {(pagination) => (
            <div class="actions-row spaced-top">
              <span class="muted">Page size: {pagination().limit}</span>
              <button
                class="button button-secondary"
                type="button"
                disabled={!pagination().has_more || !pagination().next_cursor}
                onClick={() => setSearchParams({ ...searchParams, cursor: pagination().next_cursor || undefined })}
              >
                Next page
              </button>
            </div>
          )}
        </Show>
      </section>

      <Drawer
        open={Boolean(selectedId())}
        title={selectedId() ? `Swap ${truncateMiddle(selectedId(), 7)}` : 'Swap detail'}
        subtitle="Full routing, economics, provider tracking, and blockchain proof."
        onClose={closeDetail}
        actions={
          <div class="actions-row">
            <button class="button button-secondary button-compact" type="button" disabled={actionState() !== null} onClick={() => void runAction('refresh')}>
              {actionState() === 'refresh' ? 'Refreshing…' : 'Force sync'}
            </button>
            <button class="button button-primary button-compact" type="button" disabled={actionState() !== null} onClick={() => void runAction('reconcile')}>
              {actionState() === 'reconcile' ? 'Reconciling…' : 'Reconcile'}
            </button>
          </div>
        }
      >
        <Show when={actionMessage()}>{(message) => <div class="inline-success">{message()}</div>}</Show>
        <Show when={actionError()}>{(message) => <div class="inline-error">{message()}</div>}</Show>

        <Show when={!swapDetail.loading} fallback={<LoadingSkeleton rows={7} />}>
          <Show when={swapDetail()} fallback={<div class="empty-state">Swap detail is unavailable.</div>}>
            {(detail) => (
              <div class="page-stack">
                <section class="detail-card stack-gap">
                  <div class="section-heading">
                    <div>
                      <p class="eyebrow">Header</p>
                      <h3>{detail().provider}</h3>
                    </div>
                    <StatusChip status={detail().status} />
                  </div>
                  <dl class="key-value-grid">
                    <dt>Trade ID</dt>
                    <dd class="mono">{detail().swap_id}</dd>
                    <dt>Provider order ID</dt>
                    <dd class="mono">{detail().provider_swap_id || '—'}</dd>
                    <dt>Pair</dt>
                    <dd>{formatPair(detail().from, detail().network_from, detail().to, detail().network_to)}</dd>
                    <dt>Quote expiration</dt>
                    <dd>{formatDateTime(detail().expires_at)}</dd>
                  </dl>
                </section>

                <section class="detail-card stack-gap">
                  <div class="section-heading">
                    <div>
                      <p class="eyebrow">Economics</p>
                      <h3>Amount and pricing</h3>
                    </div>
                  </div>
                  <dl class="key-value-grid">
                    <dt>Amount sent</dt>
                    <dd>{formatAmount(detail().amount, 6)} {detail().from}</dd>
                    <dt>Estimated receive</dt>
                    <dd>{formatAmount(detail().estimated_receive, 6)} {detail().to}</dd>
                    <dt>Actual receive</dt>
                    <dd>{formatAmount(detail().actual_receive, 6)} {detail().to}</dd>
                    <dt>Rate</dt>
                    <dd>{formatAmount(detail().rate, 8)}</dd>
                    <dt>Network fee</dt>
                    <dd>{formatAmount(detail().network_fee, 6)}</dd>
                    <dt>Total fee</dt>
                    <dd>{formatAmount(detail().total_fee, 6)}</dd>
                  </dl>
                </section>

                <section class="detail-card stack-gap">
                  <div class="section-heading">
                    <div>
                      <p class="eyebrow">Routing and addresses</p>
                      <h3>Deposit, payout, and refund path</h3>
                    </div>
                  </div>
                  <dl class="key-value-grid">
                    <dt>Deposit address</dt>
                    <dd class="address-row"><code>{detail().deposit_address}</code><CopyButton value={detail().deposit_address} /></dd>
                    <dt>Deposit memo</dt>
                    <dd>{detail().deposit_extra_id || '—'}</dd>
                    <dt>Recipient address</dt>
                    <dd class="address-row"><code>{detail().recipient_address}</code><CopyButton value={detail().recipient_address} /></dd>
                    <dt>Recipient memo</dt>
                    <dd>{detail().recipient_extra_id || '—'}</dd>
                    <dt>Refund address</dt>
                    <dd class="address-row"><code>{detail().refund_address || '—'}</code><Show when={detail().refund_address}><CopyButton value={detail().refund_address} /></Show></dd>
                    <dt>Refund memo</dt>
                    <dd>{detail().refund_extra_id || '—'}</dd>
                  </dl>
                </section>

                <section class="detail-card stack-gap">
                  <div class="section-heading">
                    <div>
                      <p class="eyebrow">Blockchain proof</p>
                      <h3>Funds tracking</h3>
                    </div>
                  </div>
                  <dl class="key-value-grid">
                    <dt>Inbound tx</dt>
                    <dd class="mono">{truncateMiddle(detail().tx_hash_in, 14)}</dd>
                    <dt>Outbound tx</dt>
                    <dd class="mono">{truncateMiddle(detail().tx_hash_out, 14)}</dd>
                    <dt>Created</dt>
                    <dd>{formatDateTime(detail().created_at)}</dd>
                    <dt>Updated</dt>
                    <dd>{formatDateTime(detail().updated_at)}</dd>
                    <dt>Completed</dt>
                    <dd>{formatDateTime(detail().completed_at)}</dd>
                    <dt>Error</dt>
                    <dd>{detail().error || '—'}</dd>
                  </dl>
                </section>

                <section class="detail-card stack-gap">
                  <div class="section-heading">
                    <div>
                      <p class="eyebrow">Timeline</p>
                      <h3>Provider and system state changes</h3>
                    </div>
                  </div>
                  <Show when={!timeline.loading} fallback={<LoadingSkeleton rows={4} />}>
                    <Show when={timeline()?.timeline.length} fallback={<div class="empty-state">No timeline events recorded yet.</div>}>
                      <ol class="timeline-list">
                        <For each={timeline()?.timeline || []}>
                          {(event) => (
                            <li class="timeline-item">
                              <div class="timeline-item__status">
                                <StatusChip status={event.status} />
                                <strong>{formatDateTime(event.created_at)}</strong>
                              </div>
                              <p>{event.message || 'No provider message recorded.'}</p>
                            </li>
                          )}
                        </For>
                      </ol>
                    </Show>
                  </Show>
                </section>
              </div>
            )}
          </Show>
        </Show>
      </Drawer>
    </AdminShell>
  );
}
