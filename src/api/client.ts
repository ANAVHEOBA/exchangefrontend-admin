import { API_CONFIG } from '~/config/api';
import { STORAGE_KEYS } from '~/config/constants';
import type { StoredAdminSession } from '~/types/admin';
import type { ApiError } from '~/types/api';

interface RequestOptions {
  signal?: AbortSignal;
}

class ApiClient {
  private session: StoredAdminSession | null = null;

  private readSession(): StoredAdminSession | null {
    if (this.session) {
      return this.session;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const accessToken = window.localStorage.getItem(STORAGE_KEYS.accessToken);
      const refreshToken = window.localStorage.getItem(STORAGE_KEYS.refreshToken);
      if (!accessToken || !refreshToken) {
        return null;
      }

      this.session = {
        accessToken,
        refreshToken,
        tokenType: window.localStorage.getItem(STORAGE_KEYS.tokenType) || 'Bearer',
        adminId: window.localStorage.getItem(STORAGE_KEYS.adminId) || undefined,
        adminEmail: window.localStorage.getItem(STORAGE_KEYS.adminEmail) || undefined,
      };
      return this.session;
    } catch {
      return null;
    }
  }

  private persistSession(session: StoredAdminSession | null): void {
    this.session = session;

    if (typeof window === 'undefined') {
      return;
    }

    try {
      if (!session) {
        Object.values(STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key));
        return;
      }

      window.localStorage.setItem(STORAGE_KEYS.accessToken, session.accessToken);
      window.localStorage.setItem(STORAGE_KEYS.refreshToken, session.refreshToken);
      window.localStorage.setItem(STORAGE_KEYS.tokenType, session.tokenType);

      if (session.adminId) {
        window.localStorage.setItem(STORAGE_KEYS.adminId, session.adminId);
      }
      if (session.adminEmail) {
        window.localStorage.setItem(STORAGE_KEYS.adminEmail, session.adminEmail);
      }
    } catch {
      // Ignore storage failures so the session can still exist in-memory.
    }
  }

  setSession(session: StoredAdminSession): void {
    this.persistSession(session);
  }

  getSession(): StoredAdminSession | null {
    return this.readSession();
  }

  clearSession(): void {
    this.persistSession(null);
  }

  private buildHeaders(): Record<string, string> {
    const headers = { ...API_CONFIG.headers };
    const session = this.readSession();

    if (session?.accessToken) {
      headers.Authorization = `${session.tokenType} ${session.accessToken}`;
    }

    return headers;
  }

  private buildRequestURL(endpoint: string, params?: Record<string, unknown>): string {
    const isAbsoluteEndpoint = endpoint.startsWith('http://') || endpoint.startsWith('https://');
    const baseURL =
      API_CONFIG.baseURL ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const url = new URL(endpoint, isAbsoluteEndpoint ? undefined : baseURL);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          return;
        }

        url.searchParams.set(key, String(value));
      });
    }

    return url.toString();
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    requestOptions?: RequestOptions,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
    const externalSignal = requestOptions?.signal;

    const abortFromExternal = () => controller.abort();

    try {
      if (externalSignal) {
        if (externalSignal.aborted) {
          controller.abort();
        } else {
          externalSignal.addEventListener('abort', abortFromExternal, { once: true });
        }
      }

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', abortFromExternal);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', abortFromExternal);

      if (error instanceof Error && error.name === 'AbortError') {
        throw { message: 'Request timeout', code: 'TIMEOUT' } satisfies ApiError;
      }

      throw error;
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = {
        message: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
      };

      try {
        const payload = await response.json();
        error.message = payload.message || payload.error || error.message;
        error.code = payload.code;
      } catch {
        // Ignore non-JSON error payloads.
      }

      if (response.status === 401) {
        this.clearSession();
      }

      throw error;
    }

    return response.json() as Promise<T>;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH',
    endpoint: string,
    body?: unknown,
    params?: Record<string, unknown>,
    requestOptions?: RequestOptions,
  ): Promise<T> {
    const url = this.buildRequestURL(endpoint, params);

    try {
      const response = await this.fetchWithTimeout(
        url,
        {
          method,
          headers: this.buildHeaders(),
          body: body ? JSON.stringify(body) : undefined,
        },
        requestOptions,
      );

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof Error) {
        throw { message: error.message, code: 'NETWORK_ERROR' } satisfies ApiError;
      }

      throw error;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, unknown>, requestOptions?: RequestOptions): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, params, requestOptions);
  }

  async post<T>(endpoint: string, body?: unknown, requestOptions?: RequestOptions): Promise<T> {
    return this.request<T>('POST', endpoint, body, undefined, requestOptions);
  }

  async patch<T>(endpoint: string, body?: unknown, requestOptions?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', endpoint, body, undefined, requestOptions);
  }

  async download(endpoint: string, params?: Record<string, unknown>): Promise<Blob> {
    const url = this.buildRequestURL(endpoint, params);
    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      await this.handleResponse(response);
    }

    return response.blob();
  }

  async withRetry<T>(fn: () => Promise<T>, attempts: number = API_CONFIG.retryAttempts): Promise<T> {
    let lastError: unknown;

    for (let index = 0; index < attempts; index += 1) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as ApiError).status;
          if (status && status >= 400 && status < 500) {
            throw error;
          }
        }

        if (index < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, API_CONFIG.retryDelay * (index + 1)));
        }
      }
    }

    throw lastError;
  }
}

export const apiClient = new ApiClient();
