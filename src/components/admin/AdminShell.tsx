import { A, useLocation } from '@solidjs/router';
import { Show, children, createEffect, createMemo, createSignal, type JSX } from 'solid-js';
import { scheduleAdminPrewarm } from '~/lib/admin-data';
import { useAdminAccess } from '~/hooks/useAdminAccess';

type NavItem = {
  href: string;
  icon: 'overview' | 'search' | 'health' | 'finance' | 'webhooks' | 'swaps' | 'giftcards' | 'whatsapp';
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
      { href: '/', icon: 'overview', label: 'Overview', hint: 'Queues, pressure, and support load' },
      { href: '/search', icon: 'search', label: 'Global Search', hint: 'Find swaps, gift cards, and support threads' },
      { href: '/health', icon: 'health', label: 'Provider Health', hint: 'Failures, latency, and risk flags' },
      { href: '/finance', icon: 'finance', label: 'Finance', hint: 'Volume, fees, and daily reporting' },
      { href: '/webhooks', icon: 'webhooks', label: 'Webhooks', hint: 'Retry backlog and dead letters' },
    ],
  },
  {
    label: 'Trading',
    items: [
      { href: '/swaps', icon: 'swaps', label: 'Swaps', hint: 'Monitor quotes, deposits, and payouts' },
      { href: '/giftcards', icon: 'giftcards', label: 'Gift Cards', hint: 'Orders, retries, locks, and delivery state' },
    ],
  },
  {
    label: 'Support',
    items: [
      { href: '/whatsapp', icon: 'whatsapp', label: 'WhatsApp', hint: 'Inbox, assignment, and admin notes' },
    ],
  },
];

type AdminShellProps = {
  title: string;
  subtitle?: string;
  actions?: JSX.Element;
  children: JSX.Element;
};

function SidebarIcon(props: { name: NavItem['icon'] }) {
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
  const subtitle = createMemo(() => props.subtitle);
  const actions = children(() => props.actions);
  const hasActions = createMemo(() => actions.toArray().length > 0);

  const apiHost = createMemo(() => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

    try {
      const url = new URL(base);
      return url.hostname === 'localhost' ? 'Local backend' : url.hostname;
    } catch {
      return base;
    }
  });

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
                  <p>Operations Console</p>
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
                <span>{apiHost()}</span>
              </div>
            </section>

            <nav class="ops-nav" aria-label="Admin navigation">
              {navGroups.map((group) => (
                <div class="ops-nav__group">
                  <p class="ops-nav__label">{group.label}</p>

                  {group.items.map((item) => (
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
                  ))}
                </div>
              ))}
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
              {subtitle() ? <p class="muted">{subtitle()}</p> : null}
            </div>

            <Show when={hasActions()}>
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
