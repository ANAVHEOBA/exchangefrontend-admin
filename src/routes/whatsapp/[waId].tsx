import { Title } from '@solidjs/meta';
import { A, useParams } from '@solidjs/router';
import { createResource, createSignal, For, Show } from 'solid-js';
import AdminShell from '~/components/admin/AdminShell';
import { adminApi } from '~/api/endpoints/admin';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { ADMIN_STATUS_OPTIONS } from '~/config/constants';
import { formatAmount, formatDateTime, truncateMiddle } from '~/utils/format';
import type { ApiError } from '~/types/api';

export default function ConversationDetailPage() {
  const params = useParams();
  const auth = useAdminAccess();
  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal<string | null>(null);
  const [saveSuccess, setSaveSuccess] = createSignal<string | null>(null);
  const [conversation, { refetch }] = createResource(
    () => (auth.ready() ? params.waId : null),
    (waId) => adminApi.getConversation(waId),
  );

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await adminApi.updateConversation(params.waId, {
        admin_status: String(data.get('admin_status') || '').trim() || undefined,
        admin_tag: String(data.get('admin_tag') || '').trim() || undefined,
        assigned_to: String(data.get('assigned_to') || '').trim() || undefined,
        internal_note: String(data.get('internal_note') || '').trim() || undefined,
      });
      setSaveSuccess('Conversation updated.');
      await refetch();
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setSaveError(apiError.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell title="WhatsApp Detail">
      <Title>WhatsApp Detail</Title>

      <section class="panel stack-gap">
        <A class="button button-secondary" href="/whatsapp">
          Back to conversations
        </A>

        <Show when={!conversation.loading} fallback={<div class="empty-state">Loading conversation…</div>}>
          <Show when={conversation()} fallback={<div class="empty-state">Conversation not found.</div>}>
            {(data) => (
              <div class="section-stack">
                <div class="detail-grid">
                  <div class="detail-card">
                    <p class="eyebrow">Conversation</p>
                    <dl class="key-value-grid">
                      <dt>WA ID</dt>
                      <dd class="mono">{data().conversation.wa_id}</dd>
                      <dt>Phone number ID</dt>
                      <dd class="mono">{data().conversation.phone_number_id}</dd>
                      <dt>Locale</dt>
                      <dd>{data().conversation.locale}</dd>
                      <dt>State</dt>
                      <dd>{data().conversation.state}</dd>
                      <dt>Admin status</dt>
                      <dd><span class="status-chip">{data().conversation.admin_status}</span></dd>
                      <dt>Assigned to</dt>
                      <dd>{data().conversation.assigned_to || '—'}</dd>
                    </dl>
                  </div>

                  <div class="detail-card">
                    <p class="eyebrow">Timestamps</p>
                    <dl class="key-value-grid">
                      <dt>Last inbound</dt>
                      <dd>{formatDateTime(data().conversation.last_inbound_at)}</dd>
                      <dt>Last outbound</dt>
                      <dd>{formatDateTime(data().conversation.last_outbound_at)}</dd>
                      <dt>Updated</dt>
                      <dd>{formatDateTime(data().conversation.updated_at)}</dd>
                      <dt>Outbound status</dt>
                      <dd>{data().conversation.last_outbound_status || '—'}</dd>
                      <dt>Last error</dt>
                      <dd>{data().conversation.last_error || '—'}</dd>
                    </dl>
                  </div>
                </div>

                <section class="detail-card">
                  <p class="eyebrow">Update conversation</p>
                  <form class="stack" onSubmit={handleSubmit}>
                    <div class="filter-grid">
                      <label class="field">
                        <span>Admin status</span>
                        <select class="text-input" name="admin_status" value={data().conversation.admin_status}>
                          <For each={ADMIN_STATUS_OPTIONS}>{(option) => <option value={option}>{option}</option>}</For>
                        </select>
                      </label>
                      <label class="field">
                        <span>Admin tag</span>
                        <input class="text-input" name="admin_tag" value={data().conversation.admin_tag || ''} />
                      </label>
                      <label class="field">
                        <span>Assigned to</span>
                        <input class="text-input" name="assigned_to" value={data().conversation.assigned_to || ''} placeholder="me" />
                      </label>
                    </div>

                    <label class="field">
                      <span>Internal note</span>
                      <textarea class="textarea-input" name="internal_note" rows="5">{data().conversation.internal_note || ''}</textarea>
                    </label>

                    <div class="actions-row">
                      <button class="button button-primary" type="submit" disabled={saving()}>
                        {saving() ? 'Saving…' : 'Save changes'}
                      </button>
                      <Show when={saveSuccess()}>
                        {(message) => <span class="inline-success">{message()}</span>}
                      </Show>
                      <Show when={saveError()}>
                        {(message) => <span class="inline-error">{message()}</span>}
                      </Show>
                    </div>
                  </form>
                </section>

                <section class="detail-card">
                  <p class="eyebrow">Related swaps</p>
                  <Show when={data().related_swaps.length} fallback={<div class="empty-state">No related swaps yet.</div>}>
                    <div class="table-scroll">
                      <table class="data-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Status</th>
                            <th>Pair</th>
                            <th>Amount</th>
                            <th>Est. receive</th>
                            <th>Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={data().related_swaps}>
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
                                <td>{formatDateTime(swap.created_at)}</td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
                    </div>
                  </Show>
                </section>

                <section class="detail-card">
                  <p class="eyebrow">Inbound events</p>
                  <Show when={data().events.length} fallback={<div class="empty-state">No webhook events yet.</div>}>
                    <div class="table-scroll">
                      <table class="data-table">
                        <thead>
                          <tr>
                            <th>Kind</th>
                            <th>Message type</th>
                            <th>Text</th>
                            <th>Processed</th>
                            <th>Attempts</th>
                            <th>Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={data().events}>
                            {(event) => (
                              <tr>
                                <td>{event.event_kind}</td>
                                <td>{event.message_type || '—'}</td>
                                <td>{event.text || '—'}</td>
                                <td>{event.processed}</td>
                                <td>{event.attempt_count}</td>
                                <td>{formatDateTime(event.created_at)}</td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
                    </div>
                  </Show>
                </section>

                <section class="detail-card">
                  <p class="eyebrow">Outbound messages</p>
                  <Show when={data().outbound_messages.length} fallback={<div class="empty-state">No outbound messages yet.</div>}>
                    <div class="table-scroll">
                      <table class="data-table">
                        <thead>
                          <tr>
                            <th>Kind</th>
                            <th>Status</th>
                            <th>Body</th>
                            <th>Provider msg ID</th>
                            <th>Sent at</th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={data().outbound_messages}>
                            {(message) => (
                              <tr>
                                <td>{message.message_kind}</td>
                                <td><span class="status-chip">{message.status}</span></td>
                                <td>{message.body}</td>
                                <td class="mono">{truncateMiddle(message.provider_message_id, 6)}</td>
                                <td>{formatDateTime(message.sent_at || message.created_at)}</td>
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
      </section>
    </AdminShell>
  );
}
