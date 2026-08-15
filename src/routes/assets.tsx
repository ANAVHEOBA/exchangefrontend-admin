import { Title } from '@solidjs/meta';
import { createMemo, createResource, createSignal, Show, For } from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { adminApi } from '~/api/endpoints/admin';
import AdminShell from '~/components/admin/AdminShell';
import { CopyButton, Drawer, LoadingSkeleton, StatusChip } from '~/components/admin/AdminUI';
import { adminDataKeys, adminDefaultQueries, createAdminCachedQuery } from '~/lib/admin-data';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { formatAmount, formatDateTime } from '~/utils/format';
import type { OpsAssetValidateResponse } from '~/types/admin';
import type { ApiError } from '~/types/api';

function removeSelected(params: Record<string, string>): Record<string, string | undefined> {
  return { ...params, selected: undefined };
}

export default function AssetsPage() {
  const auth = useAdminAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const [syncMessage, setSyncMessage] = createSignal<string | null>(null);
  const [syncError, setSyncError] = createSignal<string | null>(null);
  const [syncing, setSyncing] = createSignal(false);
  const [validationResult, setValidationResult] = createSignal<OpsAssetValidateResponse | null>(null);
  const [validationError, setValidationError] = createSignal<string | null>(null);
  const [validating, setValidating] = createSignal(false);
  const [addressDraft, setAddressDraft] = createSignal('');

  const query = createMemo(() => ({
    search: searchParams.search || undefined,
    ticker: searchParams.ticker || undefined,
    network: searchParams.network || undefined,
    memo_required:
      searchParams.memo_required === 'true'
        ? true
        : searchParams.memo_required === 'false'
          ? false
          : undefined,
    active_only:
      searchParams.active_only === 'false'
        ? false
        : searchParams.active_only === 'true'
          ? true
          : adminDefaultQueries.assets.active_only,
    limit: Number(searchParams.limit || adminDefaultQueries.assets.limit || 30),
  }));

  const assets = createAdminCachedQuery({
    source: () => (auth.ready() ? query() : null),
    getKey: (currentQuery) => adminDataKeys.assets(currentQuery),
    fetcher: (currentQuery) => adminApi.listAssets(currentQuery),
  });

  const selectedToken = createMemo(() => searchParams.selected || null);
  const selectedAssetKey = createMemo(() => {
    const token = selectedToken();
    if (!token) {
      return null;
    }

    const [ticker, network] = token.split('::');
    if (!ticker || !network) {
      return null;
    }

    return { ticker, network };
  });

  const [assetDetail, { refetch: refetchAssetDetail }] = createResource(
    () => (auth.ready() ? selectedAssetKey() : null),
    (key) => adminApi.getAssetDetail(key.ticker, key.network),
  );


  const assetFilterOptions = createMemo(() => {
    const rows = assets.data()?.assets || [];
    const collect = (selector: (row: (typeof rows)[number]) => string) =>
      Array.from(new Set(rows.map(selector).map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right),
      );
    const ensureCurrent = (values: string[], current?: string) =>
      current && current.trim() && !values.includes(current) ? [current, ...values] : values;

    return {
      tickers: ensureCurrent(collect((row) => row.ticker), searchParams.ticker || undefined),
      networks: ensureCurrent(collect((row) => row.network), searchParams.network || undefined),
    };
  });

  const updateFilter = (name: string, value: string) => {
    setSearchParams({ ...searchParams, [name]: value || undefined });
  };

  const clearFilters = () => {
    setSearchParams({ limit: String(query().limit || 30) });
  };

  const closeDetail = () => {
    setSearchParams(removeSelected(searchParams));
    setValidationResult(null);
    setValidationError(null);
    setAddressDraft('');
  };

  const syncAssets = async () => {
    setSyncing(true);
    setSyncMessage(null);
    setSyncError(null);

    try {
      const response = await adminApi.syncAssets();
      setSyncMessage(`Synced ${response.synced_count} assets.`);
      await Promise.all([assets.refetch(), refetchAssetDetail()]);
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setSyncError(apiError.message || 'Unable to sync assets.');
    } finally {
      setSyncing(false);
    }
  };

  const validateAddress = async (event: SubmitEvent) => {
    event.preventDefault();
    const detail = assetDetail();
    if (!detail) {
      return;
    }

    setValidating(true);
    setValidationError(null);
    setValidationResult(null);

    try {
      const response = await adminApi.validateAssetAddress({
        ticker: detail.asset.ticker,
        network: detail.asset.network,
        address: addressDraft().trim(),
      });
      setValidationResult(response);
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setValidationError(apiError.message || 'Address validation failed.');
    } finally {
      setValidating(false);
    }
  };

  return (
    <AdminShell
      title="Coins and assets"
      subtitle="Monitor supported networks, limits, and memo requirements, and validate addresses without leaving the desk."
      actions={
        <div class="actions-row">
          <button class="button button-secondary" type="button" onClick={() => void assets.refetch()}>
            {assets.refreshing() ? 'Refreshing…' : 'Refresh'}
          </button>
          <button class="button button-primary" type="button" disabled={syncing()} onClick={() => void syncAssets()}>
            {syncing() ? 'Syncing…' : 'Sync all assets'}
          </button>
        </div>
      }
    >
      <Title>Coins and Assets</Title>

      <section class="panel stack-gap">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Directory filters</p>
            <h3>Find an asset or network</h3>
          </div>
        </div>

        <div class="filter-grid filter-grid--wide">
          <label class="field">
            <span>Search</span>
            <input class="text-input" value={searchParams.search || ''} onInput={(event) => updateFilter('search', event.currentTarget.value)} />
          </label>
          <label class="field">
            <span>Ticker</span>
            <select class="text-input select-input" value={searchParams.ticker || ''} onChange={(event) => updateFilter('ticker', event.currentTarget.value)}>
              <option value="">All tickers</option>
              <For each={assetFilterOptions().tickers}>{(value) => <option value={value}>{value}</option>}</For>
            </select>
          </label>
          <label class="field">
            <span>Network</span>
            <select class="text-input select-input" value={searchParams.network || ''} onChange={(event) => updateFilter('network', event.currentTarget.value)}>
              <option value="">All networks</option>
              <For each={assetFilterOptions().networks}>{(value) => <option value={value}>{value}</option>}</For>
            </select>
          </label>
          <label class="field">
            <span>Memo required</span>
            <select class="text-input select-input" value={searchParams.memo_required || ''} onChange={(event) => updateFilter('memo_required', event.currentTarget.value)}>
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
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
          <button class="button button-secondary" type="button" onClick={clearFilters}>Clear filters</button>
          <Show when={syncMessage()}>{(message) => <span class="inline-success">{message()}</span>}</Show>
          <Show when={syncError()}>{(message) => <span class="inline-error">{message()}</span>}</Show>
        </div>
      </section>

      <section class="panel table-card">
        <Show when={assets.status() !== 'loading' || assets.data()} fallback={<div class="empty-state">Loading assets…</div>}>
          <Show when={assets.data()?.assets.length} fallback={<div class="empty-state">No assets matched the current filters.</div>}>
            <div class="table-scroll">
              <table class="data-table data-table--interactive">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Network</th>
                    <th>Memo required</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>Status</th>
                    <th>Last sync</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={assets.data()?.assets || []}>
                    {(asset) => (
                      <tr class="clickable-row" onClick={() => setSearchParams({ ...searchParams, selected: `${asset.ticker}::${asset.network}` })}>
                        <td>
                          <div class="asset-cell">
                            <Show when={asset.image}><img class="asset-icon" src={asset.image || ''} alt={asset.ticker} /></Show>
                            <div>
                              <strong>{asset.ticker}</strong>
                              <div class="table-subcopy">{asset.name}</div>
                            </div>
                          </div>
                        </td>
                        <td>{asset.network}</td>
                        <td>{asset.memo_required ? asset.extra_id_name || 'Yes' : 'No'}</td>
                        <td>{formatAmount(asset.minimum, 8)}</td>
                        <td>{formatAmount(asset.maximum, 8)}</td>
                        <td><StatusChip label={asset.is_active ? 'Active' : 'Disabled'} status={asset.is_active ? 'active' : 'disabled'} /></td>
                        <td>{formatDateTime(asset.last_synced_at)}</td>
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
        open={Boolean(selectedAssetKey())}
        title={selectedAssetKey() ? `${selectedAssetKey()?.ticker} · ${selectedAssetKey()?.network}` : 'Asset detail'}
        subtitle="Network metadata, pair coverage, and address validation."
        onClose={closeDetail}
        actions={
          <button class="button button-secondary button-compact" type="button" onClick={() => void refetchAssetDetail()}>
            Refresh detail
          </button>
        }
      >
        <Show when={!assetDetail.loading} fallback={<LoadingSkeleton rows={6} />}>
          <Show when={assetDetail()} fallback={<div class="empty-state">Asset detail is unavailable.</div>}>
            {(detail) => (
              <div class="page-stack">
                <section class="detail-card stack-gap">
                  <div class="asset-detail-head">
                    <Show when={detail().asset.image}><img class="asset-detail-icon" src={detail().asset.image || ''} alt={detail().asset.ticker} /></Show>
                    <div>
                      <p class="eyebrow">Asset details</p>
                      <h3>{detail().asset.name}</h3>
                      <p class="muted">{detail().asset.ticker} on {detail().asset.network}</p>
                    </div>
                    <StatusChip label={detail().asset.is_active ? 'Active' : 'Disabled'} status={detail().asset.is_active ? 'active' : 'disabled'} />
                  </div>
                  <dl class="key-value-grid">
                    <dt>Memo required</dt>
                    <dd>{detail().asset.memo_required ? detail().asset.extra_id_name || 'Yes' : 'No'}</dd>
                    <dt>Minimum</dt>
                    <dd>{formatAmount(detail().asset.minimum, 8)}</dd>
                    <dt>Maximum</dt>
                    <dd>{formatAmount(detail().asset.maximum, 8)}</dd>
                    <dt>Provider count</dt>
                    <dd>{detail().provider_count}</dd>
                    <dt>Source pair count</dt>
                    <dd>{detail().source_pair_count}</dd>
                    <dt>Destination pair count</dt>
                    <dd>{detail().destination_pair_count}</dd>
                    <dt>Last synced</dt>
                    <dd>{formatDateTime(detail().asset.last_synced_at)}</dd>
                  </dl>
                </section>

                <section class="detail-card stack-gap">
                  <div class="section-heading">
                    <div>
                      <p class="eyebrow">Address validator</p>
                      <h3>Validate a customer address against this network</h3>
                    </div>
                  </div>
                  <form class="stack-gap" onSubmit={validateAddress}>
                    <label class="field">
                      <span>Wallet address</span>
                      <textarea class="textarea-input" rows="4" value={addressDraft()} onInput={(event) => setAddressDraft(event.currentTarget.value)} required />
                    </label>
                    <div class="actions-row">
                      <button class="button button-primary" type="submit" disabled={validating()}>
                        {validating() ? 'Validating…' : 'Validate address'}
                      </button>
                      <Show when={validationError()}>{(message) => <span class="inline-error">{message()}</span>}</Show>
                    </div>
                  </form>
                  <Show when={validationResult()}>
                    {(result) => (
                      <div class="list-card">
                        <div class="list-card__head">
                          <strong>{result().ticker} · {result().network}</strong>
                          <StatusChip label={result().valid ? 'Valid' : 'Invalid'} status={result().valid ? 'valid' : 'invalid'} />
                        </div>
                        <p class="mono">{result().address}</p>
                        <CopyButton value={result().address} />
                      </div>
                    )}
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
