import { Title } from '@solidjs/meta';
import { A, useSearchParams } from '@solidjs/router';
import { createMemo, createResource, For, Show } from 'solid-js';
import AdminShell from '~/components/admin/AdminShell';
import { adminApi } from '~/api/endpoints/admin';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { formatDateTime, truncateMiddle } from '~/utils/format';

export default function WhatsAppPage() {
  const auth = useAdminAccess();
  const [searchParams, setSearchParams] = useSearchParams();

  const query = createMemo(() => ({
    page: Number(searchParams.page || 1),
    limit: Number(searchParams.limit || 20),
    admin_status: searchParams.admin_status || undefined,
    assigned_to: searchParams.assigned_to || undefined,
    state: searchParams.state || undefined,
    wa_id: searchParams.wa_id || undefined,
  }));

  const [conversations, { refetch }] = createResource(
    () => (auth.ready() ? JSON.stringify(query()) : null),
    () => adminApi.listConversations(query()),
  );

  const updateFilter = (name: string, value: string) => {
    setSearchParams({ ...searchParams, [name]: value || undefined, page: '1' });
  };

  const nextPage = () => {
    setSearchParams({ ...searchParams, page: String(query().page + 1) });
  };

  const prevPage = () => {
    setSearchParams({ ...searchParams, page: String(Math.max(1, query().page - 1)) });
  };

  return (
    <AdminShell title="WhatsApp">
      <Title>WhatsApp</Title>

      <section class="panel stack-gap">
        <div class="split-header">
          <div>
            <p class="eyebrow">Support desk</p>
            <h2>Monitor WhatsApp conversations</h2>
          </div>
          <button class="button button-secondary" type="button" onClick={() => refetch()}>
            Refresh
          </button>
        </div>

        <div class="filter-grid">
          <label class="field">
            <span>Admin status</span>
            <input class="text-input" value={searchParams.admin_status || ''} onInput={(event) => updateFilter('admin_status', event.currentTarget.value)} />
          </label>
          <label class="field">
            <span>Assigned to</span>
            <input class="text-input" value={searchParams.assigned_to || ''} onInput={(event) => updateFilter('assigned_to', event.currentTarget.value)} />
          </label>
          <label class="field">
            <span>State</span>
            <input class="text-input" value={searchParams.state || ''} onInput={(event) => updateFilter('state', event.currentTarget.value)} />
          </label>
          <label class="field">
            <span>WA ID</span>
            <input class="text-input" value={searchParams.wa_id || ''} onInput={(event) => updateFilter('wa_id', event.currentTarget.value)} />
          </label>
        </div>
      </section>

      <section class="panel table-card">
        <Show when={auth.ready()}>
          <Show when={!conversations.loading} fallback={<div class="empty-state">Loading conversations…</div>}>
            <Show when={conversations()?.conversations?.length} fallback={<div class="empty-state">No conversations matched the current filters.</div>}>
              <div class="table-scroll">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>WA ID</th>
                      <th>Status</th>
                      <th>State</th>
                      <th>Assigned</th>
                      <th>Locale</th>
                      <th>Last inbound</th>
                      <th>Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={conversations()?.conversations || []}>
                      {(conversation) => (
                        <tr>
                          <td>
                            <A class="table-link mono" href={`/whatsapp/${conversation.wa_id}`}>
                              {truncateMiddle(conversation.wa_id, 7)}
                            </A>
                          </td>
                          <td><span class="status-chip">{conversation.admin_status}</span></td>
                          <td>{conversation.state}</td>
                          <td>{conversation.assigned_to || '—'}</td>
                          <td>{conversation.locale}</td>
                          <td>{formatDateTime(conversation.last_inbound_at)}</td>
                          <td>{conversation.last_message_preview || '—'}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </Show>
        </Show>

        <Show when={conversations()?.pagination}>
          {(pagination) => (
            <div class="actions-row spaced-top">
              <button class="button button-secondary" type="button" disabled={pagination().page <= 1} onClick={prevPage}>
                Previous
              </button>
              <span class="muted">Page {pagination().page} of {Math.max(1, pagination().total_pages)}</span>
              <button class="button button-secondary" type="button" disabled={pagination().page >= pagination().total_pages} onClick={nextPage}>
                Next
              </button>
            </div>
          )}
        </Show>
      </section>
    </AdminShell>
  );
}
