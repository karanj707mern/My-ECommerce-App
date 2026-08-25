/**
 * WHAT IS THIS FILE?
 *
 * Server-plane integration seam between Qwik City loaders/actions and the
 * generated Nestia SDK (`@moringa/sdk`). While `lib/api/client.ts` serves the
 * BROWSER plane, everything in this module runs exclusively on the server
 * inside `routeLoader$` / `routeAction$` / `server$` functions.
 *
 * SECURITY MODEL (server-to-client token propagation)
 * ---------------------------------------------------
 * Auth JWTs live ONLY in HttpOnly cookies set by the backend
 * (`accessToken` 1h, `refreshToken` 7d, SameSite=Strict — see the backend's
 * AuthCookiesService). This module implements secure propagation WITHOUT ever
 * exposing a token to client JavaScript:
 *
 *   1. The incoming browser request's raw `Cookie` header is forwarded
 *      VERBATIM to Fastify on the internal network. No parsing means no
 *      drift when the backend adds cookies (csrf-token, guest carts).
 *   2. The Fastify passport extractor reads `accessToken` straight from that
 *      cookie — no Authorization header is manufactured, so tokens cannot leak
 *      into logs or error serializers the way header-based propagation risks.
 *   3. Responses flow back through Qwik City's serialization: loaders return
 *      DATA, never connections, headers or credentials.
 *
 * RESILIENCE CONTRACT
 * -------------------
 * Every call is wrapped by `invokeSdk`: hard timeouts via AbortSignal
 * (forwarded through `IConnection.options`, which @nestia/fetcher v13 spreads
 * into fetch's RequestInit), exponential backoff with jitter for idempotent
 * verbs, and normalization of raw failures into a typed `ApiError` union so
 * route components render deterministic states instead of leaking stack traces.
 *
 * OBSERVABILITY
 * -------------
 * Each hop carries an `x-request-id` (generated per request event, or adopted
 * from the inbound edge header), giving end-to-end correlation across
 * storefront -> API -> logs.
 */
import type { IConnection } from "@nestia/fetcher";
import { HttpError } from "@nestia/fetcher";

/** Absolute base URL of the backend for SERVER-to-SERVER calls. */
const DEFAULT_API_ORIGIN = "http://127.0.0.1:5000/api/v1";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 150;

/** Error taxonomy every route can branch on without importing transport types. */
export type ApiErrorKind =
  | "http" // non-2xx response from Fastify
  | "network" // socket/DNS/connection refused
  | "timeout" // abort deadline exceeded
  | "unknown"; // programming errors, unexpected shapes

/**
 * Normalized failure surfaced to routes. `payload` retains the RFC-style body
 * Fastify produced ({ statusCode, message, error }) so UI copy can react to
 * domain messages (e.g. "Insufficient stock") without string matching.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly payload: unknown;

  constructor(kind: ApiErrorKind, message: string, status?: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.payload = payload ?? null;
  }
}

/** Minimal structural view of a Qwik City RequestEvent used by this seam. */
export interface ServerRequestLike {
  headers: Headers;
}

interface ServerConnectionInput {
  /** Incoming request event whose cookies/headers are forwarded. */
  event: ServerRequestLike;
  /** Hard deadline applied to calls made over this connection. */
  timeoutMs?: number;
}

function resolveServerApiBaseUrl(): string {
  const explicit = process.env.API_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const origin = process.env.API_ORIGIN?.trim();
  if (origin) return `${origin.replace(/\/$/, "")}/api/v1`;

  return DEFAULT_API_ORIGIN;
}

