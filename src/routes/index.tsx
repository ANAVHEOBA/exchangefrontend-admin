import { Title } from '@solidjs/meta';
import { A } from '@solidjs/router';
import { createResource, Show } from 'solid-js';
import AdminShell from '~/components/admin/AdminShell';
import { adminApi } from '~/api/endpoints/admin';
import { useAdminAccess } from '~/hooks/useAdminAccess';

export default function OverviewPage() {
  const auth = useAdminAccess();
  const [overview] = createResource(
    () => (auth.ready() ? 'overview' : null),
    () => adminApi.getOverview(),
  );

  return (
    <AdminShell title="Overview">
      <Title>Overview</Title>

      <Show when={auth.ready()}>
        <Show when={!overview.loading} fallback={<section class="panel">Loading overview…</section>}>
          <Show when={overview()} fallback={<section class="panel">No overview data available yet.</section>}>
            {(data) => (
              <div class="section-stack">
                <section class="panel">
                  <p class="eyebrow">Swap operations</p>
                  <div class="stat-grid">
                    <div class="stat-card">
                      <span>Open swaps</span>
                      <strong>{data().swaps.open}</strong>
                    </div>
                    <div class="stat-card">
                      <span>Failed last 24h</span>
                      <strong>{data().swaps.failed_last_24h}</strong>
                    </div>
                    <div class="stat-card">
                      <span>Refunded last 24h</span>
                      <strong>{data().swaps.refunded_last_24h}</strong>
                    </div>
                  </div>
                </section>

                <section class="panel">
                  <p class="eyebrow">WhatsApp operations</p>
                  <div class="stat-grid">
                    <div class="stat-card">
                      <span>Open conversations</span>
                      <strong>{data().whatsapp.open_conversations}</strong>
                    </div>
                    <div class="stat-card">
                      <span>Gift card sell leads</span>
                      <strong>{data().whatsapp.giftcard_sell_leads}</strong>
                    </div>
                    <div class="stat-card">
                      <span>Waiting user</span>
                      <strong>{data().whatsapp.waiting_user}</strong>
                    </div>
                  </div>
                </section>

                <section class="panel quick-links">
                  <A class="button button-primary" href="/swaps">
                    Review swaps
                  </A>
                  <A class="button button-secondary" href="/whatsapp">
                    Review WhatsApp
                  </A>
                </section>
              </div>
            )}
          </Show>
        </Show>
      </Show>
    </AdminShell>
  );
}
