import { Title } from '@solidjs/meta';
import { A, useParams } from '@solidjs/router';
import { createResource, createSignal, For, Show } from 'solid-js';
import AdminShell from '~/components/admin/AdminShell';
import { adminApi } from '~/api/endpoints/admin';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { formatAmount, formatDateTime, truncateMiddle } from '~/utils/format';
import type { AdminGiftCardRevealResponse } from '~/types/admin';
import type { ApiError } from '~/types/api';

export default function GiftCardDetailPage() {
  const params = useParams();
  const auth = useAdminAccess();
  const [pendingAction, setPendingAction] = createSignal<'retry' | 'reconcile' | 'reveal' | null>(null);
  const [actionError, setActionError] = createSignal<string | null>(null);
  const [actionMessage, setActionMessage] = createSignal<string | null>(null);
  const [revealReason, setRevealReason] = createSignal('');
  const [revealed, setRevealed] = createSignal<AdminGiftCardRevealResponse | null>(null);
  const [order, { refetch }] = createResource(
    () => (auth.ready() ? params.orderRef : null),
    (orderRef) => adminApi.getGiftcardOrder(orderRef),
  );

  const runAction = async (action: 'retry' | 'reconcile') => {
    setPendingAction(action);
    setActionError(null);
    setActionMessage(null);

    try {
      const response =
        action === 'retry'
          ? await adminApi.retryGiftcardOrder(params.orderRef)
          : await adminApi.reconcileGiftcardOrder(params.orderRef);
      setActionMessage(response.message);
      await refetch();
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setActionError(apiError.message || 'Action failed.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleReveal = async (event: SubmitEvent) => {
    event.preventDefault();
    setPendingAction('reveal');
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await adminApi.revealGiftcardOrder(params.orderRef, {
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
      title="Gift card detail"
      subtitle="Inspect provider state, queue health, masked sensitive fields, and retry or reconcile when needed."
      actions={
        <div class="actions-row">
          <A class="button button-secondary" href="/giftcards">
            Back to gift cards
          </A>
          <button class="button button-secondary" type="button" disabled={pendingAction() !== null} onClick={() => runAction('retry')}>
            {pendingAction() === 'retry' ? 'Retrying…' : 'Retry order'}
          </button>
          <button class="button button-primary" type="button" disabled={pendingAction() !== null} onClick={() => runAction('reconcile')}>
            {pendingAction() === 'reconcile' ? 'Reconciling…' : 'Reconcile'}
          </button>
        </div>
      }
    >
      <Title>Gift Card Detail</Title>

      <section class="panel stack-gap">
        <Show when={actionMessage()}>
          {(message) => <div class="inline-success">{message()}</div>}
        </Show>
        <Show when={actionError()}>
          {(message) => <div class="inline-error">{message()}</div>}
        </Show>

        <Show when={!order.loading} fallback={<div class="empty-state">Loading order…</div>}>
          <Show when={order()} fallback={<div class="empty-state">Gift card order not found.</div>}>
            {(data) => (
              <div class="page-stack">
                <div class="detail-grid">
                  <div class="detail-card">
                    <p class="eyebrow">Identifiers</p>
                    <dl class="key-value-grid">
                      <dt>Order ID</dt>
                      <dd class="mono">{data().order.order_id}</dd>
                      <dt>Trade ID</dt>
                      <dd class="mono">{truncateMiddle(data().order.trade_id)}</dd>
                      <dt>Provider trade ID</dt>
                      <dd class="mono">{truncateMiddle(data().order.provider_trade_id)}</dd>
                      <dt>Status</dt>
                      <dd><span class="status-chip">{data().order.status}</span></dd>
                    </dl>
                  </div>

                  <div class="detail-card">
                    <p class="eyebrow">Order state</p>
                    <dl class="key-value-grid">
                      <dt>Provider</dt>
                      <dd>{data().order.provider || data().order.prepaid_provider || '—'}</dd>
                      <dt>Provider status</dt>
                      <dd>{data().order.provider_status || '—'}</dd>
                      <dt>Order kind</dt>
                      <dd>{data().order.order_kind}</dd>
                      <dt>Product ID</dt>
                      <dd>{data().order.product_id || '—'}</dd>
                    </dl>
                  </div>

                  <div class="detail-card">
                    <p class="eyebrow">Payment</p>
                    <dl class="key-value-grid">
                      <dt>Recipient email</dt>
                      <dd>{data().order.recipient_email_masked}</dd>
                      <dt>Currency</dt>
                      <dd>{data().order.currency_code || '—'}</dd>
                      <dt>Source asset</dt>
                      <dd>{data().order.ticker_from} · {data().order.network_from}</dd>
                      <dt>Amount</dt>
                      <dd>{formatAmount(data().order.amount_from)}</dd>
                    </dl>
                  </div>

                  <div class="detail-card">
                    <p class="eyebrow">Queue and retries</p>
                    <dl class="key-value-grid">
                      <dt>Queued</dt>
                      <dd>{data().order.queued ? 'Yes' : 'No'}</dd>
                      <dt>Retryable</dt>
                      <dd>{data().order.retryable ? 'Yes' : 'No'}</dd>
                      <dt>Attempt count</dt>
                      <dd>{data().order.attempt_count}</dd>
                      <dt>Next retry</dt>
                      <dd>{formatDateTime(data().order.next_retry_at)}</dd>
                      <dt>Last synced</dt>
                      <dd>{formatDateTime(data().order.last_synced_at)}</dd>
                      <dt>Last error</dt>
                      <dd>{data().order.last_error || '—'}</dd>
                    </dl>
                  </div>

                  <div class="detail-card detail-card-wide">
                    <p class="eyebrow">Addresses</p>
                    <dl class="key-value-grid">
                      <dt>Deposit address</dt>
                      <dd class="mono">{data().deposit_address || '—'}</dd>
                      <dt>Deposit extra ID</dt>
                      <dd class="mono">{data().deposit_extra_id || '—'}</dd>
                      <dt>Settlement address</dt>
                      <dd class="mono">{data().settlement_address || '—'}</dd>
                      <dt>Settlement extra ID</dt>
                      <dd class="mono">{data().settlement_extra_id || '—'}</dd>
                      <dt>Refund address</dt>
                      <dd class="mono">{data().refund_address || '—'}</dd>
                      <dt>Refund extra ID</dt>
                      <dd class="mono">{data().refund_extra_id || '—'}</dd>
                    </dl>
                  </div>
                </div>

                <div class="insight-grid">
                  <section class="panel">
                    <div class="section-heading">
                      <div>
                        <p class="eyebrow">Risk flags</p>
                        <h3>Sanity and delivery checks</h3>
                      </div>
                    </div>

                    <Show when={data().risk_flags.length} fallback={<div class="empty-state">No risk flags on this order.</div>}>
                      <div class="list-stack">
                        <For each={data().risk_flags}>
                          {(flag) => (
                            <div class="list-card">
                              <strong>{flag}</strong>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                  </section>

                  <section class="panel">
                    <div class="section-heading">
                      <div>
                        <p class="eyebrow">Sensitive fields</p>
                        <h3>Masked by default</h3>
                      </div>
                    </div>

                    <p class="muted">
                      {data().details_masked
                        ? 'Sensitive card data is masked. Provide a reason to reveal and audit access.'
                        : 'Sensitive card data is not masked on this record.'}
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
                        {pendingAction() === 'reveal' ? 'Revealing…' : 'Reveal sensitive fields'}
                      </button>
                    </form>

                    <Show when={revealed()}>
                      {(sensitive) => (
                        <div class="reveal-card">
                          <dl class="key-value-grid">
                            <dt>Recipient email</dt>
                            <dd>{sensitive().recipient_email}</dd>
                            <dt>Provider password</dt>
                            <dd class="mono">{sensitive().provider_password || '—'}</dd>
                            <dt>Activation link</dt>
                            <dd class="mono">{sensitive().activation_link || '—'}</dd>
                            <dt>Redeem code</dt>
                            <dd class="mono">{sensitive().redeem_code || '—'}</dd>
                          </dl>

                          <Show when={sensitive().details?.extra && Object.keys(sensitive().details?.extra || {}).length}>
                            <div class="extra-block">
                              <strong>Provider detail payload</strong>
                              <For each={Object.entries(sensitive().details?.extra || {})}>
                                {([key, value]) => (
                                  <div class="extra-row">
                                    <span>{key}</span>
                                    <code>{JSON.stringify(value)}</code>
                                  </div>
                                )}
                              </For>
                            </div>
                          </Show>
                        </div>
                      )}
                    </Show>
                  </section>
                </div>
              </div>
            )}
          </Show>
        </Show>
      </section>
    </AdminShell>
  );
}
