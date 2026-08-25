/**
 * WHAT IS THIS FILE?
 *
 * The single, quarantined seam for compile-time environment access.
 * Every `import.meta.env.*` read in the application is centralised here and
 * re-exported as typed accessors. Application code imports from this module
 * and must never touch `import.meta` directly (enforced by ESLint).
 *
 * WHY THE QUIRK (`@ts-expect-error`) EXISTS:
 *
 * This package intentionally omits `"type": "module"` so that, under
 * `module/moduleResolution: NodeNext`, every `.ts/.tsx` file is analysed as a
 * CommonJS-flavoured compilation unit — bit-for-bit symmetric with the NestJS
 * backend's `module: commonjs` emit. That symmetry keeps extensionless
 * relative imports valid across ~200 existing files and makes cross-project
 * type checking of `@moringa/sdk` sources deterministic.
 *
 * The trade-off: TypeScript rejects `import.meta` inside files it believes
 * will build to CommonJS (TS1470). Vite statically substitutes
 * `import.meta.env.*` at build time, so the token never survives into shipped
 * JS — the error is a false positive against the real pipeline output. It is
 * suppressed at exactly ONE location with `@ts-expect-error`, which self-heals
 * if TypeScript ever relaxes the restriction (the directive then flags itself).
 */

/**
 * The subset of Vite's statically-replaced environment that the storefront
 * consumes. All entries are build-time constants; none exist at runtime
 * unless replaced by Vite's define pass.
 */
interface ViteEnv {
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean | undefined;
  readonly VITE_API_BASE_URL: string | undefined;
  readonly VITE_SITE_URL: string | undefined;
  readonly VITE_CLOUDINARY_CLOUD_NAME: string | undefined;
  readonly VITE_GOOGLE_CLIENT_ID: string | undefined;
}

function raw(): Partial<ViteEnv> {
  // @ts-expect-error -- TS1470 under NodeNext/CJS analysis. Vite replaces
  // `import.meta.env` textually before any bundle ships; see module docs.
  const meta = import.meta as unknown as { env?: Partial<ViteEnv> };
  return meta.env ?? {};
}

function trim(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Typed, SSR-safe environment access for the Moringa storefront.
 *
 * Every accessor is a function (not a top-level constant) so that call sites
 * evaluate lazily: Qwik serialises component state into the HTML payload, and
 * eagerly-captured module constants would bake dev/prod values into the wrong
 * bundle when both client and server entry points import this module.
 */
export const env = {
  /** Vite mode, e.g. "development" | "production" | "ssg". */
  mode(): string {
    return raw().MODE ?? "production";
  },

  /** True only in the Vite dev server pipeline. */
  isDev(): boolean {
    return raw().DEV ?? false;
  },

  /** True in production builds (`mode === "production"`). */
  isProd(): boolean {
    return raw().PROD ?? true;
  },

  /** Explicit API base URL override (`VITE_API_BASE_URL`), if provided. */
  apiBaseUrl(): string | undefined {
    return trim(raw().VITE_API_BASE_URL);
  },

  /**
   * Canonical public origin of the storefront (`VITE_SITE_URL`), used for SEO
   * canonicals and OG tags. Undefined means "fall back to the configured
   * production domain".
   */
  siteUrl(): string | undefined {
    const value = trim(raw().VITE_SITE_URL);
    return value ? value.replace(/\/$/, "") : undefined;
  },

  /** Cloudinary cloud name for asset URL composition. */
  cloudinaryCloudName(): string | undefined {
    return trim(raw().VITE_CLOUDINARY_CLOUD_NAME);
  },

  /** Google Identity Services OAuth client id for the auth page. */
  googleClientId(): string | undefined {
    return trim(raw().VITE_GOOGLE_CLIENT_ID);
  },
} as const;

export type Env = typeof env;
