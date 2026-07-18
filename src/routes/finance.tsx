import { Title } from '@solidjs/meta';
import { useSearchParams } from '@solidjs/router';
import { createMemo, For, Show } from 'solid-js';
import AdminShell from '~/components/admin/AdminShell';
import { adminApi } from '~/api/endpoints/admin';
import { adminDataKeys, createAdminCachedQuery } from '~/lib/admin-data';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { formatAmount, formatDateTime } from '~/utils/format';

export default function FinancePage() {
  const auth = useAdminAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = createMemo(() =>
    auth.ready()
      ? {
          date_from: searchParams.date_from || undefined,
          date_to: searchParams.date_to || undefined,
        }
      : null,
  );

  const finance = createAdminCachedQuery({
    source: query,
    getKey: (currentQuery) => adminDataKeys.finance(currentQuery),
    fetcher: (currentQuery) => adminApi.getFinance(currentQuery),
  });

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    setSearchParams({
      date_from: String(formData.get('date_from') || '') || undefined,
      date_to: String(formData.get('date_to') || '') || undefined,
    });
  };

  return (
    <AdminShell
      title="Finance and reporting"
      subtitle="Track completed volume, failures, platform fees, and provider distribution."
      actions={
        <button class="button button-secondary" type="button" onClick={() => void finance.refetch()}>
          {finance.refreshing() ? 'Refreshing…' : 'Refresh'}
        </button>
      }
    >
      <Title>Finance</Title>

      <section class="panel stack-gap">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Reporting window</p>
            <h3>Choose a date range</h3>
          </div>
        </div>

        <form class="actions-row" onSubmit={handleSubmit}>
          <label class="field field-inline">
            <span>Date from</span>
            <input class="text-input" type="date" name="date_from" value={searchParams.date_from || ''} />
          </label>
          <label class="field field-inline">
            <span>Date to</span>
            <input class="text-input" type="date" name="date_to" value={searchParams.date_to || ''} />
          </label>
          <button class="button button-primary" type="submit">
            Apply
          </button>
        </form>
      </section>

      <Show when={finance.status() !== 'loading' || finance.data()} fallback={<section class="panel">Loading finance summary…</section>}>
        <Show when={finance.data()} fallback={<section class="panel">No finance data available yet.</section>}>
          {(data) => (
            <div class="page-stack">
              <section class="panel">
                <div class="section-heading">
                  <div>
                    <p class="eyebrow">Totals</p>
                    <h3>Top-line summary</h3>
                  </div>
                  <span class="muted">Generated {formatDateTime(data().generated_at)}</span>
                </div>

                <div class="metric-grid">
                  <div class="metric-card">
                    <span>Completed swaps</span>
                    <strong>{data().totals.completed_swaps}</strong>
                  </div>
                  <div class="metric-card">
                    <span>Failed swaps</span>
                    <strong>{data().totals.failed_swaps}</strong>
                  </div>
                  <div class="metric-card">
                    <span>Expired swaps</span>
                    <strong>{data().totals.expired_swaps}</strong>
                  </div>
                  <div class="metric-card">
                    <span>Swap volume input</span>
                    <strong>{formatAmount(data().totals.swap_volume_input, 2)}</strong>
                  </div>
                  <div class="metric-card">
                    <span>Platform fees</span>
                    <strong>{formatAmount(data().totals.swap_platform_fees, 2)}</strong>
                  </div>
                  <div class="metric-card">
                    <span>Provider fees</span>
                    <strong>{formatAmount(data().totals.swap_provider_fees, 2)}</strong>
                  </div>
                  <div class="metric-card">
                    <span>Completed gift cards</span>
                    <strong>{data().totals.giftcard_completed}</strong>
                  </div>
                  <div class="metric-card">
                    <span>Failed gift cards</span>
                    <strong>{data().totals.giftcard_failed}</strong>
                  </div>
                  <div class="metric-card">
                    <span>Gift card volume</span>
                    <strong>{formatAmount(data().totals.giftcard_volume, 2)}</strong>
                  </div>
                </div>
              </section>

              <section class="panel">
                <div class="section-heading">
                  <div>
                    <p class="eyebrow">Daily</p>
                    <h3>Volume by day</h3>
                  </div>
                </div>

                <Show when={data().daily.length} fallback={<div class="empty-state">No daily rows for this date range.</div>}>
                  <div class="table-scroll">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Completed swaps</th>
                          <th>Failed swaps</th>
                          <th>Swap volume</th>
                          <th>Swap fees</th>
                          <th>Gift cards completed</th>
                          <th>Gift card volume</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={data().daily}>
                          {(row) => (
                            <tr>
                              <td>{row.date}</td>
                              <td>{row.completed_swaps}</td>
                              <td>{row.failed_swaps}</td>
                              <td>{formatAmount(row.swap_volume_input, 2)}</td>
                              <td>{formatAmount(row.swap_platform_fees, 2)}</td>
                              <td>{row.giftcard_completed}</td>
                              <td>{formatAmount(row.giftcard_volume, 2)}</td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </Show>
              </section>

              <section class="panel">
                <div class="section-heading">
                  <div>
                    <p class="eyebrow">Providers</p>
                    <h3>Provider contribution</h3>
                  </div>
                </div>

                <Show when={data().providers.length} fallback={<div class="empty-state">No provider rows for this date range.</div>}>
                  <div class="table-scroll">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Provider</th>
                          <th>Swaps</th>
                          <th>Completed</th>
                          <th>Failed</th>
                          <th>Volume input</th>
                          <th>Platform fees</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={data().providers}>
                          {(provider) => (
                            <tr>
                              <td>{provider.provider}</td>
                              <td>{provider.swaps}</td>
                              <td>{provider.completed_swaps}</td>
                              <td>{provider.failed_swaps}</td>
                              <td>{formatAmount(provider.volume_input, 2)}</td>
                              <td>{formatAmount(provider.platform_fees, 2)}</td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </Show>
              </section>
            </div>
          )}
        </Show>
      </Show>
    </AdminShell>
  );
}
