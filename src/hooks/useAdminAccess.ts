import { useNavigate } from '@solidjs/router';
import { createSignal, onMount } from 'solid-js';
import { adminApi } from '~/api/endpoints/admin';
import type { StoredAdminSession } from '~/types/admin';

export function useAdminAccess() {
  const navigate = useNavigate();
  const [ready, setReady] = createSignal(false);
  const [session, setSession] = createSignal<StoredAdminSession | null>(null);

  onMount(() => {
    const currentSession = adminApi.getSession();
    setSession(currentSession);

    if (currentSession?.accessToken) {
      setReady(true);
      return;
    }

    navigate('/login', { replace: true });
  });

  const logout = () => {
    adminApi.clearSession();
    setSession(null);
    navigate('/login', { replace: true });
  };

  return {
    ready,
    logout,
    isAuthenticated: () => Boolean(session()?.accessToken),
    adminEmail: () => session()?.adminEmail || 'Admin',
  };
}
