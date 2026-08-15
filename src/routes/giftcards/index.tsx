import { Title } from '@solidjs/meta';
import { createEffect, createMemo, createResource, createSignal, For, Show } from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { adminApi } from '~/api/endpoints/admin';
import AdminShell from '~/components/admin/AdminShell';
import { CopyButton, Drawer, LoadingSkeleton, StatusChip } from '~/components/admin/AdminUI';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { adminDataKeys, createAdminCachedQuery } from '~/lib/admin-data';
import { formatAmount, formatCurrencyAmount, formatDateTime, truncateMiddle } from '~/utils/format';
import type { AdminGiftCardRevealResponse } from '~/types/admin';
import type { ApiError } from '~/types/api';

function removeSelected(params: Record<string, string>): Record<string, string | undefined> {
  return { ...params, selected: undefined };
}

export default function GiftCardsPage() {
  const auth = useAdminAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingAction, setPendingAction] = createSignal<'retry' | 'reconcile' | 'reveal' | null>(null);
  const [actionError, setActionError] = createSignal<string | null>(null);
  const [actionMessage, setActionMessage] = createSignal<string | null>(null);
  const [revealReason, setRevealReason] = createSignal('');
  const [revealed, setRevealed] = createSignal<AdminGiftCardRevealResponse | null>(null);

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

  const selectedOrderId = createMemo(() => searchParams.selected || null);
  const [selectedOrder, { refetch: refetchOrder }] = createResource(
    () => (auth.ready() ? selectedOrderId() : null),
    (orderRef) => adminApi.getGiftcardOrder(orderRef),
  );
  const [selectedProduct] = createResource(
    () => {
      const detail = selectedOrder();
      if (!detail?.order.product_id) {
        return null;
      }
      return detail.order.product_id;
    },
    (productId) => adminApi.getGiftcardCatalogItem(productId),
  );


  const orderFilterOptions = createMemo(() => {
    const rows = orders.data()?.orders || [];
    const collect = (selector: (row: (typeof rows)[number]) => string) =>
      Array.from(new Set(rows.map(selector).map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right),
      );
    const ensureCurrent = (values: string[], current?: string) =>
      current && current.trim() && !values.includes(current) ? [current, ...values] : values;

    return {
      statuses: ensureCurrent(collect((row) => row.status), searchParams.status || undefined),
      providers: ensureCurrent(
        collect((row) => row.provider || row.prepaid_provider || ''),
        searchParams.provider || undefined,
      ),
      products: ensureCurrent(collect((row) => row.product_id || ''), searchParams.product_id || undefined),
    };
  });

  createEffect(() => {
    selectedOrderId();
    setActionError(null);
    setActionMessage(null);
    setRevealReason('');
    setRevealed(null);
  });

  const updateFilter = (name: string, value: string) => {
    setSearchParams({ ...searchParams, [name]: value || undefined });
  };

  const clearFilters = () => {
    setSearchParams({ limit: String(query().limit || 50) });
  };

  const closeDetail = () => {
    setSearchParams(removeSelected(searchParams));
  };

  const runAction = async (action: 'retry' | 'reconcile') => {
    if (!selectedOrderId()) {
      return;
    }

    setPendingAction(action);
    setActionError(null);
    setActionMessage(null);

    try {
      const response =
        action === 'retry'
          ? await adminApi.retryGiftcardOrder(selectedOrderId() as string)
          : await adminApi.reconcileGiftcardOrder(selectedOrderId() as string);
      setActionMessage(response.message);
      await Promise.all([orders.refetch(), refetchOrder()]);
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setActionError(apiError.message || 'Action failed.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleReveal = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!selectedOrderId()) {
      return;
    }

    setPendingAction('reveal');
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await adminApi.revealGiftcardOrder(selectedOrderId() as string, {
        reason: revealReason().trim(),
      });
      setRevealed(response);
      setActionMessage('Sensitive fields revealed and audit reason recorded.');
      setRevealReason('');
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setActionError(apiError.message || 'Reveal failed.');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <AdminShell
      title="Gift card operations"
      subtitle="Review order queues, provider status, retry state, and secure card delivery from one queue."
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
            <select class="text-input select-input" value={searchParams.status || ''} onChange={(event) => updateFilter('status', event.currentTarget.value)}>
              <option value="">All statuses</option>
              <For each={orderFilterOptions().statuses}>{(value) => <option value={value}>{value}</option>}</For>
            </select>
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
            <select class="text-input select-input" value={searchParams.provider || ''} onChange={(event) => updateFilter('provider', event.currentTarget.value)}>
              <option value="">All providers</option>
              <For each={orderFilterOptions().providers}>{(value) => <option value={value}>{value}</option>}</For>
            </select>
          </label>
          <label class="field">
            <span>Product ID</span>
            <select class="text-input select-input" value={searchParams.product_id || ''} onChange={(event) => updateFilter('product_id', event.currentTarget.value)}>
              <option value="">All products</option>
              <For each={orderFilterOptions().products}>{(value) => <option value={value}>{value}</option>}</For>
            </select>
          </label>
        </div>

        <div class="actions-row">
          <button class="button button-secondary" type="button" onClick={clearFilters}>Clear filters</button>
        </div>
      </section>

      <section class="panel table-card">
        <Show when={orders.error()}>{(message) => <div class="empty-state">{message()}</div>}</Show>
        <Show when={orders.status() !== 'loading' || orders.data()} fallback={<div class="empty-state">Loading gift card orders…</div>}>
          <Show when={orders.data()?.orders.length} fallback={<div class="empty-state">No gift card orders matched the current filters.</div>}>
            <div class="table-scroll">
              <table class="data-table data-table--interactive">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Fiat value</th>
                    <th>Crypto paid</th>
                    <th>Email</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={orders.data()?.orders || []}>
                    {(order) => (
                      <tr class="clickable-row" onClick={() => setSearchParams({ ...searchParams, selected: order.order_id })}>
                        <td class="mono">{truncateMiddle(order.order_id, 7)}</td>
                        <td>{formatDateTime(order.created_at)}</td>
                        <td>{order.product_id || order.prepaid_provider || order.order_kind}</td>
                        <td>{formatCurrencyAmount(order.amount_to, order.currency_code)}</td>
                        <td>{formatAmount(order.amount_from, 6)} {order.ticker_from}</td>
                        <td>{order.recipient_email_masked}</td>
                        <td><StatusChip status={order.status} /></td>
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
        open={Boolean(selectedOrderId())}
        title={selectedOrderId() ? `Order ${truncateMiddle(selectedOrderId(), 7)}` : 'Gift card detail'}
        subtitle="Secure redemption, queue state, provider reconciliation, and settlement tracing."
        onClose={closeDetail}
        actions={
          <div class="actions-row">
            <button class="button button-secondary button-compact" type="button" disabled={pendingAction() !== null} onClick={() => void runAction('retry')}>
              {pendingAction() === 'retry' ? 'Retrying…' : 'Retry order'}
            </button>
            <button class="button button-primary button-compact" type="button" disabled={pendingAction() !== null} onClick={() => void runAction('reconcile')}>
              {pendingAction() === 'reconcile' ? 'Reconciling…' : 'Reconcile'}
            </button>
          </div>
        }
      >
        <Show when={actionMessage()}>{(message) => <div class="inline-success">{message()}</div>}</Show>
        <Show when={actionError()}>{(message) => <div class="inline-error">{message()}</div>}</Show>

        <Show when={!selectedOrder.loading} fallback={<LoadingSkeleton rows={7} />}>
          <Show when={selectedOrder()} fallback={<div class="empty-state">Gift card order not found.</div>}>
            {(detail) => (
              <div class="page-stack">
                <section class="detail-card stack-gap">
                  <div class="section-heading">
                    <div>
                      <p class="eyebrow">Header</p>
                      <h3>{detail().order.provider || detail().order.prepaid_provider || 'Gift card order'}</h3>
                    </div>
                    <StatusChip status={detail().order.status} />
                  </div>
                  <dl class="key-value-grid">
                    <dt>Order ID</dt>
                    <dd class="mono">{detail().order.order_id}</dd>
                    <dt>Trade ID</dt>
                    <dd class="mono">{truncateMiddle(detail().order.trade_id, 10)}</dd>
                    <dt>Provider trade ID</dt>
                    <dd class="mono">{truncateMiddle(detail().order.provider_trade_id, 10)}</dd>
                    <dt>Provider status</dt>
                    <dd>{detail().order.provider_status || '—'}</dd>
                  </dl>
                </section>

                <section class="detail-card stack-gap">
                  <div class="section-heading">
                    <div>
                      <p class="eyebrow">Product details</p>
                      <h3>{selectedProduct()?.card.name || detail().order.product_id || detail().order.order_kind}</h3>
                    </div>
                  </div>
                  <div class="catalog-drawer-head">
                    <Show when={selectedProduct()?.card.card_image_url}>
                      <img class="catalog-card-image" src={selectedProduct()?.card.card_image_url || ''} alt={selectedProduct()?.card.name || 'Gift card'} />
                    </Show>
                    <div class="stack-gap catalog-drawer-copy">
                      <p class="muted">{selectedProduct()?.card.description || 'Product metadata is sourced from the catalog when available.'}</p>
                      <dl class="key-value-grid">
                        <dt>Brand</dt>
                        <dd>{selectedProduct()?.card.name || detail().order.product_id || '—'}</dd>
                        <dt>Country</dt>
                        <dd>{selectedProduct()?.card.country || '—'}</dd>
                        <dt>Category</dt>
                        <dd>{selectedProduct()?.card.category || '—'}</dd>
                        <dt>Currency</dt>
                        <dd>{selectedProduct()?.card.currency_code || detail().order.currency_code || '—'}</dd>
                        <dt>Allowed values</dt>
                        <dd>{selectedProduct()?.card.denominations?.length ? selectedProduct()?.card.denominations?.join(', ') : '—'}</dd>
                      </dl>
                    </div>
                  </div>
                </section>

                <section class="detail-card stack-gap">
                  <div class="section-heading">
                    <div>
                      <p class="eyebrow">Crypto settlement</p>
                      <h3>Funding and address trail</h3>
                    </div>
                  </div>
                  <dl class="key-value-grid">
                    <dt>Fiat value</dt>
                    <dd>{formatCurrencyAmount(detail().order.amount_to, detail().order.currency_code)}</dd>
                    <dt>Crypto paid</dt>
                    <dd>{formatAmount(detail().order.amount_from, 6)} {detail().order.ticker_from} · {detail().order.network_from}</dd>
                    <dt>Deposit address</dt>
                    <dd class="address-row"><code>{detail().deposit_address || '—'}</code><Show when={detail().deposit_address}><CopyButton value={detail().deposit_address} /></Show></dd>
                    <dt>Deposit memo</dt>
                    <dd>{detail().deposit_extra_id || '—'}</dd>
                    <dt>Settlement address</dt>
                    <dd class="address-row"><code>{detail().settlement_address || '—'}</code><Show when={detail().settlement_address}><CopyButton value={detail().settlement_address} /></Show></dd>
                    <dt>Refund address</dt>
                    <dd class="address-row"><code>{detail().refund_address || '—'}</code><Show when={detail().refund_address}><CopyButton value={detail().refund_address} /></Show></dd>
                  </dl>
                </section>

                <section class="detail-card stack-gap">
                  <div class="section-heading">
                    <div>
                      <p class="eyebrow">Redemption</p>
                      <h3>Masked by default with reveal audit</h3>
                    </div>
                  </div>
                  <p class="muted">
                    {detail().details_masked
                      ? 'Sensitive card data is masked. Provide a reason to reveal and audit access.'
                      : 'Sensitive card data is already unmasked on this record.'}
                  </p>

                  <form class="stack-gap" onSubmit={handleReveal}>
                    <label class="field">
                      <span>Reveal reason</span>
                      <textarea
                        class="textarea-input"
                        rows="4"
                        value={revealReason()}
                        onInput={(event) => setRevealReason(event.currentTarget.value)}
                        placeholder="Explain why you need to reveal card details for support or reconciliation."
                        required
                      />
                    </label>

                    <button class="button button-primary" type="submit" disabled={pendingAction() !== null}>
                      {pendingAction() === 'reveal' ? 'Revealing…' : 'Reveal code and activation link'}
                    </button>
                  </form>

                  <Show when={revealed()}>
                    {(sensitive) => (
                      <div class="reveal-card">
                        <dl class="key-value-grid">
                          <dt>Recipient email</dt>
                          <dd>{sensitive().recipient_email}</dd>
                          <dt>Activation link</dt>
                          <dd>
                            <Show when={sensitive().activation_link} fallback={<span>—</span>}>
                              <a class="table-link mono" href={sensitive().activation_link || '#'} target="_blank" rel="noreferrer">
                                Open activation link
                              </a>
                            </Show>
                          </dd>
                          <dt>Redeem code</dt>
                          <dd class="address-row"><code>{sensitive().redeem_code || '—'}</code><Show when={sensitive().redeem_code}><CopyButton value={sensitive().redeem_code} /></Show></dd>
                          <dt>Provider password</dt>
                          <dd class="address-row"><code>{sensitive().provider_password || '—'}</code><Show when={sensitive().provider_password}><CopyButton value={sensitive().provider_password} /></Show></dd>
                          <dt>Provider status</dt>
                          <dd>{sensitive().details?.status || '—'}</dd>
                          <dt>Provider hash</dt>
                          <dd class="mono">{truncateMiddle(sensitive().details?.hashout, 14)}</dd>
                        </dl>
                      </div>
                    )}
                  </Show>
                </section>

                <section class="detail-card stack-gap">
                  <div class="section-heading">
                    <div>
                      <p class="eyebrow">Risk flags</p>
                      <h3>Sanity and delivery checks</h3>
                    </div>
                  </div>
                  <Show when={detail().risk_flags.length} fallback={<div class="empty-state">No risk flags on this order.</div>}>
                    <div class="list-stack">
                      <For each={detail().risk_flags}>{(flag) => <div class="list-card"><strong>{flag}</strong></div>}</For>
                    </div>
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
