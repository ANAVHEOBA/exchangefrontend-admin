import { Title } from '@solidjs/meta';
import { A, useSearchParams } from '@solidjs/router';
import { createMemo, For, Show, createSignal } from 'solid-js';
import AdminShell from '~/components/admin/AdminShell';
import { adminApi } from '~/api/endpoints/admin';
import { adminDataKeys, createAdminCachedQuery } from '~/lib/admin-data';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { formatAmount, formatDateTime, truncateMiddle } from '~/utils/format';
import type { ApiError } from '~/types/api';

export default function SwapsPage() {
  const auth = useAdminAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const [exporting, setExporting] = createSignal(false);
  const [exportError, setExportError] = createSignal<string | null>(null);

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

  const updateFilter = (name: string, value: string) => {
    const next = { ...searchParams, [name]: value || undefined, cursor: undefined };
    setSearchParams(next);
  };

  const clearFilters = () => {
    setSearchParams({ limit: String(query().limit || 20) });
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

  return (
    <AdminShell
      title="Swap operations"
      subtitle="Review swap flow, refresh provider state, and export audit-ready history."
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
            <h3>Filter recent swap traffic</h3>
          </div>
        </div>

        <div class="filter-grid filter-grid--wide">
          <label class="field">
            <span>Status</span>
            <input class="text-input" value={searchParams.status || ''} onInput={(event) => updateFilter('status', event.currentTarget.value)} />
          </label>
          <label class="field">
            <span>Provider</span>
            <input class="text-input" value={searchParams.provider || ''} onInput={(event) => updateFilter('provider', event.currentTarget.value)} />
          </label>
          <label class="field">
            <span>From</span>
            <input class="text-input" value={searchParams.from_currency || ''} onInput={(event) => updateFilter('from_currency', event.currentTarget.value)} />
          </label>
          <label class="field">
            <span>To</span>
            <input class="text-input" value={searchParams.to_currency || ''} onInput={(event) => updateFilter('to_currency', event.currentTarget.value)} />
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
          <button class="button button-secondary" type="button" onClick={clearFilters}>
            Clear filters
          </button>
          <Show when={exportError()}>
            {(message) => <span class="inline-error">{message()}</span>}
          </Show>
        </div>
      </section>

      <section class="panel table-card">
        <Show when={auth.ready()}>
          <Show when={swaps.status() !== 'loading' || swaps.data()} fallback={<div class="empty-state">Loading swaps…</div>}>
            <Show when={swaps.data()?.swaps?.length} fallback={<div class="empty-state">No swaps found for the current filters.</div>}>
              <div class="table-scroll">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Status</th>
                      <th>Pair</th>
                      <th>Amount</th>
                      <th>Est. receive</th>
                      <th>Provider</th>
                      <th>Rate type</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={swaps.data()?.swaps || []}>
                      {(swap) => (
                        <tr>
                          <td>
                            <A class="table-link mono" href={`/swaps/${swap.id}`}>
                              {truncateMiddle(swap.id, 6)}
                            </A>
                          </td>
                          <td><span class="status-chip">{swap.status}</span></td>
                          <td>{swap.from_currency}/{swap.to_currency}</td>
                          <td>{formatAmount(swap.amount)}</td>
                          <td>{formatAmount(swap.estimated_receive)}</td>
                          <td>{swap.provider}</td>
                          <td>{swap.rate_type}</td>
                          <td>{formatDateTime(swap.created_at)}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
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
    </AdminShell>
  );
}
