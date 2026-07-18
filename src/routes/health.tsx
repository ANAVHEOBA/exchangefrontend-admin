import { Title } from '@solidjs/meta';
import { createMemo, For, Show } from 'solid-js';
import AdminShell from '~/components/admin/AdminShell';
import { adminApi } from '~/api/endpoints/admin';
import { adminDataKeys, createAdminCachedQuery } from '~/lib/admin-data';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { formatDateTime } from '~/utils/format';

export default function HealthPage() {
  const auth = useAdminAccess();
  const health = createAdminCachedQuery({
    source: () => (auth.ready() ? 'health' : null),
    getKey: () => adminDataKeys.health(),
    fetcher: () => adminApi.getHealth(),
  });

  const workerCards = createMemo(() => {
    const worker = health.data()?.worker;
    if (!worker) {
      return [];
    }

    return [
      { label: 'Gift card queued', value: worker.giftcard_queued },
      { label: 'Gift card retry pending', value: worker.giftcard_retry_pending },
      { label: 'Gift card creating', value: worker.giftcard_creating },
      { label: 'Gift card stale active', value: worker.giftcard_stale_active },
      { label: 'Swap polling due', value: worker.swap_polling_due },
      { label: 'Swap polling stale', value: worker.swap_polling_stale },
      { label: 'Webhook retry due', value: worker.webhook_retry_due },
      { label: 'Webhook dead letters', value: worker.webhook_dead_letters },
    ];
  });

  return (
    <AdminShell
      title="Provider health"
      subtitle="See whether failures are coming from providers, workers, webhooks, or our own risk checks."
      actions={
        <button class="button button-secondary" type="button" onClick={() => void health.refetch()}>
          {health.refreshing() ? 'Refreshing…' : 'Refresh'}
        </button>
      }
    >
      <Title>Provider Health</Title>

      <Show when={health.status() !== 'loading' || health.data()} fallback={<section class="panel">Loading health metrics…</section>}>
        <Show when={health.data()} fallback={<section class="panel">No health metrics available yet.</section>}>
          {(data) => (
            <div class="page-stack">
              <section class="panel">
                <div class="section-heading">
                  <div>
                    <p class="eyebrow">Worker monitor</p>
                    <h3>Queue and polling pressure</h3>
                  </div>
                </div>

                <div class="metric-grid">
                  <For each={workerCards()}>
                    {(card) => (
                      <div class="metric-card">
                        <span>{card.label}</span>
                        <strong>{card.value}</strong>
                      </div>
                    )}
                  </For>
                </div>
              </section>

              <section class="panel">
                <div class="section-heading">
                  <div>
                    <p class="eyebrow">Providers</p>
                    <h3>Provider performance snapshot</h3>
                  </div>
                </div>

                <Show when={data().providers.length} fallback={<div class="empty-state">No provider health data yet.</div>}>
                  <div class="table-scroll">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Provider</th>
                          <th>Open swaps</th>
                          <th>Swap failures, 24h</th>
                          <th>Gift cards active</th>
                          <th>Gift card failures, 24h</th>
                          <th>Last activity</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={data().providers}>
                          {(provider) => (
                            <tr>
                              <td>{provider.provider}</td>
                              <td>{provider.open_swaps}</td>
                              <td>{provider.failed_swaps_24h}</td>
                              <td>{provider.giftcard_active}</td>
                              <td>{provider.giftcard_failed_24h}</td>
                              <td>{formatDateTime(provider.last_activity_at)}</td>
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
                    <p class="eyebrow">Risk flags</p>
                    <h3>Sanity checks that need attention</h3>
                  </div>
                </div>

                <Show when={data().risk_flags.length} fallback={<div class="empty-state">No active risk flags.</div>}>
                  <div class="list-stack">
                    <For each={data().risk_flags}>
                      {(flag) => (
                        <div class="list-card">
                          <div class="list-card__head">
                            <strong>{flag.code}</strong>
                            <span class={`severity-pill severity-${flag.severity.toLowerCase()}`}>{flag.severity}</span>
                          </div>
                          <p>{flag.message}</p>
                          <small>
                            {flag.entity_type} · {flag.entity_id}
                          </small>
                        </div>
                      )}
                    </For>
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
