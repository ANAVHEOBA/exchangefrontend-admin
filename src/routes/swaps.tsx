import { Title } from '@solidjs/meta';
import { A, useSearchParams } from '@solidjs/router';
import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
import AdminShell from '~/components/admin/AdminShell';
import { adminApi } from '~/api/endpoints/admin';
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
  }));

  const [swaps, { refetch }] = createResource(
    () => (auth.ready() ? JSON.stringify(query()) : null),
    () => adminApi.listSwaps(query()),
  );

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
    <AdminShell title="Swaps">
      <Title>Swaps</Title>

      <section class="panel stack-gap">
        <div class="split-header">
          <div>
            <p class="eyebrow">Swap queue</p>
            <h2>Review recent swap traffic</h2>
          </div>
          <div class="actions-row">
            <button class="button button-secondary" type="button" onClick={() => refetch()}>
              Refresh
            </button>
            <button class="button button-primary" type="button" disabled={exporting()} onClick={downloadExport}>
              {exporting() ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        </div>

        <div class="filter-grid">
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
          <Show when={!swaps.loading} fallback={<div class="empty-state">Loading swaps…</div>}>
            <Show when={swaps()?.swaps?.length} fallback={<div class="empty-state">No swaps found for the current filters.</div>}>
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
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={swaps()?.swaps || []}>
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

        <Show when={swaps()?.pagination}>
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
