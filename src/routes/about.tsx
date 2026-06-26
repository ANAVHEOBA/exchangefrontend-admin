import { Title } from '@solidjs/meta';
import { A } from '@solidjs/router';

export default function AboutPage() {
  return (
    <main class="login-shell">
      <Title>About</Title>
      <section class="login-card">
        <p class="eyebrow">Assetar Admin</p>
        <h1>Admin console</h1>
        <p class="muted">This project is wired against the backend admin endpoints for swaps and WhatsApp operations.</p>
        <A class="button button-primary button-full" href="/login">
          Open login
        </A>
      </section>
    </main>
  );
}
