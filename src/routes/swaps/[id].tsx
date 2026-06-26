import { Title } from '@solidjs/meta';
import { A, useParams } from '@solidjs/router';
import { createResource, Show } from 'solid-js';
import AdminShell from '~/components/admin/AdminShell';
import { adminApi } from '~/api/endpoints/admin';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { formatAmount, formatDateTime, truncateMiddle } from '~/utils/format';

export default function SwapDetailPage() {
  const params = useParams();
  const auth = useAdminAccess();
  const [swap] = createResource(
    () => (auth.ready() ? params.id : null),
    (id) => adminApi.getSwap(id),
  );

  return (
    <AdminShell title="Swap Detail">
      <Title>Swap Detail</Title>

      <section class="panel stack-gap">
        <A class="button button-secondary" href="/swaps">
          Back to swaps
        </A>

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
              </div>
            )}
          </Show>
        </Show>
      </section>
    </AdminShell>
  );
}
