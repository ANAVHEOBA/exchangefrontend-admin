import { useNavigate } from '@solidjs/router';
import { createSignal, onMount } from 'solid-js';
import { adminApi } from '~/api/endpoints/admin';

export function useAdminAccess() {
  const navigate = useNavigate();
  const [ready, setReady] = createSignal(false);

  onMount(() => {
    if (adminApi.getSession()?.accessToken) {
      setReady(true);
      return;
    }

    navigate('/login', { replace: true });
  });

  const logout = () => {
    adminApi.clearSession();
    navigate('/login', { replace: true });
  };

  return {
    ready,
    logout,
    isAuthenticated: () => Boolean(adminApi.getSession()?.accessToken),
    adminEmail: () => adminApi.getSession()?.adminEmail || 'Admin',
  };
}