function resolveRequestId(event: ServerRequestLike): string {
  return (
    event.headers.get("x-request-id") ??
    (globalThis.crypto?.randomUUID?.() ?? `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)
  );
}

/**
 * Builds an SDK connection bound to ONE incoming request.
 *
 * Call this INSIDE each loader/action (per-request freshness); never hoist it
 * to module scope — a shared connection would cross-wire cookies between
 * concurrent users on the streaming SSR server.
 */
export function createServerConnection(input: ServerConnectionInput): IConnection {
  const { event, timeoutMs = DEFAULT_TIMEOUT_MS } = input;

  const cookie = event.headers.get("cookie");
  const requestId = resolveRequestId(event);

  const headers: Record<string, string> = {
    accept: "application/json",
    // Correlation id propagated end-to-end for audit trails.
    "x-request-id": requestId,
  };
  // Verbatim forwarding preserves accessToken/refreshToken/csrf/guest cookies
  // exactly as the issuing authority wrote them.
  if (cookie) {
    headers.cookie = cookie;
  }

  return {
    host: resolveServerApiBaseUrl(),
    headers,
    options: {
      // Forwarded into fetch RequestInit by @nestia/fetcher v13 (FetcherBase):
      // gives every call a hard deadline instead of relying on socket defaults.
      signal: AbortSignal.timeout(timeoutMs),
    },
  };
}

/** True when err is a non-2xx response raised by the generated fetcher. */
export function isRemoteHttpError(err: unknown): err is HttpError {
  return err instanceof HttpError;
}

/** Converts any thrown value into the normalized ApiError taxonomy. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (isRemoteHttpError(err)) {
    const body = (() => {
      try {
        return err.toJSON<unknown>()?.message ?? null;
      } catch {
        return null;
      }
    })();
    const detail =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message: unknown }).message)
        : `${err.status} ${err.path}`;
    return new ApiError("http", detail, err.status, body);
  }

  if (err instanceof DOMException && err.name === "TimeoutError") {
    return new ApiError("timeout", "The API did not respond in time.", 504);
  }
  if (err instanceof DOMException && err.name === "AbortError") {
    return new ApiError("timeout", "Request aborted.", 499);
  }
  if (err instanceof TypeError) {
    // undici/Node fetch raises TypeError for DNS/socket-level failures.
    return new ApiError("network", "The API is unreachable.");
  }
  if (err instanceof Error) {
    return new ApiError("unknown", err.message);
  }
  return new ApiError("unknown", "Unexpected API failure.");
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Full-jitter exponential backoff: 150ms -> 300ms -> 600ms (±40%). */
function backoffDelay(attempt: number): number {
  const ceiling = BASE_BACKOFF_MS * 2 ** attempt;
  return Math.round(ceiling * (0.6 + 0.8 * Math.random()));
}

function isRetryable(err: ApiError): boolean {
  return (
    err.kind === "network" ||
    err.kind === "timeout" ||
    (err.kind === "http" && (err.status ?? 500) >= 500)
  );
}

export interface InvokeOptions {
  /**
   * Retry ONLY idempotent operations. Defaults to false so a retried POST can
   * never double-charge or duplicate an order; pass true for reads.
   */
  idempotent?: boolean;
  /** Total attempt budget including the first call. Default 3. */
  attempts?: number;
  /** Per-attempt deadline in ms. Default 15_000. */
  timeoutMs?: number;
}

/**
 * Executes one SDK call with timeout, retry and error normalization applied.
 *
 * Usage inside a routeLoader$:
 *
 *   const connection = createServerConnection({ event });
 *   const heroes = await invokeSdk(
 *     () => api.functional.hero.findAll(connection),
 *     { idempotent: true },
 *   );
 */
export async function invokeSdk<T>(
  call: () => Promise<T>,
  options: InvokeOptions = {},
): Promise<T> {
  const budget = options.idempotent ? (options.attempts ?? DEFAULT_ATTEMPTS) : 1;
  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt < budget; attempt++) {
    try {
      return await call();
    } catch (err) {
      lastError = toApiError(err);
      const canRetry =
        attempt + 1 < budget && options.idempotent === true && isRetryable(lastError);
      if (!canRetry) break;
      await sleep(backoffDelay(attempt));
    }
  }

  throw lastError ?? new ApiError("unknown", "API call failed without an error object.");
}
