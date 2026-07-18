import { Title } from '@solidjs/meta';
import { useNavigate } from '@solidjs/router';
import { createSignal, onMount, Show } from 'solid-js';
import { adminApi } from '~/api/endpoints/admin';
import type { ApiError } from '~/types/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  onMount(() => {
    if (adminApi.getSession()?.accessToken) {
      navigate('/', { replace: true });
    }
  });

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await adminApi.loginAndStoreSession({ email: email().trim(), password: password() });
      navigate('/', { replace: true });
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setError(apiError.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main class="login-shell">
      <Title>Admin Login</Title>
      <section class="login-card">
        <div>
          <p class="eyebrow">Assetar back office</p>
          <h1>Admin login</h1>
          <p class="muted">
            Use your admin credentials to manage swaps, gift card operations, provider health, and WhatsApp support.
          </p>
        </div>

        <form class="stack" onSubmit={handleSubmit}>
          <label class="field">
            <span>Email</span>
            <input
              class="text-input"
              type="email"
              value={email()}
              onInput={(event) => setEmail(event.currentTarget.value)}
              autocomplete="email"
              required
            />
          </label>

          <label class="field">
            <span>Password</span>
            <input
              class="text-input"
              type="password"
              value={password()}
              onInput={(event) => setPassword(event.currentTarget.value)}
              autocomplete="current-password"
              required
            />
          </label>

          <Show when={error()}>
            {(message) => <div class="alert-error">{message()}</div>}
          </Show>

          <button class="button button-primary button-full" type="submit" disabled={loading()}>
            {loading() ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
