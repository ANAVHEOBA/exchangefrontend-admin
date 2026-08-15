import { Title } from '@solidjs/meta';
import { createMemo, createResource, For, Show } from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { adminApi } from '~/api/endpoints/admin';
import AdminShell from '~/components/admin/AdminShell';
import { CopyButton, Drawer, LoadingSkeleton, StatusChip } from '~/components/admin/AdminUI';
import { adminDataKeys, adminDefaultQueries, createAdminCachedQuery } from '~/lib/admin-data';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { formatDateTime, truncateMiddle } from '~/utils/format';

function removeSelected(params: Record<string, string>): Record<string, string | undefined> {
  return { ...params, selected: undefined };
}

export default function WebhooksPage() {
  const auth = useAdminAccess();
  const [searchParams, setSearchParams] = useSearchParams();

  const query = createMemo(() => ({
    include_delivered:
      searchParams.include_delivered === 'true'
        ? true
        : searchParams.include_delivered === 'false'
          ? false
          : undefined,
    swap_id: searchParams.swap_id || undefined,
    event_type: searchParams.event_type || undefined,
    limit: Number(searchParams.limit || adminDefaultQueries.webhooks.limit || 25),
  }));

  const webhooks = createAdminCachedQuery({
    source: () => (auth.ready() ? query() : null),
    getKey: (currentQuery) => adminDataKeys.webhooks(currentQuery),
    fetcher: (currentQuery) => adminApi.getWebhookMonitor(currentQuery),
  });

  const selectedId = createMemo(() => searchParams.selected || null);
  const [deliveryDetail] = createResource(
    () => (auth.ready() ? selectedId() : null),
    (deliveryId) => adminApi.getWebhookDelivery(deliveryId),
  );

  const updateFilter = (name: string, value: string) => {
    setSearchParams({ ...searchParams, [name]: value || undefined });
  };

  return (
    <AdminShell
      title="Webhook monitor"
      subtitle="Inspect delivery attempts, retry backlog, signatures, and raw payloads without leaving the queue."
      actions={
        <button class="button button-secondary" type="button" onClick={() => void webhooks.refetch()}>
          {webhooks.refreshing() ? 'Refreshing…' : 'Refresh'}
        </button>
      }
    >
      <Title>Webhook Monitor</Title>

      <section class="panel stack-gap">
        <div class="filter-grid filter-grid--wide">
          <label class="field">
            <span>Event type</span>
            <input class="text-input" value={searchParams.event_type || ''} onInput={(event) => updateFilter('event_type', event.currentTarget.value)} placeholder="trade_update" />
          </label>
          <label class="field">
            <span>Swap ID</span>
            <input class="text-input" value={searchParams.swap_id || ''} onInput={(event) => updateFilter('swap_id', event.currentTarget.value)} placeholder="swap UUID" />
          </label>
          <label class="field">
            <span>Include delivered</span>
            <select class="text-input" value={searchParams.include_delivered || ''} onInput={(event) => updateFilter('include_delivered', event.currentTarget.value)}>
              <option value="">Auto</option>
              <option value="false">Pending and retries only</option>
              <option value="true">Include delivered rows</option>
            </select>
          </label>
        </div>
      </section>

      <section class="panel table-card">
        <Show when={webhooks.status() !== 'loading' || webhooks.data()} fallback={<div class="empty-state">Loading webhook monitor…</div>}>
          <Show when={webhooks.data()?.deliveries.length} fallback={<div class="empty-state">No webhook deliveries recorded.</div>}>
            <div class="table-scroll">
              <table class="data-table data-table--interactive">
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
                      <tr class="clickable-row" onClick={() => setSearchParams({ ...searchParams, selected: delivery.id })}>
                        <td class="mono">{truncateMiddle(delivery.id, 6)}</td>
                        <td class="mono">{truncateMiddle(delivery.swap_id, 6)}</td>
                        <td>{delivery.event_type}</td>
                        <td>{delivery.attempt_number}/{delivery.max_attempts}</td>
                        <td>{delivery.response_status || '—'}{delivery.response_time_ms ? ` · ${delivery.response_time_ms}ms` : ''}</td>
                        <td>{formatDateTime(delivery.next_retry_at)}</td>
                        <td>{formatDateTime(delivery.delivered_at)}</td>
                        <td><StatusChip label={delivery.is_dlq ? 'DLQ' : 'Live'} status={delivery.is_dlq ? 'failed' : 'active'} /></td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </Show>
      </section>

      <Drawer
        open={Boolean(selectedId())}
        title={selectedId() ? `Delivery ${truncateMiddle(selectedId(), 6)}` : 'Webhook detail'}
        subtitle="Headers, signature, raw payload, and stored provider response body."
        onClose={() => setSearchParams(removeSelected(searchParams))}
        actions={<Show when={deliveryDetail()}>{(detail) => <CopyButton value={JSON.stringify(detail().payload, null, 2)} label="Copy JSON" />}</Show>}
      >
        <Show when={!deliveryDetail.loading} fallback={<LoadingSkeleton rows={6} />}>
          <Show when={deliveryDetail()} fallback={<div class="empty-state">Webhook detail is unavailable.</div>}>
            {(detail) => (
              <div class="page-stack">
                <section class="detail-card stack-gap">
                  <div class="section-heading"><div><p class="eyebrow">Delivery metadata</p><h3>{detail().delivery.event_type}</h3></div><StatusChip label={detail().delivery.is_dlq ? 'Dead letter' : 'Tracked'} status={detail().delivery.is_dlq ? 'failed' : 'active'} /></div>
                  <dl class="key-value-grid">
                    <dt>Delivery ID</dt>
                    <dd class="mono">{detail().delivery.id}</dd>
                    <dt>Swap ID</dt>
                    <dd class="mono">{detail().delivery.swap_id}</dd>
                    <dt>Webhook ID</dt>
                    <dd class="mono">{detail().webhook_id}</dd>
                    <dt>Signature</dt>
                    <dd class="mono">{truncateMiddle(detail().signature, 14)}</dd>
                    <dt>Attempt</dt>
                    <dd>{detail().delivery.attempt_number}/{detail().delivery.max_attempts}</dd>
                    <dt>Response</dt>
                    <dd>{detail().delivery.response_status || '—'}{detail().delivery.response_time_ms ? ` · ${detail().delivery.response_time_ms}ms` : ''}</dd>
                    <dt>Created</dt>
                    <dd>{formatDateTime(detail().delivery.created_at)}</dd>
                    <dt>Updated</dt>
                    <dd>{formatDateTime(detail().delivery.updated_at)}</dd>
                  </dl>
                </section>

                <section class="detail-card stack-gap">
                  <div class="section-heading"><div><p class="eyebrow">Payload</p><h3>Raw JSON body</h3></div></div>
                  <pre class="code-block">{JSON.stringify(detail().payload, null, 2)}</pre>
                </section>

                <section class="detail-card stack-gap">
                  <div class="section-heading"><div><p class="eyebrow">Response body</p><h3>Last stored processing output</h3></div></div>
                  <pre class="code-block">{detail().response_body || '—'}</pre>
                </section>
              </div>
            )}
          </Show>
        </Show>
      </Drawer>
    </AdminShell>
  );
}
