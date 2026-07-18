import { Title } from '@solidjs/meta';
import { A } from '@solidjs/router';
import { createMemo, For, Show } from 'solid-js';
import AdminShell from '~/components/admin/AdminShell';
import { adminApi } from '~/api/endpoints/admin';
import {
  adminDataKeys,
  adminDefaultQueries,
  createAdminCachedQuery,
} from '~/lib/admin-data';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { formatAmount, formatDateTime } from '~/utils/format';
import type { OpsProviderHealthRow } from '~/types/admin';

function providerState(provider: OpsProviderHealthRow) {
  if (provider.failed_swaps_24h > 0 || provider.giftcard_failed_24h > 0) {
    return 'attention';
  }

  if (provider.open_swaps > 0 || provider.giftcard_active > 0) {
    return 'live';
  }

  return 'idle';
}

function loadStateLabel(status: string, refreshing: boolean) {
  if (refreshing) {
    return 'refreshing';
  }

  if (status === 'ready') {
    return 'ready';
  }

  if (status === 'error') {
    return 'error';
  }

  return 'warming';
}

export default function OverviewPage() {
  const auth = useAdminAccess();

  const dashboard = createAdminCachedQuery({
    source: () => (auth.ready() ? 'dashboard' : null),
    getKey: () => adminDataKeys.dashboard(),
    fetcher: () => adminApi.getDashboard(),
  });

  const health = createAdminCachedQuery({
    source: () => (auth.ready() ? 'health' : null),
    getKey: () => adminDataKeys.health(),
    fetcher: () => adminApi.getHealth(),
  });

  const finance = createAdminCachedQuery({
    source: () => (auth.ready() ? adminDefaultQueries.finance : null),
    getKey: (query) => adminDataKeys.finance(query),
    fetcher: (query) => adminApi.getFinance(query),
  });

  const webhooks = createAdminCachedQuery({
    source: () => (auth.ready() ? 'webhooks' : null),
    getKey: () => adminDataKeys.webhooks(),
    fetcher: () => adminApi.getWebhookMonitor(),
  });

  const swaps = createAdminCachedQuery({
    source: () => (auth.ready() ? adminDefaultQueries.swaps : null),
    getKey: (query) => adminDataKeys.swaps(query),
    fetcher: (query) => adminApi.listSwaps(query),
  });

  const giftcards = createAdminCachedQuery({
    source: () => (auth.ready() ? adminDefaultQueries.giftcards : null),
    getKey: (query) => adminDataKeys.giftcards(query),
    fetcher: (query) => adminApi.listGiftcardOrders(query),
  });

  const whatsapp = createAdminCachedQuery({
    source: () => (auth.ready() ? adminDefaultQueries.whatsapp : null),
    getKey: (query) => adminDataKeys.whatsapp(query),
    fetcher: (query) => adminApi.listConversations(query),
  });

  const summaryMetrics = createMemo(() => {
    const snapshot = dashboard.data()?.summary;

    if (!snapshot) {
      return [];
    }

    return [
      {
        label: 'Open swaps',
        value: snapshot.swaps.open,
        copy: 'Trades still active across providers',
      },
      {
        label: 'Swap failures, 24h',
        value: snapshot.swaps.failed_last_24h,
        copy: 'Failures recorded in the last day',
      },
      {
        label: 'Refunded swaps, 24h',
        value: snapshot.swaps.refunded_last_24h,
        copy: 'Refunded swap count in the same window',
      },
      {
        label: 'Open WhatsApp conversations',
        value: snapshot.whatsapp.open_conversations,
        copy: 'Threads still owned by support',
      },
      {
        label: 'Gift card sell leads',
        value: snapshot.whatsapp.giftcard_sell_leads,
        copy: 'Lead threads tagged for gift card sales',
      },
      {
        label: 'Waiting user',
        value: snapshot.whatsapp.waiting_user,
        copy: 'Support threads blocked on customer response',
      },
    ];
  });

  const providerRows = createMemo(() => {
    const rows = health.data()?.providers ?? dashboard.data()?.providers ?? [];
    return rows.slice(0, 6);
  });

  const riskFlags = createMemo(() => {
    const rows = health.data()?.risk_flags ?? dashboard.data()?.risk_flags ?? [];
    return rows.slice(0, 5);
  });

  const moduleRows = createMemo(() => {
    const snapshot = dashboard.data();
    const healthData = health.data();
    const financeData = finance.data();
    const webhookData = webhooks.data();
    const swapsData = swaps.data();
    const giftcardData = giftcards.data();
    const whatsappData = whatsapp.data();

    return [
      {
        area: 'Operations',
        module: 'Global Search',
        description: 'Find swaps, gift cards, and support threads',
        snapshot: 'Search by Assetar ID, provider ID, email, wallet, or tx hash',
        state: 'query-driven',
        updatedAt: 'On demand',
        href: '/search',
      },
      {
        area: 'Operations',
        module: 'Provider Health',
        description: 'Failures, latency, and risk flags',
        snapshot: healthData
          ? `${healthData.providers.length} providers · ${healthData.risk_flags.length} risk flags`
          : 'Provider and worker snapshot warming',
        state: loadStateLabel(health.status(), health.refreshing()),
        updatedAt: formatDateTime(healthData?.generated_at),
        href: '/health',
      },
      {
        area: 'Operations',
        module: 'Finance',
        description: 'Volume, fees, and daily reporting',
        snapshot: financeData
          ? `${financeData.totals.completed_swaps} completed swaps · ${formatAmount(financeData.totals.swap_platform_fees, 2)} platform fees`
          : 'Daily reporting snapshot warming',
        state: loadStateLabel(finance.status(), finance.refreshing()),
        updatedAt: formatDateTime(financeData?.generated_at),
        href: '/finance',
      },
      {
        area: 'Operations',
        module: 'Webhooks',
        description: 'Retry backlog and dead letters',
        snapshot: webhookData
          ? `${webhookData.deliveries.length} active delivery rows`
          : 'Delivery backlog warming',
        state: loadStateLabel(webhooks.status(), webhooks.refreshing()),
        updatedAt: webhookData?.deliveries[0]?.updated_at
          ? formatDateTime(webhookData.deliveries[0].updated_at)
          : '—',
        href: '/webhooks',
      },
      {
        area: 'Trading',
        module: 'Swaps',
        description: 'Monitor quotes, deposits, and payouts',
        snapshot: swapsData && snapshot
          ? `${snapshot.summary.swaps.open} open swaps · ${swapsData.swaps.length} recent rows warmed`
          : 'Swap queue warming',
        state: loadStateLabel(swaps.status(), swaps.refreshing()),
        updatedAt: swapsData?.swaps[0]?.updated_at
          ? formatDateTime(swapsData.swaps[0].updated_at)
          : '—',
        href: '/swaps',
      },
      {
        area: 'Trading',
        module: 'Gift Cards',
        description: 'Orders, retries, locks, and delivery state',
        snapshot: giftcardData && snapshot
          ? `${giftcardData.orders.length} recent orders · ${snapshot.worker.giftcard_queued} queued`
          : 'Gift card queue warming',
        state: loadStateLabel(giftcards.status(), giftcards.refreshing()),
        updatedAt: giftcardData?.orders[0]?.updated_at
          ? formatDateTime(giftcardData.orders[0].updated_at)
          : '—',
        href: '/giftcards',
      },
      {
        area: 'Support',
        module: 'WhatsApp',
        description: 'Inbox, assignment, and admin notes',
        snapshot: whatsappData && snapshot
          ? `${snapshot.summary.whatsapp.open_conversations} open conversations · ${whatsappData.conversations.length} recent rows warmed`
          : 'Support queue warming',
        state: loadStateLabel(whatsapp.status(), whatsapp.refreshing()),
        updatedAt: whatsappData?.conversations[0]?.updated_at
          ? formatDateTime(whatsappData.conversations[0].updated_at)
          : '—',
        href: '/whatsapp',
      },
    ];
  });

  const anyRefreshing = createMemo(
    () =>
      dashboard.refreshing() ||
      health.refreshing() ||
      finance.refreshing() ||
      webhooks.refreshing() ||
      swaps.refreshing() ||
      giftcards.refreshing() ||
      whatsapp.refreshing(),
  );

  const refreshAll = async () => {
    await Promise.all([
      dashboard.refetch(),
      health.refetch(),
      finance.refetch(),
      webhooks.refetch(),
      swaps.refetch(),
      giftcards.refetch(),
      whatsapp.refetch(),
    ]);
  };

  return (
    <AdminShell
      title="Operations overview"
      subtitle="Track queue pressure, provider stability, and support load from one command surface."
      actions={
        <button class="button button-secondary" type="button" onClick={() => void refreshAll()}>
          {anyRefreshing() ? 'Refreshing…' : 'Refresh dashboard'}
        </button>
      }
    >
      <Title>Operations Overview</Title>

      <Show when={auth.ready()}>
        <Show when={dashboard.status() !== 'loading' || dashboard.data()} fallback={<section class="panel">Loading dashboard…</section>}>
          <Show when={dashboard.data()} fallback={<section class="panel">No overview data available yet.</section>}>
            {(snapshot) => (
              <div class="page-stack">
                <section class="panel dashboard-hero">
                  <div class="dashboard-hero__copy">
                    <p class="eyebrow">Operations overview</p>
                    <h3>Live workload, queue pressure, and warmed admin modules</h3>
                    <p class="muted">
                      The dashboard now prewarms the main admin endpoints in the background, so navigating into swaps, gift cards, finance, webhooks, and support should reuse warm data instead of starting cold.
                    </p>
                  </div>

                  <div class="dashboard-hero__meta">
                    <span class="dashboard-hero__signal">Live snapshot</span>
                    <span class="dashboard-hero__stamp">{formatDateTime(snapshot().generated_at)}</span>
                  </div>
                </section>

                <section class="panel dashboard-stats-panel">
                  <div class="dashboard-stats">
                    <For each={summaryMetrics()}>
                      {(item) => (
                        <div class="dashboard-stat">
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                          <small>{item.copy}</small>
                        </div>
                      )}
                    </For>
                  </div>
                </section>

                <section class="panel table-card">
                  <div class="section-heading">
                    <div>
                      <p class="eyebrow">Modules</p>
                      <h3>Admin surfaces and their current snapshot</h3>
                    </div>
                  </div>

                  <div class="table-scroll">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Area</th>
                          <th>Module</th>
                          <th>Description</th>
                          <th>Live snapshot</th>
                          <th>State</th>
                          <th>Last sync</th>
                          <th>Open</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={moduleRows()}>
                          {(row) => (
                            <tr>
                              <td>{row.area}</td>
                              <td>{row.module}</td>
                              <td>{row.description}</td>
                              <td>{row.snapshot}</td>
                              <td>
                                <span class={`dashboard-module-state dashboard-module-state--${row.state.replace(/\s+/g, '-')}`}>
                                  {row.state}
                                </span>
                              </td>
                              <td>{row.updatedAt}</td>
                              <td>
                                <A class="table-link" href={row.href}>
                                  Open
                                </A>
                              </td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </section>

                <div class="dashboard-main-grid">
                  <div class="dashboard-main-column">
                    <section class="panel">
                      <div class="section-heading">
                        <div>
                          <p class="eyebrow">Providers</p>
                          <h3>Provider watchlist</h3>
                        </div>
                        <A class="button button-secondary" href="/health">
                          Full health view
                        </A>
                      </div>

                      <Show when={providerRows().length} fallback={<div class="empty-state">No provider health rows yet.</div>}>
                        <div class="table-scroll">
                          <table class="data-table">
                            <thead>
                              <tr>
                                <th>Provider</th>
                                <th>State</th>
                                <th>Open swaps</th>
                                <th>Gift cards active</th>
                                <th>Failures, 24h</th>
                                <th>Last activity</th>
                              </tr>
                            </thead>
                            <tbody>
                              <For each={providerRows()}>
                                {(provider) => {
                                  const state = providerState(provider);
                                  return (
                                    <tr>
                                      <td>{provider.provider}</td>
                                      <td>
                                        <span class={`dashboard-provider-state dashboard-provider-state--${state}`}>
                                          {state}
                                        </span>
                                      </td>
                                      <td>{provider.open_swaps}</td>
                                      <td>{provider.giftcard_active}</td>
                                      <td>{provider.failed_swaps_24h + provider.giftcard_failed_24h}</td>
                                      <td>{formatDateTime(provider.last_activity_at)}</td>
                                    </tr>
                                  );
                                }}
                              </For>
                            </tbody>
                          </table>
                        </div>
                      </Show>
                    </section>
                  </div>

                  <aside class="dashboard-side-column">
                    <section class="panel">
                      <div class="section-heading">
                        <div>
                          <p class="eyebrow">Risk flags</p>
                          <h3>Sanity checks needing review</h3>
                        </div>
                      </div>

                      <Show when={riskFlags().length} fallback={<div class="empty-state">No active risk flags.</div>}>
                        <div class="dashboard-risk-list">
                          <For each={riskFlags()}>
                            {(flag) => (
                              <div class="dashboard-risk-item">
                                <div class="list-card__head">
                                  <strong>{flag.code}</strong>
                                  <span class={`severity-pill severity-${flag.severity.toLowerCase()}`}>{flag.severity}</span>
                                </div>
                                <p>{flag.message}</p>
                                <small>
                                  {flag.entity_type} · {flag.entity_id}
                                </small>
                              </div>
                            )}
                          </For>
                        </div>
                      </Show>
                    </section>
                  </aside>
                </div>
              </div>
            )}
          </Show>
        </Show>
      </Show>
    </AdminShell>
  );
}
