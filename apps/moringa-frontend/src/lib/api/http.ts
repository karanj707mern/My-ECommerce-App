// CRITICAL ARCHITECTURAL RULE:
// Frontend API calls MUST go through @moringa/nestia-sdk.
// NEVER import directly from @moringa/backend.
// This boundary protects the codebase from backend rewrites.

import { API_BASE_URL } from './config';
import { getGuestToken, getToken, setToken, clearToken, markLoggedOut } from './storage';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions extends RequestInit {
  method?: HttpMethod;
}

async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit & { timeout?: number } = {},
): Promise<Response> {
  const { timeout = 15000, ...fetchOptions } = init;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(input, {
      ...fetchOptions,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = getToken();
  const guestToken = getGuestToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(guestToken ? { 'X-Guest-Token': guestToken } : {}),
  };

  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string> | undefined),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const message = (payload?.message as string) || (payload?.error as string) || 'Request failed';
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
