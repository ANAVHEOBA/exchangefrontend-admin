import { Title } from '@solidjs/meta';
import { createMemo, createResource, For, Show } from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { adminApi } from '~/api/endpoints/admin';
import AdminShell from '~/components/admin/AdminShell';
import { Drawer, LoadingSkeleton } from '~/components/admin/AdminUI';
import { adminDataKeys, adminDefaultQueries, createAdminCachedQuery } from '~/lib/admin-data';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { formatCurrencyAmount, truncateMiddle } from '~/utils/format';

function removeSelected(params: Record<string, string>): Record<string, string | undefined> {
  return { ...params, selected: undefined };
}

export default function CatalogPage() {
  const auth = useAdminAccess();
  const [searchParams, setSearchParams] = useSearchParams();

  const query = createMemo(() => ({
    country: searchParams.country || undefined,
    search: searchParams.search || undefined,
    category: searchParams.category || undefined,
    limit: Number(searchParams.limit || adminDefaultQueries.catalog.limit || 24),
  }));

  const catalog = createAdminCachedQuery({
    source: () => (auth.ready() ? query() : null),
    getKey: (currentQuery) => adminDataKeys.catalog(currentQuery),
    fetcher: (currentQuery) => adminApi.listGiftcardCatalog(currentQuery),
  });

  const selectedId = createMemo(() => searchParams.selected || null);
  const [cardDetail] = createResource(
    () => {
      if (!auth.ready() || !selectedId()) {
        return null;
      }
      return {
        productId: selectedId() as string,
        country: query().country,
      };
    },
    (source) => adminApi.getGiftcardCatalogItem(source.productId, { country: source.country }),
  );


  const catalogFilterOptions = createMemo(() => {
    const rows = catalog.data()?.cards || [];
    const collect = (selector: (row: (typeof rows)[number]) => string) =>
      Array.from(new Set(rows.map(selector).map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right),
      );
    const ensureCurrent = (values: string[], current?: string) =>
      current && current.trim() && !values.includes(current) ? [current, ...values] : values;

    return {
      countries: ensureCurrent(collect((row) => row.country || ''), searchParams.country || undefined),
      categories: ensureCurrent(collect((row) => row.category || ''), searchParams.category || undefined),
    };
  });

  const updateFilter = (name: string, value: string) => {
    setSearchParams({ ...searchParams, [name]: value || undefined });
  };

  const clearFilters = () => {
    setSearchParams({ limit: String(query().limit || 24) });
  };

  return (
    <AdminShell
      title="Gift card catalog"
      subtitle="Inspect catalog metadata, denominations, country coverage, and product usage guidance."
      actions={
        <button class="button button-secondary" type="button" onClick={() => void catalog.refetch()}>
          {catalog.refreshing() ? 'Refreshing…' : 'Refresh catalog'}
        </button>
      }
    >
      <Title>Gift Card Catalog</Title>

      <section class="panel stack-gap">
        <div class="filter-grid filter-grid--wide">
          <label class="field">
            <span>Country</span>
            <select class="text-input select-input" value={searchParams.country || ''} onChange={(event) => updateFilter('country', event.currentTarget.value)}>
              <option value="">All countries</option>
              <For each={catalogFilterOptions().countries}>{(value) => <option value={value}>{value}</option>}</For>
            </select>
          </label>
          <label class="field">
            <span>Search</span>
            <input class="text-input" value={searchParams.search || ''} onInput={(event) => updateFilter('search', event.currentTarget.value)} placeholder="Adidas" />
          </label>
          <label class="field">
            <span>Category</span>
            <select class="text-input select-input" value={searchParams.category || ''} onChange={(event) => updateFilter('category', event.currentTarget.value)}>
              <option value="">All categories</option>
              <For each={catalogFilterOptions().categories}>{(value) => <option value={value}>{value}</option>}</For>
            </select>
          </label>
        </div>
        <div class="actions-row">
          <button class="button button-secondary" type="button" onClick={clearFilters}>Clear filters</button>
          <span class="muted">Source: {catalog.data()?.source || 'catalog service'}</span>
        </div>
      </section>

      <section class="panel table-card">
        <Show when={catalog.status() !== 'loading' || catalog.data()} fallback={<div class="empty-state">Loading catalog…</div>}>
          <Show when={catalog.data()?.cards.length} fallback={<div class="empty-state">No catalog cards matched the current filters.</div>}>
            <div class="table-scroll">
              <table class="data-table data-table--interactive">
                <thead>
                  <tr>
                    <th>Card</th>
                    <th>Category</th>
                    <th>Country</th>
                    <th>Currency</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>Denominations</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={catalog.data()?.cards || []}>
                    {(card) => (
                      <tr class="clickable-row" onClick={() => setSearchParams({ ...searchParams, selected: card.product_id })}>
                        <td>
                          <div class="asset-cell">
                            <Show when={card.card_image_url}><img class="asset-icon asset-icon--card" src={card.card_image_url || ''} alt={card.name} /></Show>
                            <div>
                              <strong>{card.name}</strong>
                              <div class="table-subcopy mono">{truncateMiddle(card.product_id, 6)}</div>
                            </div>
                          </div>
                        </td>
                        <td>{card.category || '—'}</td>
                        <td>{card.country || '—'}</td>
                        <td>{card.currency_code || '—'}</td>
                        <td>{formatCurrencyAmount(card.min_amount, card.currency_code)}</td>
                        <td>{formatCurrencyAmount(card.max_amount, card.currency_code)}</td>
                        <td>{card.denominations?.length ? card.denominations.join(', ') : '—'}</td>
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
        title={cardDetail()?.card.name || 'Catalog item'}
        subtitle="Description, usage guide, legal text, and denomination limits."
        onClose={() => setSearchParams(removeSelected(searchParams))}
      >
        <Show when={!cardDetail.loading} fallback={<LoadingSkeleton rows={6} />}>
          <Show when={cardDetail()} fallback={<div class="empty-state">Catalog detail is unavailable.</div>}>
            {(detail) => (
              <div class="page-stack">
                <section class="detail-card stack-gap">
                  <div class="catalog-drawer-head">
                    <Show when={detail().card.card_image_url}><img class="catalog-card-image" src={detail().card.card_image_url || ''} alt={detail().card.name} /></Show>
                    <div class="catalog-drawer-copy stack-gap">
                      <div>
                        <p class="eyebrow">Product</p>
                        <h3>{detail().card.name}</h3>
                        <p class="muted">{detail().card.description || 'No additional description supplied by the provider.'}</p>
                      </div>
                      <dl class="key-value-grid">
                        <dt>Product ID</dt>
                        <dd class="mono">{detail().card.product_id}</dd>
                        <dt>Category</dt>
                        <dd>{detail().card.category || '—'}</dd>
                        <dt>Country</dt>
                        <dd>{detail().card.country || '—'}</dd>
                        <dt>Currency</dt>
                        <dd>{detail().card.currency_code || '—'}</dd>
                        <dt>Minimum</dt>
                        <dd>{formatCurrencyAmount(detail().card.min_amount, detail().card.currency_code)}</dd>
                        <dt>Maximum</dt>
                        <dd>{formatCurrencyAmount(detail().card.max_amount, detail().card.currency_code)}</dd>
                        <dt>Denominations</dt>
                        <dd>{detail().card.denominations?.length ? detail().card.denominations.join(', ') : '—'}</dd>
                      </dl>
                    </div>
                  </div>
                </section>

                <section class="detail-card stack-gap">
                  <div class="section-heading"><div><p class="eyebrow">How to use</p><h3>Redemption guidance</h3></div></div>
                  <p class="long-copy">{detail().card.how_to_use || 'No usage guidance supplied.'}</p>
                </section>

                <section class="detail-card stack-gap">
                  <div class="section-heading"><div><p class="eyebrow">Legal and limits</p><h3>Terms and validity</h3></div></div>
                  <p class="long-copy">{detail().card.terms_and_conditions || 'No terms supplied.'}</p>
                  <p class="long-copy">{detail().card.expiry_and_validity || 'No expiry information supplied.'}</p>
                </section>
              </div>
            )}
          </Show>
        </Show>
      </Drawer>
    </AdminShell>
  );
}
