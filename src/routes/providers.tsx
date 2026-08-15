import { Title } from '@solidjs/meta';
import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { adminApi } from '~/api/endpoints/admin';
import AdminShell from '~/components/admin/AdminShell';
import { Drawer, LoadingSkeleton, StatusChip } from '~/components/admin/AdminUI';
import { adminDataKeys, adminDefaultQueries, createAdminCachedQuery } from '~/lib/admin-data';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { formatAmount, formatDateTime, formatPercent } from '~/utils/format';
import type { ApiError } from '~/types/api';

function removeSelected(params: Record<string, string>): Record<string, string | undefined> {
  return { ...params, selected: undefined };
}

export default function ProvidersPage() {
  const auth = useAdminAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const [syncMessage, setSyncMessage] = createSignal<string | null>(null);
  const [syncError, setSyncError] = createSignal<string | null>(null);
  const [syncing, setSyncing] = createSignal(false);

  const query = createMemo(() => ({
    search: searchParams.search || undefined,
    rating: searchParams.rating || undefined,
    markup_enabled:
      searchParams.markup_enabled === 'true'
        ? true
        : searchParams.markup_enabled === 'false'
          ? false
          : undefined,
    active_only:
      searchParams.active_only === 'false'
        ? false
        : searchParams.active_only === 'true'
          ? true
          : adminDefaultQueries.providers.active_only,
    limit: Number(searchParams.limit || adminDefaultQueries.providers.limit || 25),
  }));

  const providers = createAdminCachedQuery({
    source: () => (auth.ready() ? query() : null),
    getKey: (currentQuery) => adminDataKeys.providers(currentQuery),
    fetcher: (currentQuery) => adminApi.listProviders(currentQuery),
  });

  const selectedId = createMemo(() => searchParams.selected || null);
  const [providerDetail] = createResource(
    () => (auth.ready() ? selectedId() : null),
    (providerId) => adminApi.getProviderDetail(providerId),
  );


  const providerFilterOptions = createMemo(() => {
    const staticRatings = ['A', 'B', 'C', 'D'];
    const current = (searchParams.rating || '').trim();
    if (current && !staticRatings.includes(current)) {
      return { ratings: [current, ...staticRatings] };
    }
    return { ratings: staticRatings };
  });

  const updateFilter = (name: string, value: string) => {
    setSearchParams({ ...searchParams, [name]: value || undefined });
  };

  const syncProviders = async () => {
    setSyncing(true);
    setSyncMessage(null);
    setSyncError(null);

    try {
      const response = await adminApi.syncProviders();
      setSyncMessage(`Synced ${response.synced_count} providers.`);
      await providers.refetch();
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setSyncError(apiError.message || 'Unable to sync providers.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AdminShell
      title="Providers"
      subtitle="Monitor exchange posture, routed volume, failure concentration, and pair coverage."
      actions={
        <div class="actions-row">
          <button class="button button-secondary" type="button" onClick={() => void providers.refetch()}>
            {providers.refreshing() ? 'Refreshing…' : 'Refresh'}
          </button>
          <button class="button button-primary" type="button" disabled={syncing()} onClick={() => void syncProviders()}>
            {syncing() ? 'Syncing…' : 'Sync providers'}
          </button>
        </div>
      }
    >
      <Title>Providers</Title>

      <section class="panel stack-gap">
        <div class="filter-grid filter-grid--wide">
          <label class="field">
            <span>Search</span>
            <input class="text-input" value={searchParams.search || ''} onInput={(event) => updateFilter('search', event.currentTarget.value)} />
          </label>
          <label class="field">
            <span>KYC rating</span>
            <select class="text-input select-input" value={searchParams.rating || ''} onChange={(event) => updateFilter('rating', event.currentTarget.value)}><option value="">All ratings</option><For each={providerFilterOptions().ratings}>{(value) => <option value={value}>{value}</option>}</For></select>
          </label>
          <label class="field">
            <span>Markup</span>
            <select class="text-input select-input" value={searchParams.markup_enabled || ''} onChange={(event) => updateFilter('markup_enabled', event.currentTarget.value)}>
              <option value="">All</option>
              <option value="true">Markup enabled</option>
              <option value="false">Markup disabled</option>
            </select>
          </label>
          <label class="field">
            <span>Status</span>
            <select class="text-input select-input" value={searchParams.active_only || 'true'} onChange={(event) => updateFilter('active_only', event.currentTarget.value)}>
              <option value="true">Active only</option>
              <option value="false">Include inactive</option>
            </select>
          </label>
        </div>
        <div class="actions-row">
          <Show when={syncMessage()}>{(message) => <span class="inline-success">{message()}</span>}</Show>
          <Show when={syncError()}>{(message) => <span class="inline-error">{message()}</span>}</Show>
        </div>
      </section>

      <section class="panel table-card">
        <Show when={providers.status() !== 'loading' || providers.data()} fallback={<div class="empty-state">Loading providers…</div>}>
          <Show when={providers.data()?.providers.length} fallback={<div class="empty-state">No providers matched the current filters.</div>}>
            <div class="table-scroll">
              <table class="data-table data-table--interactive">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>KYC</th>
                    <th>Insurance</th>
                    <th>Markup</th>
                    <th>Open swaps</th>
                    <th>Failures, 24h</th>
                    <th>Volume, 30d</th>
                    <th>Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={providers.data()?.providers || []}>
                    {(provider) => (
                      <tr class="clickable-row" onClick={() => setSearchParams({ ...searchParams, selected: provider.id })}>
                        <td>
                          <strong>{provider.name}</strong>
                          <div class="table-subcopy mono">{provider.id}</div>
                        </td>
                        <td>{provider.kyc_rating}</td>
                        <td>{formatPercent(provider.insurance_percentage)}</td>
                        <td><StatusChip label={provider.markup_enabled ? 'Enabled' : 'Disabled'} status={provider.markup_enabled ? 'active' : 'disabled'} /></td>
                        <td>{provider.open_swaps}</td>
                        <td>{provider.failed_swaps_24h}</td>
                        <td>{formatAmount(provider.volume_input_30d, 2)}</td>
                        <td>{formatDateTime(provider.last_activity_at)}</td>
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
        title={providerDetail()?.provider.name || 'Provider detail'}
        subtitle="Routing posture, recent volume, failure concentration, and best-performing pairs."
        onClose={() => setSearchParams(removeSelected(searchParams))}
      >
        <Show when={!providerDetail.loading} fallback={<LoadingSkeleton rows={6} />}>
          <Show when={providerDetail()} fallback={<div class="empty-state">Provider detail is unavailable.</div>}>
            {(detail) => (
              <div class="page-stack">
                <section class="detail-card stack-gap">
                  <div class="section-heading">
                    <div>
                      <p class="eyebrow">Provider profile</p>
                      <h3>{detail().provider.name}</h3>
                    </div>
                    <StatusChip label={detail().provider.is_active ? 'Active' : 'Inactive'} status={detail().provider.is_active ? 'active' : 'disabled'} />
                  </div>
                  <dl class="key-value-grid">
                    <dt>Provider ID</dt>
                    <dd class="mono">{detail().provider.id}</dd>
                    <dt>KYC rating</dt>
                    <dd>{detail().provider.kyc_rating}</dd>
                    <dt>Insurance</dt>
                    <dd>{formatPercent(detail().provider.insurance_percentage)}</dd>
                    <dt>Markup enabled</dt>
                    <dd>{detail().provider.markup_enabled ? 'Yes' : 'No'}</dd>
                    <dt>ETA</dt>
                    <dd>{detail().provider.eta_minutes ? `${detail().provider.eta_minutes} min` : '—'}</dd>
                    <dt>Completed swaps, 30d</dt>
                    <dd>{detail().provider.completed_swaps_30d}</dd>
                    <dt>Volume input, 30d</dt>
                    <dd>{formatAmount(detail().provider.volume_input_30d, 2)}</dd>
                    <dt>Platform fees, 30d</dt>
                    <dd>{formatAmount(detail().provider.platform_fees_30d, 2)}</dd>
                    <dt>Last synced</dt>
                    <dd>{formatDateTime(detail().provider.last_synced_at)}</dd>
                  </dl>
                </section>

                <section class="detail-card stack-gap">
                  <div class="section-heading"><div><p class="eyebrow">Top pairs</p><h3>Pairs this provider handles most often</h3></div></div>
                  <Show when={detail().top_pairs.length} fallback={<div class="empty-state">No pair analytics available yet.</div>}>
                    <div class="table-scroll">
                      <table class="data-table">
                        <thead>
                          <tr>
                            <th>From</th>
                            <th>To</th>
                            <th>Trades</th>
                            <th>Volume input</th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={detail().top_pairs}>
                            {(pair) => (
                              <tr>
                                <td>{pair.from_currency} · {pair.from_network}</td>
                                <td>{pair.to_currency} · {pair.to_network}</td>
                                <td>{pair.trades}</td>
                                <td>{formatAmount(pair.volume_input, 4)}</td>
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
      </Drawer>
    </AdminShell>
  );
}
