import { Title } from '@solidjs/meta';
import { A, useSearchParams } from '@solidjs/router';
import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import { adminApi } from '~/api/endpoints/admin';
import AdminShell from '~/components/admin/AdminShell';
import { StatusChip } from '~/components/admin/AdminUI';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { adminDataKeys, createAdminCachedQuery } from '~/lib/admin-data';
import { formatAmount, formatDateTime, formatPair, truncateMiddle } from '~/utils/format';

export default function SearchPage() {
  const auth = useAdminAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = createSignal(searchParams.q || '');

  createEffect(() => {
    setDraft(searchParams.q || '');
  });

  const query = createMemo(() => {
    if (!auth.ready()) {
      return null;
    }

    const search = searchParams.q?.trim();
    if (!search) {
      return null;
    }

    return {
      q: search,
      limit: Number(searchParams.limit || 10),
    };
  });

  const results = createAdminCachedQuery({
    source: query,
    getKey: (currentQuery) => adminDataKeys.search(currentQuery),
    fetcher: (currentQuery) => adminApi.search(currentQuery),
  });

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const next = draft().trim();
    setSearchParams({ q: next || undefined, limit: searchParams.limit || '10' });
  };

  return (
    <AdminShell
      title="Global search"
      subtitle="Search by Assetar ID, provider ID, trade ID, email, wallet address, or transaction hash."
      actions={
        <button class="button button-secondary" type="button" onClick={() => void results.refetch()}>
          {results.refreshing() ? 'Refreshing…' : 'Refresh'}
        </button>
      }
    >
      <Title>Global Search</Title>

      <section class="panel stack-gap">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Admin search</p>
            <h3>Find swaps, gift cards, and support threads</h3>
          </div>
        </div>

        <form class="actions-row search-row" onSubmit={handleSubmit}>
          <input
            class="text-input"
            value={draft()}
            onInput={(event) => setDraft(event.currentTarget.value)}
            placeholder="Search by email, tx hash, wallet, provider ID, or Assetar ID"
          />
          <button class="button button-primary" type="submit">Search</button>
        </form>
      </section>

      <Show when={!searchParams.q}>
        <section class="panel empty-state">Enter a query to search across swaps, gift cards, and WhatsApp support.</section>
      </Show>

      <Show when={searchParams.q}>
        <Show when={results.status() !== 'loading' || results.data()} fallback={<section class="panel">Searching…</section>}>
          <div class="page-stack">
            <section class="panel stack-gap">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">Swaps</p>
                  <h3>{results.data()?.swaps.length || 0} matches</h3>
                </div>
              </div>
              <Show when={results.data()?.swaps.length} fallback={<div class="empty-state">No swap matches.</div>}>
                <div class="table-scroll">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Swap</th>
                        <th>Status</th>
                        <th>Pair</th>
                        <th>Provider</th>
                        <th>Amount</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={results.data()?.swaps || []}>
                        {(swap) => (
                          <tr>
                            <td>
                              <A class="table-link mono" href={`/swaps?selected=${encodeURIComponent(swap.id)}`}>
                                {truncateMiddle(swap.id, 7)}
                              </A>
                            </td>
                            <td><StatusChip status={swap.status} /></td>
                            <td>{formatPair(swap.from_currency, swap.from_network, swap.to_currency, swap.to_network)}</td>
                            <td>{swap.provider}</td>
                            <td>{formatAmount(swap.amount, 6)} {swap.from_currency}</td>
                            <td>{formatDateTime(swap.updated_at)}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>
            </section>

            <section class="panel stack-gap">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">Gift cards</p>
                  <h3>{results.data()?.giftcards.length || 0} matches</h3>
                </div>
              </div>
              <Show when={results.data()?.giftcards.length} fallback={<div class="empty-state">No gift card matches.</div>}>
                <div class="table-scroll">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Status</th>
                        <th>Product</th>
                        <th>Email</th>
                        <th>Source</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={results.data()?.giftcards || []}>
                        {(order) => (
                          <tr>
                            <td>
                              <A class="table-link mono" href={`/giftcards?selected=${encodeURIComponent(order.id)}`}>
                                {truncateMiddle(order.id, 7)}
                              </A>
                            </td>
                            <td><StatusChip status={order.status} /></td>
                            <td>{order.product_id || order.prepaid_provider || order.order_kind}</td>
                            <td>{order.recipient_email_masked}</td>
                            <td>{order.source_ticker} · {order.source_network}</td>
                            <td>{formatDateTime(order.updated_at)}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>
            </section>

            <section class="panel stack-gap">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">Support</p>
                  <h3>{results.data()?.support.length || 0} matches</h3>
                </div>
              </div>
              <Show when={results.data()?.support.length} fallback={<div class="empty-state">No support matches.</div>}>
                <div class="table-scroll">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Conversation</th>
                        <th>Status</th>
                        <th>State</th>
                        <th>Assigned</th>
                        <th>Tag</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={results.data()?.support || []}>
                        {(item) => (
                          <tr>
                            <td>
                              <A class="table-link mono" href={`/whatsapp/${item.wa_id}`}>
                                {truncateMiddle(item.wa_id, 7)}
                              </A>
                            </td>
                            <td><StatusChip status={item.status} /></td>
                            <td>{item.state}</td>
                            <td>{item.assigned_to || 'Unassigned'}</td>
                            <td>{item.tag || '—'}</td>
                            <td>{formatDateTime(item.updated_at)}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>
            </section>
          </div>
        </Show>
      </Show>
    </AdminShell>
  );
}
