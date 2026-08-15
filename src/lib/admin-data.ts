import { createEffect, createSignal, type Accessor } from 'solid-js';
import { adminApi } from '~/api/endpoints/admin';
import type {
  AdminConversationListResponse,
  AdminConversationQuery,
  AdminDashboardResponse,
  AdminGiftCardOrderListResponse,
  AdminGiftCardOrderQuery,
  AdminSwapHistoryResponse,
  AdminSwapQuery,
  OpsAssetListResponse,
  OpsAssetQuery,
  OpsFinanceQuery,
  OpsFinanceResponse,
  OpsGiftCardCatalogQuery,
  OpsGiftCardCatalogResponse,
  OpsHealthResponse,
  OpsProviderListQuery,
  OpsProviderListResponse,
  OpsSearchQuery,
  OpsSearchResponse,
  OpsSettingsResponse,
  OpsWebhookMonitorResponse,
  OpsWebhookQuery,
} from '~/types/admin';

const CACHE_PREFIX = 'assetar-admin-cache/v2:';
const DEFAULT_TTL_MS = 30_000;
const inflightAdminRequests = new Map<string, Promise<unknown>>();

const DEFAULT_SWAP_QUERY: AdminSwapQuery = { limit: 20 };
const DEFAULT_GIFTCARD_QUERY: AdminGiftCardOrderQuery = { limit: 50 };
const DEFAULT_WHATSAPP_QUERY: AdminConversationQuery = { page: 1, limit: 20 };
const DEFAULT_FINANCE_QUERY: OpsFinanceQuery = {};
const DEFAULT_WEBHOOK_QUERY: OpsWebhookQuery = { limit: 25 };
const DEFAULT_ASSET_QUERY: OpsAssetQuery = { limit: 30, active_only: true };
const DEFAULT_PROVIDER_QUERY: OpsProviderListQuery = { limit: 25, active_only: true };
const DEFAULT_CATALOG_QUERY: OpsGiftCardCatalogQuery = { limit: 24 };

let lastPrewarmAt = 0;

type CachedEnvelope<T> = {
  cached_at: number;
  value: T;
};

type CachedQueryStatus = 'idle' | 'loading' | 'ready' | 'error';

function buildCacheKey(scope: string, params?: unknown): string {
  if (params === undefined) {
    return `${CACHE_PREFIX}${scope}`;
  }

  return `${CACHE_PREFIX}${scope}:${JSON.stringify(params)}`;
}

export const adminDataKeys = {
  dashboard: () => buildCacheKey('dashboard'),
  health: () => buildCacheKey('health'),
  finance: (query: OpsFinanceQuery = DEFAULT_FINANCE_QUERY) => buildCacheKey('finance', query),
  webhooks: (query: OpsWebhookQuery = DEFAULT_WEBHOOK_QUERY) => buildCacheKey('webhooks', query),
  swaps: (query: AdminSwapQuery = DEFAULT_SWAP_QUERY) => buildCacheKey('swaps', query),
  giftcards: (query: AdminGiftCardOrderQuery = DEFAULT_GIFTCARD_QUERY) =>
    buildCacheKey('giftcards', query),
  whatsapp: (query: AdminConversationQuery = DEFAULT_WHATSAPP_QUERY) =>
    buildCacheKey('whatsapp', query),
  search: (query: OpsSearchQuery) => buildCacheKey('search', query),
  assets: (query: OpsAssetQuery = DEFAULT_ASSET_QUERY) => buildCacheKey('assets', query),
  providers: (query: OpsProviderListQuery = DEFAULT_PROVIDER_QUERY) => buildCacheKey('providers', query),
  catalog: (query: OpsGiftCardCatalogQuery = DEFAULT_CATALOG_QUERY) => buildCacheKey('catalog', query),
  settings: () => buildCacheKey('settings'),
} as const;

export function readCachedAdminValue<T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw) as Partial<CachedEnvelope<T>>;

    if (
      typeof cached.cached_at !== 'number' ||
      Date.now() - cached.cached_at > ttlMs ||
      cached.value === undefined
    ) {
      return null;
    }

    return cached.value;
  } catch {
    return null;
  }
}

export function writeCachedAdminValue<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        cached_at: Date.now(),
        value,
      } satisfies CachedEnvelope<T>),
    );
  } catch {
    // Runtime cache is an optimization only.
  }
}

export async function runAdminRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cachedRequest = inflightAdminRequests.get(key);

  if (cachedRequest) {
    return cachedRequest as Promise<T>;
  }

  const request = fetcher().finally(() => {
    inflightAdminRequests.delete(key);
  });

  inflightAdminRequests.set(key, request);
  return request;
}

export async function prefetchAdminValue<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T | null> {
  const cached = readCachedAdminValue<T>(key, ttlMs);

  if (cached) {
    return cached;
  }

  try {
    const response = await runAdminRequest(key, fetcher);
    writeCachedAdminValue(key, response);
    return response;
  } catch {
    return null;
  }
}

