/**
 * HTTP client ported from legacy `lib/api/http.ts`.
 *
 * Features preserved 1:1:
 * - In-memory GET cache with 60s TTL, max 100 entries and inflight dedup
 * - Cache bypass for auth paths, cookie-auth presence and state-changing verbs
 * - CSRF token propagation (`csrf-token` cookie -> `X-CSRF-Token` header)
 * - Single-flight 401 refresh with one retry
 * - 15s default timeout via AbortController
 * - Structured error extraction (`message` / `error`) with status + payload
 */
import { API_BASE_URL } from "../config";
import { getGuestToken } from "../guest-token";

const CACHE_TTL = 60000;
const CACHE_MAX_ENTRIES = 100;

const cache = new Map<string, { value: unknown; expiresAt: number }>();
const inflightRequests = new Map<string, Promise<unknown>>();

const SENSITIVE_PATH_SEGMENTS = [
  "/auth/",
  "/profile",
  "/user",
  "/orders",
  "/cart",
  "/wishlist",
  "/address",
  "/payment",
  "/checkout",
  "/admin",
];

export interface ApiError extends Error {
  status?: number;
  payload?: unknown;
}

interface RequestOptions extends RequestInit {
  skipAuthRefresh?: boolean;
  timeout?: number;
}

function isSensitivePath(path: string): boolean {
  const normalized = path.split("?")[0];
  return SENSITIVE_PATH_SEGMENTS.some((segment) =>
    normalized.startsWith(segment),
  );
}

function shouldBypassCache(path: string, options: RequestOptions): boolean {
  const headers = (options.headers as Record<string, string> | undefined) ?? {};
  const hasAuthHeader = !!headers.Authorization || !!headers.authorization;

  const hasCookieAuth =
    typeof document !== "undefined" &&
    !!(
      document.cookie.match(/(?:^|; )accessToken=([^;]*)/) ||
      document.cookie.match(/(?:^|; )refreshToken=([^;]*)/)
    );

  return hasAuthHeader || hasCookieAuth || isSensitivePath(path);
}

function isCacheableMethod(method: string | undefined): boolean {
  return method === undefined || method.toUpperCase() === "GET";
}

function getCacheKey(path: string, options: RequestOptions): string | null {
  if (!isCacheableMethod(options.method)) {
    return null;
  }

  if (shouldBypassCache(path, options)) {
    return null;
  }

  const body =
    options.body instanceof FormData
      ? null
      : typeof options.body === "string"
        ? options.body
        : undefined;

  return body ? null : `${API_BASE_URL}${path}`;
}

function pruneExpiredCacheEntries(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }

  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }
    cache.delete(oldestKey);
  }
}

let cleanupTimer: ReturnType<typeof setInterval> | undefined;
let storedCsrfToken: string | null = null;

try {
  if (typeof window !== "undefined") {
    cleanupTimer = setInterval(pruneExpiredCacheEntries, CACHE_TTL);
  }
} catch {
  // Interval allocation can fail in constrained environments;
  // cache will still be pruned on access.
}

// Reference kept so bundlers never treat the timer as side-effect-free dead code.
export function stopCacheCleanupTimer(): void {
  if (cleanupTimer !== undefined) {
    clearInterval(cleanupTimer);
    cleanupTimer = undefined;
  }
}

export function getStoredCsrfToken(): string | null {
  return storedCsrfToken;
}

export function setStoredCsrfToken(token: string | null): void {
  storedCsrfToken = token;
}

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() ?? undefined;
  }
  return undefined;
}

function isStateChangingMethod(method: string | undefined): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(
    (method ?? "").toUpperCase(),
  );
}

function buildHeaders(
  headers: Record<string, string> = {},
  options?: { method?: string },
): Record<string, string> {
  const guestToken = getGuestToken();
  const cookieCsrfToken = getCookie("csrf-token");
  const csrfToken = storedCsrfToken || cookieCsrfToken;
  const shouldAttachCsrf =
    !!csrfToken && isStateChangingMethod(options?.method);

  return {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...(guestToken ? { "X-Guest-Token": guestToken } : {}),
    ...(shouldAttachCsrf ? { "X-CSRF-Token": csrfToken } : {}),
    ...headers,
  };
}

async function parseResponsePayload(
  response: Response,
): Promise<{ isJson: boolean; payload: unknown }> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (isJson) {
    try {
      return { isJson: true, payload: await response.json() };
    } catch {
      return { isJson: true, payload: null };
    }
  }

  return { isJson: false, payload: await response.text() };
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: buildHeaders(undefined, { method: "POST" }),
      credentials: "include",
    });

    return response.ok;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

const DEFAULT_TIMEOUT = 15000;

async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit & { timeout?: number } = {},
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = init;

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

async function executeRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { skipAuthRefresh, timeout, ...fetchOptions } = options;
  const isFormData = options.body instanceof FormData;

  let response: Response;

  try {
    response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      timeout,
      headers: isFormData
        ? {
            "X-Requested-With": "XMLHttpRequest",
            ...(getGuestToken() ? { "X-Guest-Token": getGuestToken() } : {}),
            ...((options.headers as Record<string, string>) || {}),
          }
        : buildHeaders(options.headers as Record<string, string>, options),
      credentials: "include",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not reach the API.";
    throw new Error(`${message} Make sure the backend server is running.`, {
      cause: error,
    });
  }

  if (response.status === 401 && !skipAuthRefresh && path !== "/auth/refresh") {
    const didRefresh = await refreshSession().catch(() => false);

    if (didRefresh) {
      return executeRequest<T>(path, {
        ...options,
        skipAuthRefresh: true,
      });
    }
  }

  const { isJson, payload } = await parseResponsePayload(response);

  if (!response.ok) {
    const rawMessage: unknown =
      (isJson && typeof payload === "object" && payload !== null
        ? (payload as Record<string, unknown>).message
        : undefined) ||
      (isJson && typeof payload === "object" && payload !== null
        ? (payload as Record<string, unknown>).error
        : undefined) ||
      "Request failed";

    let message = "Request failed";
    if (typeof rawMessage === "string") {
      message = rawMessage;
    } else if (
      Array.isArray(rawMessage) &&
      rawMessage.every((entry) => typeof entry === "string")
    ) {
      message = (rawMessage as string[]).join(", ");
    }

    const error: ApiError = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  if (!isCacheableMethod(options.method)) {
    const pathPrefix = `${API_BASE_URL}${path}`;
    for (const [key] of cache) {
      if (key === pathPrefix || key.startsWith(`${pathPrefix}?`)) {
        cache.delete(key);
      }
    }
  }

  return payload as T;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (isCacheableMethod(options.method)) {
    const cacheKey = getCacheKey(path, options);

    if (cacheKey) {
      const cached = cache.get(cacheKey);

      if (cached && cached.expiresAt > Date.now()) {
        return cached.value as T;
      }

      const inflight = inflightRequests.get(cacheKey);

      if (inflight) {
        return inflight as Promise<T>;
      }

      const requestPromise = (async () => {
        try {
          return await executeRequest<T>(path, options);
        } finally {
          inflightRequests.delete(cacheKey);
        }
      })();

      inflightRequests.set(cacheKey, requestPromise);

      try {
        const result = await requestPromise;

        cache.set(cacheKey, {
          value: result,
          expiresAt: Date.now() + CACHE_TTL,
        });

        return result;
      } catch (error) {
        inflightRequests.delete(cacheKey);
        throw error;
      }
    }
  }

  return executeRequest<T>(path, options);
}
