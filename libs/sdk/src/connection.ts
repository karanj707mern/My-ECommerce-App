/**
 * Browser/SSR-safe connection factory for the generated Nestia client.
 *
 * Host precedence mirrors legacy http.ts so both layers stay in sync:
 *   VITE_API_BASE_URL -> dev/localhost:5000 -> same-origin /api/v1.
 *
 * NODENEXT NOTE: this package is type-checked inside the frontend program
 * under `module/moduleResolution: NodeNext` with no `"type": "module"`, so
 * source files analyze as CommonJS-flavoured units and raw `import.meta`
 * access triggers TS1470. Vite replaces `import.meta.env` at build time, so
 * the two reads below use the same quarantined-cast pattern as the
 * frontend's `src/lib/env.ts` seam (self-healing via @ts-expect-error).
 */
import type { IConnection } from "@nestia/fetcher";

interface SdkViteEnv {
  readonly DEV?: boolean;
  readonly PROD?: boolean;
  readonly VITE_API_BASE_URL?: string;
}

/**
 * Read the Vite-injected environment.
 *
 * CRITICAL SHAPE CONSTRAINT: every access MUST be a fully static member
 * expression (`import.meta.env.KEY`). Wrapping `import.meta` in a cast makes
 * the access dynamic, which Vite's SSR module runner refuses at runtime
 * ("Dynamic access of import.meta.env is not supported") even though tsc and
 * rollup both pass. Static chains are replaced textually by Vite in BOTH the
 * client bundle and the Qwik City SSR/SSG pipelines.
 */
function viteEnv(): Partial<SdkViteEnv> {
  return {
    // @ts-expect-error -- TS1470 under NodeNext/CJS analysis; see above.
    DEV: import.meta.env.DEV,
    // @ts-expect-error -- TS1470 under NodeNext/CJS analysis; see above.
    PROD: import.meta.env.PROD,
    // @ts-expect-error -- TS1470 under NodeNext/CJS analysis; see above.
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  };
}

function trimTrailingSlash(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/$/, "") : undefined;
}

export function resolveApiBaseUrl(): string {
  const explicit = trimTrailingSlash(viteEnv().VITE_API_BASE_URL);
  if (explicit) return explicit;

  const isDev =
    viteEnv().DEV === true ||
    (typeof window !== "undefined" &&
      window.location.hostname === "localhost");

  if (isDev) return "http://localhost:5000/api/v1";
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/v1`;
  }
  return "http://localhost:5000/api/v1";
}

export function createConnection(): IConnection {
  return {
    host: resolveApiBaseUrl(),
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    options: { credentials: "include" },
  };
}
