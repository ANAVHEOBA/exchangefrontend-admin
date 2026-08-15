import { A, useLocation } from '@solidjs/router';
import { For, Show, createEffect, createMemo, createSignal, type JSX } from 'solid-js';
import { scheduleAdminPrewarm } from '~/lib/admin-data';
import { useAdminAccess } from '~/hooks/useAdminAccess';

type NavIcon =
  | 'overview'
  | 'search'
  | 'health'
  | 'finance'
  | 'webhooks'
  | 'swaps'
  | 'giftcards'
  | 'whatsapp'
  | 'assets'
  | 'catalog'
  | 'providers'
  | 'settings';

type NavItem = {
  href: string;
  icon: NavIcon;
  label: string;
  hint: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { href: '/', icon: 'overview', label: 'Overview', hint: 'KPIs, live activity, and queue pressure' },
      { href: '/search', icon: 'search', label: 'Global Search', hint: 'Find by ID, email, wallet, or tx hash' },
      { href: '/health', icon: 'health', label: 'Provider Health', hint: 'Workers, failures, and risk flags' },
      { href: '/finance', icon: 'finance', label: 'Finance', hint: 'Volume, fees, and daily slices' },
      { href: '/webhooks', icon: 'webhooks', label: 'Webhooks', hint: 'Delivery history, retries, and payloads' },
      { href: '/settings', icon: 'settings', label: 'Settings', hint: 'Runtime config and diagnostics' },
    ],
  },
  {
    label: 'Trading',
    items: [
      { href: '/swaps', icon: 'swaps', label: 'Swaps', hint: 'Quotes, deposits, payouts, and timelines' },
      { href: '/giftcards', icon: 'giftcards', label: 'Gift Card Orders', hint: 'Retries, locks, delivery, and reveal audit' },
      { href: '/assets', icon: 'assets', label: 'Coins & Assets', hint: 'Networks, limits, and address validation' },
      { href: '/catalog', icon: 'catalog', label: 'Gift Card Catalog', hint: 'Product metadata, limits, and country coverage' },
      { href: '/providers', icon: 'providers', label: 'Providers', hint: 'KYC posture, routing volume, and top pairs' },
    ],
  },
  {
    label: 'Support',
    items: [
      { href: '/whatsapp', icon: 'whatsapp', label: 'WhatsApp', hint: 'Inbox, assignment, notes, and related swaps' },
    ],
  },
];

type AdminShellProps = {
  title: string;
  subtitle?: string;
  actions?: JSX.Element;
  children: JSX.Element;
};

function SidebarIcon(props: { name: NavIcon }) {
  switch (props.name) {
    case 'overview':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7">
          <rect x="3" y="3" width="5" height="5" rx="1.2" />
          <rect x="12" y="3" width="5" height="8" rx="1.2" />
          <rect x="3" y="12" width="5" height="5" rx="1.2" />
          <rect x="12" y="14" width="5" height="3" rx="1.2" />
        </svg>
      );
    case 'search':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
          <circle cx="8.5" cy="8.5" r="4.75" />
          <path d="M12.2 12.2L16.4 16.4" />
        </svg>
      );
    case 'health':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3.5 10h3l1.7-3.3 3.1 6.6 1.8-3.3h3.4" />
        </svg>
      );
    case 'finance':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 14.5L8 10.5 10.8 13.3 16 8" />
          <path d="M12.8 8H16v3.2" />
        </svg>
      );
    case 'webhooks':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7.2 6.1A3.8 3.8 0 0 1 14 8" />
          <path d="M12.8 13.9A3.8 3.8 0 0 1 6 12" />
          <path d="M6 8H2.8" />
          <path d="M17.2 12H14" />
        </svg>
      );
    case 'swaps':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 6h9" />
          <path d="M10.5 3.5L13 6l-2.5 2.5" />
          <path d="M16 14H7" />
          <path d="M9.5 11.5L7 14l2.5 2.5" />
        </svg>
      );
    case 'giftcards':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="6" width="14" height="10" rx="1.6" />
          <path d="M10 6v10" />
          <path d="M3 10h14" />
          <path d="M7.4 6a1.8 1.8 0 1 1 0-3.6c1.7 0 2.6 1.6 2.6 3.6" />
          <path d="M12.6 6a1.8 1.8 0 1 0 0-3.6C10.9 2.4 10 4 10 6" />
        </svg>
      );
    case 'assets':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 4h8" />
          <path d="M4 8h12" />
          <path d="M6 12h8" />
          <path d="M8 16h4" />
        </svg>
      );
    case 'catalog':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="14" height="12" rx="1.8" />
          <path d="M7 4v12" />
          <path d="M7 8h10" />
        </svg>
      );
    case 'providers':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 15.5h12" />
          <path d="M6 15.5V8.8" />
          <path d="M10 15.5V5.8" />
          <path d="M14 15.5V10.8" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="10" cy="10" r="2.4" />
          <path d="M10 3.3v1.5" />
          <path d="M10 15.2v1.5" />
          <path d="M15.2 10h1.5" />
          <path d="M3.3 10h1.5" />
          <path d="M14 6l1-1" />
          <path d="M5 15l1-1" />
          <path d="M14 14l1 1" />
          <path d="M5 5l1 1" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 3.2a6.1 6.1 0 0 1 5.9 7.6 6.1 6.1 0 0 1-8.8 3.9L3.8 15.8l1.1-3.1A6.1 6.1 0 0 1 10 3.2Z" />
          <path d="M7.8 8.1c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .5.3l.6 1.3c.1.2.1.4 0 .6l-.4.5c-.1.1-.1.3 0 .5.3.6 1 .4 2 1.4 1 .9.9 1.6 1.5 1.9.2.1.4.1.5 0l.5-.4c.2-.1.4-.1.6 0l1.2.6c.3.1.3.3.3.5v.4c0 .3 0 .5-.4.7-.5.3-1.1.4-1.7.2-1-.3-2.1-.9-3.3-2s-1.7-2.1-2-3.2c-.2-.7-.1-1.3.1-1.9Z" />
        </svg>
      );
  }
}

