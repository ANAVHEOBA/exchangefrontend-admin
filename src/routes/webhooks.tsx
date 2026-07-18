import { Title } from '@solidjs/meta';
import { For, Show } from 'solid-js';
import AdminShell from '~/components/admin/AdminShell';
import { adminApi } from '~/api/endpoints/admin';
import { adminDataKeys, createAdminCachedQuery } from '~/lib/admin-data';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { formatDateTime, truncateMiddle } from '~/utils/format';

export default function WebhooksPage() {
  const auth = useAdminAccess();
  const webhooks = createAdminCachedQuery({
    source: () => (auth.ready() ? 'webhooks' : null),
    getKey: () => adminDataKeys.webhooks(),
    fetcher: () => adminApi.getWebhookMonitor(),
  });

  return (
    <AdminShell
      title="Webhook monitor"
      subtitle="Inspect delivery attempts, retry backlog, and dead-letter webhook payloads."
      actions={
        <button class="button button-secondary" type="button" onClick={() => void webhooks.refetch()}>
          {webhooks.refreshing() ? 'Refreshing…' : 'Refresh'}
        </button>
      }
    >
      <Title>Webhook Monitor</Title>

      <section class="panel table-card">
        <Show when={webhooks.status() !== 'loading' || webhooks.data()} fallback={<div class="empty-state">Loading webhook monitor…</div>}>
          <Show when={webhooks.data()?.deliveries.length} fallback={<div class="empty-state">No webhook deliveries recorded.</div>}>
            <div class="table-scroll">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Delivery</th>
                    <th>Swap</th>
                    <th>Event</th>
                    <th>Attempt</th>
                    <th>Response</th>
                    <th>Next retry</th>
                    <th>Delivered</th>
                    <th>DLQ</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={webhooks.data()?.deliveries || []}>
                    {(delivery) => (
                      <tr>
                        <td class="mono">{truncateMiddle(delivery.id, 6)}</td>
                        <td class="mono">{truncateMiddle(delivery.swap_id, 6)}</td>
                        <td>{delivery.event_type}</td>
                        <td>{delivery.attempt_number}/{delivery.max_attempts}</td>
                        <td>{delivery.response_status || '—'}{delivery.response_time_ms ? ` · ${delivery.response_time_ms}ms` : ''}</td>
                        <td>{formatDateTime(delivery.next_retry_at)}</td>
                        <td>{formatDateTime(delivery.delivered_at)}</td>
                        <td>{delivery.is_dlq ? 'Yes' : 'No'}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </Show>
      </section>
    </AdminShell>
  );
}
