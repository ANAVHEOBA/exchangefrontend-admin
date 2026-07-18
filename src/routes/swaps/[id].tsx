import { Title } from '@solidjs/meta';
import { A, useParams } from '@solidjs/router';
import { createResource, createSignal, For, Show } from 'solid-js';
import AdminShell from '~/components/admin/AdminShell';
import { adminApi } from '~/api/endpoints/admin';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { formatAmount, formatDateTime, truncateMiddle } from '~/utils/format';
import type { ApiError } from '~/types/api';

export default function SwapDetailPage() {
  const params = useParams();
  const auth = useAdminAccess();
  const [actionState, setActionState] = createSignal<'refresh' | 'reconcile' | null>(null);
  const [actionError, setActionError] = createSignal<string | null>(null);
  const [actionMessage, setActionMessage] = createSignal<string | null>(null);
  const [swap, { refetch }] = createResource(
    () => (auth.ready() ? params.id : null),
    (id) => adminApi.getSwap(id),
  );
  const [timeline, { refetch: refetchTimeline }] = createResource(
    () => (auth.ready() ? params.id : null),
    (id) => adminApi.getSwapTimeline(id),
  );

  const runAction = async (action: 'refresh' | 'reconcile') => {
    setActionState(action);
    setActionError(null);
    setActionMessage(null);

    try {
      const response =
        action === 'refresh' ? await adminApi.refreshSwap(params.id) : await adminApi.reconcileSwap(params.id);
      setActionMessage(response.message);
      await Promise.all([refetch(), refetchTimeline()]);
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setActionError(apiError.message || 'Action failed.');
    } finally {
      setActionState(null);
    }
  };

  return (
    <AdminShell
      title="Swap detail"
      subtitle="Inspect provider status, deposit state, payout state, and the recorded timeline."
      actions={
        <div class="actions-row">
          <A class="button button-secondary" href="/swaps">
            Back to swaps
          </A>
          <button
            class="button button-secondary"
            type="button"
            disabled={actionState() !== null}
            onClick={() => runAction('refresh')}
          >
            {actionState() === 'refresh' ? 'Refreshing…' : 'Refresh provider'}
          </button>
          <button
            class="button button-primary"
            type="button"
            disabled={actionState() !== null}
            onClick={() => runAction('reconcile')}
          >
            {actionState() === 'reconcile' ? 'Reconciling…' : 'Reconcile'}
          </button>
        </div>
      }
    >
      <Title>Swap Detail</Title>

      <section class="panel stack-gap">
        <Show when={actionMessage()}>
          {(message) => <div class="inline-success">{message()}</div>}
        </Show>
        <Show when={actionError()}>
          {(message) => <div class="inline-error">{message()}</div>}
        </Show>

        <Show when={!swap.loading} fallback={<div class="empty-state">Loading swap…</div>}>
          <Show when={swap()} fallback={<div class="empty-state">Swap not found.</div>}>
            {(data) => (
              <div class="detail-grid">
                <div class="detail-card">
                  <p class="eyebrow">Identifiers</p>
                  <dl class="key-value-grid">
                    <dt>Swap ID</dt>
                    <dd class="mono">{data().swap_id}</dd>
                    <dt>Provider</dt>
                    <dd>{data().provider}</dd>
                    <dt>Provider swap ID</dt>
                    <dd class="mono">{truncateMiddle(data().provider_swap_id)}</dd>
                    <dt>Status</dt>
                    <dd><span class="status-chip">{data().status}</span></dd>
                  </dl>
                </div>

                <div class="detail-card">
                  <p class="eyebrow">Route</p>
                  <dl class="key-value-grid">
                    <dt>From</dt>
                    <dd>{data().from}</dd>
                    <dt>To</dt>
                    <dd>{data().to}</dd>
                    <dt>Rate type</dt>
                    <dd>{data().rate_type}</dd>
                    <dt>Sandbox</dt>
                    <dd>{data().is_sandbox ? 'Yes' : 'No'}</dd>
                  </dl>
                </div>

                <div class="detail-card">
                  <p class="eyebrow">Amounts</p>
                  <dl class="key-value-grid">
                    <dt>Amount</dt>
                    <dd>{formatAmount(data().amount)}</dd>
                    <dt>Estimated receive</dt>
                    <dd>{formatAmount(data().estimated_receive)}</dd>
                    <dt>Actual receive</dt>
                    <dd>{formatAmount(data().actual_receive)}</dd>
                    <dt>Total fee</dt>
                    <dd>{formatAmount(data().total_fee)}</dd>
                  </dl>
                </div>

                <div class="detail-card">
                  <p class="eyebrow">Addresses</p>
                  <dl class="key-value-grid">
                    <dt>Deposit</dt>
                    <dd class="mono">{data().deposit_address}</dd>
                    <dt>Deposit extra ID</dt>
                    <dd class="mono">{data().deposit_extra_id || '—'}</dd>
                    <dt>Recipient</dt>
                    <dd class="mono">{data().recipient_address}</dd>
                    <dt>Recipient extra ID</dt>
                    <dd class="mono">{data().recipient_extra_id || '—'}</dd>
                  </dl>
                </div>

                <div class="detail-card detail-card-wide">
                  <p class="eyebrow">Lifecycle</p>
                  <dl class="key-value-grid">
                    <dt>Created</dt>
                    <dd>{formatDateTime(data().created_at)}</dd>
                    <dt>Updated</dt>
                    <dd>{formatDateTime(data().updated_at)}</dd>
                    <dt>Expires</dt>
                    <dd>{formatDateTime(data().expires_at)}</dd>
                    <dt>Completed</dt>
                    <dd>{formatDateTime(data().completed_at)}</dd>
                    <dt>Inbound tx</dt>
                    <dd class="mono">{truncateMiddle(data().tx_hash_in)}</dd>
                    <dt>Outbound tx</dt>
                    <dd class="mono">{truncateMiddle(data().tx_hash_out)}</dd>
                    <dt>Error</dt>
                    <dd>{data().error || '—'}</dd>
                  </dl>
                </div>

                <div class="detail-card detail-card-wide">
                  <div class="section-heading">
                    <div>
                      <p class="eyebrow">Timeline</p>
                      <h3>Provider and system state changes</h3>
                    </div>
                  </div>

                  <Show when={!timeline.loading} fallback={<div class="empty-state">Loading timeline…</div>}>
                    <Show when={timeline()?.timeline.length} fallback={<div class="empty-state">No timeline events recorded yet.</div>}>
                      <ol class="timeline-list">
                        <For each={timeline()?.timeline || []}>
                          {(event) => (
                            <li class="timeline-item">
                              <div class="timeline-item__status">
                                <span class="status-chip">{event.status}</span>
                                <strong>{formatDateTime(event.created_at)}</strong>
                              </div>
                              <p>{event.message || 'No provider message recorded.'}</p>
                            </li>
                          )}
                        </For>
                      </ol>
                    </Show>
                  </Show>
                </div>
              </div>
            )}
          </Show>
        </Show>
      </section>
    </AdminShell>
  );
}
