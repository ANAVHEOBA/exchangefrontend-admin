import { Title } from '@solidjs/meta';
import { createSignal, Show } from 'solid-js';
import { adminApi } from '~/api/endpoints/admin';
import AdminShell from '~/components/admin/AdminShell';
import { StatusChip } from '~/components/admin/AdminUI';
import { adminDataKeys, createAdminCachedQuery } from '~/lib/admin-data';
import { useAdminAccess } from '~/hooks/useAdminAccess';
import { formatDateTime } from '~/utils/format';

export default function SettingsPage() {
  const auth = useAdminAccess();
  const [diagnosticsOpen, setDiagnosticsOpen] = createSignal(false);

  const settings = createAdminCachedQuery({
    source: () => (auth.ready() ? 'settings' : null),
    getKey: () => adminDataKeys.settings(),
    fetcher: () => adminApi.getSettings(),
  });

  const diagnostics = createAdminCachedQuery({
    source: () => (auth.ready() && diagnosticsOpen() ? 'settings-diagnostics' : null),
    getKey: () => 'assetar-admin-cache/v2:settings-diagnostics',
    fetcher: () => adminApi.getSettingsDiagnostics(),
  });

  return (
    <AdminShell
      title="Settings and API"
      subtitle="Review runtime configuration, webhook completeness, markup policy, and API diagnostics."
      actions={
        <div class="actions-row">
          <button class="button button-secondary" type="button" onClick={() => void settings.refetch()}>
            {settings.refreshing() ? 'Refreshing…' : 'Refresh'}
          </button>
          <button class="button button-primary" type="button" onClick={() => setDiagnosticsOpen(true)}>
            Test API connection
          </button>
        </div>
      }
    >
      <Title>Settings and API</Title>

      <Show when={settings.status() !== 'loading' || settings.data()} fallback={<section class="panel">Loading settings…</section>}>
        <Show when={settings.data()} fallback={<section class="panel empty-state">Settings are unavailable.</section>}>
          {(data) => (
            <div class="page-stack">
              <section class="panel stack-gap">
                <div class="section-heading">
                  <div>
                    <p class="eyebrow">Runtime owner</p>
                    <h3>Configuration snapshot</h3>
                  </div>
                  <span class="muted">Updated {formatDateTime(data().generated_at)}</span>
                </div>
                <dl class="key-value-grid">
                  <dt>Admin email</dt>
                  <dd>{data().admin_email}</dd>
                  <dt>Trocador API key</dt>
                  <dd><StatusChip label={data().trocador_api_key_configured ? 'Configured' : 'Missing'} status={data().trocador_api_key_configured ? 'active' : 'failed'} /></dd>
                  <dt>Webhook enabled</dt>
                  <dd><StatusChip label={data().trocador_webhook_enabled ? 'Enabled' : 'Disabled'} status={data().trocador_webhook_enabled ? 'active' : 'failed'} /></dd>
                  <dt>Webhook key</dt>
                  <dd><StatusChip label={data().trocador_webhook_key_configured ? 'Configured' : 'Missing'} status={data().trocador_webhook_key_configured ? 'active' : 'failed'} /></dd>
                </dl>
              </section>

              <section class="panel stack-gap">
                <div class="section-heading"><div><p class="eyebrow">Webhook configuration</p><h3>Public endpoints</h3></div></div>
                <dl class="key-value-grid">
                  <dt>Public base URL</dt>
                  <dd class="mono">{data().public_base_url || '—'}</dd>
                  <dt>Swap webhook URL</dt>
                  <dd class="mono">{data().swap_webhook_url || '—'}</dd>
                  <dt>Gift card webhook URL</dt>
                  <dd class="mono">{data().giftcard_webhook_url || '—'}</dd>
                </dl>
              </section>

              <section class="panel stack-gap">
                <div class="section-heading"><div><p class="eyebrow">Markup and policy</p><h3>Runtime controls</h3></div></div>
                <dl class="key-value-grid">
                  <dt>Active swap markup</dt>
                  <dd>{data().swap_markup || '—'}</dd>
                  <dt>Allowed swap markups</dt>
                  <dd>{data().allowed_swap_markups.join(', ')}</dd>
                  <dt>Allowed gift card markups</dt>
                  <dd>{data().allowed_card_markups.join(', ')}</dd>
                  <dt>Local certified payout chains</dt>
                  <dd>{data().payout_policy.local_certified_chains.length ? data().payout_policy.local_certified_chains.join(', ') : '—'}</dd>
                  <dt>Trocador-only payout chains</dt>
                  <dd>{data().payout_policy.trocador_only_chains.length ? data().payout_policy.trocador_only_chains.join(', ') : '—'}</dd>
                </dl>
                <p class="muted">Settings are environment-driven in the current backend build, so this screen is read-only until config mutation endpoints are introduced.</p>
              </section>

              <Show when={diagnosticsOpen()}>
                <section class="panel stack-gap">
                  <div class="section-heading">
                    <div>
                      <p class="eyebrow">Diagnostics</p>
                      <h3>Connection and webhook completeness checks</h3>
                    </div>
                    <button class="button button-secondary button-compact" type="button" onClick={() => setDiagnosticsOpen(false)}>
                      Hide
                    </button>
                  </div>
                  <Show when={diagnostics.status() !== 'loading' || diagnostics.data()} fallback={<div class="empty-state">Running diagnostics…</div>}>
                    <Show when={diagnostics.data()} fallback={<div class="empty-state">Diagnostics could not be loaded.</div>}>
                      {(result) => (
                        <div class="page-stack">
                          <div class="metric-grid metric-grid--wide-three">
                            <div class="metric-card metric-card--dense"><span>API key</span><StatusChip label={result().api_key_valid ? 'Valid' : 'Invalid'} status={result().api_key_valid ? 'active' : 'failed'} /></div>
                            <div class="metric-card metric-card--dense"><span>Providers fetch</span><StatusChip label={result().providers_fetch_ok ? 'OK' : 'Fail'} status={result().providers_fetch_ok ? 'active' : 'failed'} /></div>
                            <div class="metric-card metric-card--dense"><span>Currencies fetch</span><StatusChip label={result().currencies_fetch_ok ? 'OK' : 'Fail'} status={result().currencies_fetch_ok ? 'active' : 'failed'} /></div>
                            <div class="metric-card metric-card--dense"><span>Gift cards fetch</span><StatusChip label={result().giftcards_fetch_ok ? 'OK' : 'Fail'} status={result().giftcards_fetch_ok ? 'active' : 'failed'} /></div>
                            <div class="metric-card metric-card--dense"><span>Swap webhook</span><StatusChip label={result().swap_webhook_config_complete ? 'Complete' : 'Incomplete'} status={result().swap_webhook_config_complete ? 'active' : 'failed'} /></div>
                            <div class="metric-card metric-card--dense"><span>Gift card webhook</span><StatusChip label={result().giftcard_webhook_config_complete ? 'Complete' : 'Incomplete'} status={result().giftcard_webhook_config_complete ? 'active' : 'failed'} /></div>
                          </div>
                          <Show when={result().errors.length} fallback={<div class="empty-state">No diagnostics errors reported.</div>}>
                            <div class="list-stack">
                              <For each={result().errors}>{(error) => <div class="list-card"><strong>{error}</strong></div>}</For>
                            </div>
                          </Show>
                        </div>
                      )}
                    </Show>
                  </Show>
                </section>
              </Show>
            </div>
          )}
        </Show>
      </Show>
    </AdminShell>
  );
}