export function scheduleAdminPrewarm() {
  if (typeof window === 'undefined') {
    return;
  }

  if (Date.now() - lastPrewarmAt < 15_000) {
    return;
  }

  lastPrewarmAt = Date.now();

  const schedule =
    'requestIdleCallback' in window
      ? window.requestIdleCallback.bind(window)
      : (callback: () => void) => window.setTimeout(callback, 120);

  schedule(() => {
    void Promise.allSettled([
      prefetchAdminValue<AdminDashboardResponse>(adminDataKeys.dashboard(), () => adminApi.getDashboard()),
      prefetchAdminValue<OpsHealthResponse>(adminDataKeys.health(), () => adminApi.getHealth()),
      prefetchAdminValue<OpsFinanceResponse>(
        adminDataKeys.finance(DEFAULT_FINANCE_QUERY),
        () => adminApi.getFinance(DEFAULT_FINANCE_QUERY),
      ),
      prefetchAdminValue<OpsWebhookMonitorResponse>(
        adminDataKeys.webhooks(DEFAULT_WEBHOOK_QUERY),
        () => adminApi.getWebhookMonitor(DEFAULT_WEBHOOK_QUERY),
      ),
      prefetchAdminValue<AdminSwapHistoryResponse>(
        adminDataKeys.swaps(DEFAULT_SWAP_QUERY),
        () => adminApi.listSwaps(DEFAULT_SWAP_QUERY),
      ),
      prefetchAdminValue<AdminGiftCardOrderListResponse>(
        adminDataKeys.giftcards(DEFAULT_GIFTCARD_QUERY),
        () => adminApi.listGiftcardOrders(DEFAULT_GIFTCARD_QUERY),
      ),
      prefetchAdminValue<AdminConversationListResponse>(
        adminDataKeys.whatsapp(DEFAULT_WHATSAPP_QUERY),
        () => adminApi.listConversations(DEFAULT_WHATSAPP_QUERY),
      ),
      prefetchAdminValue<OpsAssetListResponse>(
        adminDataKeys.assets(DEFAULT_ASSET_QUERY),
        () => adminApi.listAssets(DEFAULT_ASSET_QUERY),
      ),
      prefetchAdminValue<OpsProviderListResponse>(
        adminDataKeys.providers(DEFAULT_PROVIDER_QUERY),
        () => adminApi.listProviders(DEFAULT_PROVIDER_QUERY),
      ),
      prefetchAdminValue<OpsGiftCardCatalogResponse>(
        adminDataKeys.catalog(DEFAULT_CATALOG_QUERY),
        () => adminApi.listGiftcardCatalog(DEFAULT_CATALOG_QUERY),
      ),
      prefetchAdminValue<OpsSettingsResponse>(adminDataKeys.settings(), () => adminApi.getSettings()),
    ]);
  });
}

export function createAdminCachedQuery<TSource, TData>(options: {
  source: Accessor<TSource | null>;
  getKey: (source: TSource) => string;
  fetcher: (source: TSource) => Promise<TData>;
  ttlMs?: number;
}) {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const [data, setData] = createSignal<TData | null>(null);
  const [status, setStatus] = createSignal<CachedQueryStatus>('idle');
  const [error, setError] = createSignal<string | null>(null);
  const [refreshing, setRefreshing] = createSignal(false);

  const load = async (source: TSource, background = false) => {
    const cacheKey = options.getKey(source);

    if (!background && !data()) {
      setStatus('loading');
    }

    setRefreshing(background);
    setError(null);

    try {
      const response = await runAdminRequest(cacheKey, () => options.fetcher(source));
      const currentSource = options.source();

      writeCachedAdminValue(cacheKey, response);

      if (!currentSource || options.getKey(currentSource) !== cacheKey) {
        return response;
      }

      setData(response);
      setStatus('ready');
      return response;
    } catch (caughtError) {
      if (!background || !data()) {
        setData(null);
        setStatus('error');
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to load admin data right now.',
      );

      return null;
    } finally {
      setRefreshing(false);
    }
  };

  createEffect(() => {
    const source = options.source();

    if (!source) {
      setData(null);
      setStatus('idle');
      setError(null);
      setRefreshing(false);
      return;
    }

    const cacheKey = options.getKey(source);
    const cached = readCachedAdminValue<TData>(cacheKey, ttlMs);

    if (cached) {
      setData(cached);
      setStatus('ready');
      setError(null);
      void load(source, true);
      return;
    }

    void load(source, false);
  });

  return {
    data,
    status,
    error,
    refreshing,
    refetch: async () => {
      const source = options.source();
      return source ? load(source, true) : null;
    },
  };
}

export const adminDefaultQueries = {
  finance: DEFAULT_FINANCE_QUERY,
  swaps: DEFAULT_SWAP_QUERY,
  giftcards: DEFAULT_GIFTCARD_QUERY,
  whatsapp: DEFAULT_WHATSAPP_QUERY,
  webhooks: DEFAULT_WEBHOOK_QUERY,
  assets: DEFAULT_ASSET_QUERY,
  providers: DEFAULT_PROVIDER_QUERY,
  catalog: DEFAULT_CATALOG_QUERY,
} as const;