export default function AdminShell(props: AdminShellProps) {
  const location = useLocation();
  const auth = useAdminAccess();
  const [sidebarOpen, setSidebarOpen] = createSignal(false);
  const actions = createMemo(() => props.actions);

  createEffect(() => {
    if (auth.ready()) {
      scheduleAdminPrewarm();
    }
  });

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }

    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  return (
    <div class="ops-app">
      <div class="ops-shell">
        <aside classList={{ 'ops-sidebar': true, open: sidebarOpen() }}>
          <div class="ops-sidebar__inner">
            <div class="ops-sidebar__brand-row">
              <div class="ops-brand-block">
                <div class="ops-brand-mark">A</div>
                <div class="ops-brand-copy">
                  <h1>Assetar</h1>
                  <p>Back Office</p>
                </div>
              </div>

              <button
                class="ops-sidebar__close"
                type="button"
                aria-label="Close navigation"
                onClick={() => setSidebarOpen(false)}
              >
                ×
              </button>
            </div>

            <section class="ops-sidebar__summary">
              <div class="ops-sidebar__avatar" aria-hidden="true">
                {auth.adminEmail().slice(0, 1).toUpperCase()}
              </div>
              <div class="ops-sidebar__summary-copy">
                <strong>{auth.adminEmail()}</strong>
              </div>
            </section>

            <nav class="ops-nav" aria-label="Admin navigation">
              <For each={navGroups}>
                {(group) => (
                  <div class="ops-nav__group">
                    <p class="ops-nav__label">{group.label}</p>
                    <For each={group.items}>
                      {(item) => (
                        <A
                          href={item.href}
                          end={item.href === '/'}
                          class={`ops-nav__item${isActive(item.href) ? ' active' : ''}`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <span class="ops-nav__item-main">
                            <span class="ops-nav__icon" aria-hidden="true">
                              <SidebarIcon name={item.icon} />
                            </span>
                            <span class="ops-nav__text">
                              <span>{item.label}</span>
                              <small>{item.hint}</small>
                            </span>
                          </span>
                        </A>
                      )}
                    </For>
                  </div>
                )}
              </For>
            </nav>

            <div class="ops-sidebar__footer">
              <button class="button button-secondary button-full" type="button" onClick={auth.logout}>
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <div class="ops-main">
          <header class="ops-topbar">
            <div class="ops-topbar__mobile">
              <button
                class="button button-ghost ops-menu-button"
                type="button"
                aria-label="Open navigation"
                onClick={() => setSidebarOpen(true)}
              >
                ☰
              </button>
            </div>

            <div class="ops-topbar__copy">
              <p class="eyebrow">Assetar back office</p>
              <h2>{props.title}</h2>
              <Show when={props.subtitle}>
                <p class="muted">{props.subtitle}</p>
              </Show>
            </div>

            <Show when={actions()}>
              <div class="ops-topbar__actions">{actions()}</div>
            </Show>
          </header>

          <main class="ops-content">{props.children}</main>
        </div>

        <Show when={sidebarOpen()}>
          <button
            class="ops-sidebar__backdrop"
            type="button"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          />
        </Show>
      </div>
    </div>
  );
}
