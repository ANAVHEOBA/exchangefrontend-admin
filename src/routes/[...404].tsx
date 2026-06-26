import { Title } from '@solidjs/meta';
import { A } from '@solidjs/router';

export default function NotFound() {
  return (
    <main class="login-shell">
      <Title>Page Not Found</Title>
      <section class="login-card">
        <p class="eyebrow">404</p>
        <h1>Page not found</h1>
        <p class="muted">The page you requested does not exist in the admin console.</p>
        <A class="button button-primary button-full" href="/">
          Go to overview
        </A>
      </section>
    </main>
  );
}
