/**
 * WHAT IS THIS FILE?
 *
 * Browser-plane ("web") typed API client for the Moringa storefront.
 *
 * Wraps the auto-generated Nestia SDK (`@moringa/sdk`, built from backend
 * controllers on `@nestia/fetcher@^13`) with a connection configured for the
 * BROWSER: credentials included so HttpOnly auth cookies flow to the API,
 * base URL resolved from the environment, and standard headers attached.
 *
 * For SERVER-side data fetching inside Qwik City loaders/actions use
 * `lib/api/sdk-server.ts` instead — it forwards the incoming request's cookies
 * and correlation headers so JWTs never have to exist in client JavaScript.
 *
 * Consumers import `api` and call e.g.
 *   const page = await api.functional.cart.findAll(connection);
 * Every request/response is fully typed by the generated contract.
 */
import type { IConnection } from "@nestia/fetcher";
import * as sdkModule from "@moringa/sdk";
import { env } from "../env";

/**
 * The generated contract tree: `api.functional.<controller>.<method>`.
 *
 * The SDK's root module wraps everything under an `api` namespace
 * (`export * as api from "./api"`), so we unwrap it HERE once — call sites
 * keep the flat, generator-documented `api.functional.*` convention.
 */
export const api = sdkModule.api;

// Full root module (connection factories + api namespace), for advanced use.
export const generated = sdkModule;
export type GeneratedSdk = typeof sdkModule;

/**
 * Resolves the API base URL for the browser plane.
 *
 * Precedence mirrors legacy `http.ts` so the typed SDK and any remaining
 * raw-fetch callers stay in sync:
 *   VITE_API_BASE_URL -> dev/localhost:5000 -> same-origin `/api/v1`.
 *
 * SECURITY NOTE: in dev the direct cross-origin host is used because Fastify
 * already emits permissive CORS+credentials headers for localhost. In
 * production the default is the SAME-ORIGIN path (`/api/v1`), which is what
 * makes `SameSite=Strict` auth cookies work behind the edge proxy.
 */
export function resolveApiBaseUrl(): string {
  const explicit = env.apiBaseUrl();
  if (explicit) return explicit;

  if (
    env.isDev() ||
    (typeof window !== "undefined" && window.location.hostname === "localhost")
  ) {
    return "http://localhost:5000/api/v1";
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/v1`;
  }

  return "http://localhost:5000/api/v1";
}

/**
 * Builds a connection object for the Nestia SDK's browser plane.
 *
 * `@nestia/fetcher` v13 spreads `connection.options` into every `fetch`
 * RequestInit (verified against FetcherBase), so `credentials: "include"`
 * reliably carries the HttpOnly `accessToken`/`refreshToken` cookies set by
 * the backend's AuthCookiesService.
 */
export function createConnection(): IConnection {
  return {
    host: resolveApiBaseUrl(),
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    options: {
      credentials: "include",
    },
  };
}

/**
 * Pre-configured API client.
 *
 * Usage:
 *   import { connection, api } from "../lib/api/client";
 *   const cart = await api.functional.cart.findAll(connection);
 */

/** The shared browser-plane connection used by all SDK calls. */
export const connection = createConnection();

export default api;
