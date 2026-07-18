import { Title } from '@solidjs/meta';
import { A, useSearchParams } from '@solidjs/router';
import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import AdminShell from '~/components/admin/AdminShell';
import { adminApi } from '~/api/endpoints/admin';
import { adminDataKeys, createAdminCachedQuery } from '~/lib/admin-data';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { formatAmount, formatDateTime, truncateMiddle } from '~/utils/format';

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
    const q = draft().trim();

    setSearchParams({
      q: q || undefined,
      limit: searchParams.limit || '10',
    });
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
            <h3>Find swaps, gift cards, and support threads fast</h3>
          </div>
        </div>

        <form class="actions-row search-row" onSubmit={handleSubmit}>
          <input
            class="text-input"
            value={draft()}
            onInput={(event) => setDraft(event.currentTarget.value)}
            placeholder="Search by email, tx hash, wallet, provider ID, or Assetar ID"
          />
          <button class="button button-primary" type="submit">
            Search
          </button>
        </form>

        <p class="muted">
          Common lookups: client ID, gift card trade ID, provider swap ID, recipient email, deposit address, and tx hash.
        </p>
      </section>

      <Show when={!searchParams.q}>
        <section class="panel empty-state">Enter a query to search across swaps, gift cards, and WhatsApp support.</section>
      </Show>

      <Show when={searchParams.q}>
        <Show when={results.status() !== 'loading' || results.data()} fallback={<section class="panel">Searching…</section>}>
          <div class="page-stack">
            <section class="panel">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">Swaps</p>
                  <h3>{results.data()?.swaps.length || 0} matches</h3>
                </div>
              </div>

              <Show when={results.data()?.swaps.length} fallback={<div class="empty-state">No swap matches.</div>}>
                <div class="result-grid">
                  <For each={results.data()?.swaps || []}>
                    {(swap) => (
                      <A class="list-card list-card--link" href={`/swaps/${swap.id}`}>
                        <div class="list-card__head">
                          <strong>{swap.from_currency}/{swap.to_currency}</strong>
                          <span class="status-chip">{swap.status}</span>
                        </div>
                        <p>{swap.provider} · {formatAmount(swap.amount)} → {formatAmount(swap.estimated_receive)}</p>
                        <small>{truncateMiddle(swap.id, 6)} · {formatDateTime(swap.updated_at)}</small>
                      </A>
                    )}
                  </For>
                </div>
              </Show>
            </section>

            <section class="panel">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">Gift cards</p>
                  <h3>{results.data()?.giftcards.length || 0} matches</h3>
                </div>
              </div>

              <Show when={results.data()?.giftcards.length} fallback={<div class="empty-state">No gift card matches.</div>}>
                <div class="result-grid">
                  <For each={results.data()?.giftcards || []}>
                    {(order) => (
                      <A class="list-card list-card--link" href={`/giftcards/${order.id}`}>
                        <div class="list-card__head">
                          <strong>{order.product_id || order.prepaid_provider || 'Gift card order'}</strong>
                          <span class="status-chip">{order.status}</span>
                        </div>
                        <p>{order.recipient_email_masked} · {order.source_ticker} on {order.source_network}</p>
                        <small>{truncateMiddle(order.id, 6)} · {formatDateTime(order.updated_at)}</small>
                      </A>
                    )}
                  </For>
                </div>
              </Show>
            </section>

            <section class="panel">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">Support</p>
                  <h3>{results.data()?.support.length || 0} matches</h3>
                </div>
              </div>

              <Show when={results.data()?.support.length} fallback={<div class="empty-state">No support matches.</div>}>
                <div class="result-grid">
                  <For each={results.data()?.support || []}>
                    {(item) => (
                      <A class="list-card list-card--link" href={`/whatsapp/${item.wa_id}`}>
                        <div class="list-card__head">
                          <strong>{truncateMiddle(item.wa_id, 7)}</strong>
                          <span class="status-chip">{item.status}</span>
                        </div>
                        <p>{item.state} · {item.assigned_to || 'Unassigned'}</p>
                        <small>{item.tag || 'No tag'} · {formatDateTime(item.updated_at)}</small>
                      </A>
                    )}
                  </For>
                </div>
              </Show>
            </section>
          </div>
        </Show>
      </Show>
    </AdminShell>
  );
}
