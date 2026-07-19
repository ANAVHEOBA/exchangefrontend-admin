import { Title } from '@solidjs/meta';
import { A, useSearchParams } from '@solidjs/router';
import { createMemo, For, Show } from 'solid-js';
import AdminShell from '~/components/admin/AdminShell';
import { adminApi } from '~/api/endpoints/admin';
import { adminDataKeys, createAdminCachedQuery } from '~/lib/admin-data';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { formatAmount, formatDateTime, truncateMiddle } from '~/utils/format';

export default function GiftCardsPage() {
  const auth = useAdminAccess();
  const [searchParams, setSearchParams] = useSearchParams();

  const query = createMemo(() => ({
    status: searchParams.status || undefined,
    email: searchParams.email || undefined,
    trade_id: searchParams.trade_id || undefined,
    client_id: searchParams.client_id || undefined,
    provider: searchParams.provider || undefined,
    product_id: searchParams.product_id || undefined,
    limit: Number(searchParams.limit || 50),
  }));

  const orders = createAdminCachedQuery({
    source: () => (auth.ready() ? query() : null),
    getKey: (currentQuery) => adminDataKeys.giftcards(currentQuery),
    fetcher: (currentQuery) => adminApi.listGiftcardOrders(currentQuery),
  });

  const updateFilter = (name: string, value: string) => {
    setSearchParams({ ...searchParams, [name]: value || undefined });
  };

  const clearFilters = () => {
    setSearchParams({ limit: String(query().limit || 50) });
  };

  return (
    <AdminShell
      title="Gift card operations"
      subtitle="Review async order state, provider status, lock failures, retries, and card delivery."
      actions={
        <button class="button button-secondary" type="button" onClick={() => void orders.refetch()}>
          {orders.refreshing() ? 'Refreshing…' : 'Refresh'}
        </button>
      }
    >
      <Title>Gift Card Operations</Title>

      <section class="panel stack-gap">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Gift card queue</p>
            <h3>Filter orders and delivery state</h3>
          </div>
        </div>

        <div class="filter-grid filter-grid--wide">
          <label class="field">
            <span>Status</span>
            <input class="text-input" value={searchParams.status || ''} onInput={(event) => updateFilter('status', event.currentTarget.value)} />
          </label>
          <label class="field">
            <span>Email</span>
            <input class="text-input" value={searchParams.email || ''} onInput={(event) => updateFilter('email', event.currentTarget.value)} />
          </label>
          <label class="field">
            <span>Trade ID</span>
            <input class="text-input" value={searchParams.trade_id || ''} onInput={(event) => updateFilter('trade_id', event.currentTarget.value)} />
          </label>
          <label class="field">
            <span>Client ID</span>
            <input class="text-input" value={searchParams.client_id || ''} onInput={(event) => updateFilter('client_id', event.currentTarget.value)} />
          </label>
          <label class="field">
            <span>Provider</span>
            <input class="text-input" value={searchParams.provider || ''} onInput={(event) => updateFilter('provider', event.currentTarget.value)} />
          </label>
          <label class="field">
            <span>Product ID</span>
            <input class="text-input" value={searchParams.product_id || ''} onInput={(event) => updateFilter('product_id', event.currentTarget.value)} />
          </label>
        </div>

        <div class="actions-row">
          <button class="button button-secondary" type="button" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      </section>

      <section class="panel table-card">
        <Show when={orders.error()}>
          {(message) => <div class="empty-state">{message()}</div>}
        </Show>

        <Show when={auth.ready()}>
          <Show when={orders.status() !== 'loading' || orders.data()} fallback={<div class="empty-state">Loading gift card orders…</div>}>
            <Show when={orders.data()?.orders.length} fallback={<div class="empty-state">No gift card orders matched the current filters.</div>}>
              <div class="table-scroll">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Status</th>
                      <th>Provider</th>
                      <th>Product</th>
                      <th>Email</th>
                      <th>Source</th>
                      <th>Amount</th>
                      <th>Queued</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={orders.data()?.orders || []}>
                      {(order) => (
                        <tr>
                          <td>
                            <A class="table-link mono" href={`/giftcards/${order.order_id}`}>
                              {truncateMiddle(order.order_id, 6)}
                            </A>
                          </td>
                          <td><span class="status-chip">{order.status}</span></td>
                          <td>{order.provider || order.prepaid_provider || '—'}</td>
                          <td>{order.product_id || order.order_kind}</td>
                          <td>{order.recipient_email_masked}</td>
                          <td>{order.ticker_from} · {order.network_from}</td>
                          <td>{formatAmount(order.amount_from)}</td>
                          <td>{order.queued ? 'Yes' : 'No'}</td>
                          <td>{formatDateTime(order.updated_at)}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </Show>
        </Show>
      </section>
    </AdminShell>
  );
}
