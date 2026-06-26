import { A, useLocation } from '@solidjs/router';
import type { JSX } from 'solid-js';
import { useAdminAccess } from '~/hooks/useAdminAccess';

const navigation = [
  { href: '/', label: 'Overview' },
  { href: '/swaps', label: 'Swaps' },
  { href: '/whatsapp', label: 'WhatsApp' },
];

export default function AdminShell(props: { title: string; children: JSX.Element }) {
  const location = useLocation();
  const auth = useAdminAccess();

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }

    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  return (
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <div>
          <div class="admin-brand">Assetar Admin</div>
          <p class="admin-sidebar-copy">Operations console for swaps and WhatsApp support.</p>
        </div>

        <nav class="admin-nav">
          {navigation.map((item) => (
            <A href={item.href} class={`admin-nav-link${isActive(item.href) ? ' active' : ''}`} end={item.href === '/'}>
              {item.label}
            </A>
          ))}
        </nav>

        <div class="admin-sidebar-footer">
          <div class="admin-pill">{auth.adminEmail()}</div>
          <button class="button button-secondary button-full" type="button" onClick={auth.logout}>
            Sign out
          </button>
        </div>
      </aside>

      <div class="admin-main">
        <header class="admin-topbar">
          <div>
            <p class="eyebrow">Assetar back office</p>
            <h1>{props.title}</h1>
          </div>
        </header>
        <main class="admin-content">{props.children}</main>
      </div>
    </div>
  );
}
