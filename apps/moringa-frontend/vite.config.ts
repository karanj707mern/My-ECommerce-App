/**
 * Vite 6 pipeline for the Qwik City storefront.
 *
 * PLUGIN ORDER CONTRACT
 * ---------------------
 * qwikCity() MUST precede qwikVite(): route modules are transformed to QRL
 * chunks before the optimizer analyses entries. Tailwind CSS v4 runs as a
 * NATIVE Vite plugin (@tailwindcss/vite) — there is no PostCSS chain and no
 * tailwind.config.js; design tokens live in `src/global.css` under @theme and
 * plain CSS custom properties, compiled by the Rust/Lightning engine.
 *
 * NO TYPESCRIPT TRANSFORMERS
 * --------------------------
 * The regenerated SDK (`@moringa/sdk`) ships plain types plus PlainFetcher
 * runtime calls, so nothing in the client graph requires AOT typia transforms;
 * backend-only Nestia/typia transforms run inside apps/moringa-backend via
 * ts-patch. This keeps the client toolchain pure-esbuild/Rollup and fast.
 *
 * CODE-SPLITTING STANCE
 * ---------------------
 * Splitting is owned by the Qwik optimizer: every route, loader and event
 * handler ($-wrapped) becomes its own lazy QRL chunk, which is why checkout,
 * product detail and catalog pages already ship as separate units WITHOUT any
 * hand-written manualChunks — a rollup-level vendor map would fight QRL entry
 * analysis and re-bundle eagerly-executed code (the anti-pattern Qwik exists
 * to eliminate). Third-party heavies (socket.io-client) are still isolated by
 * the optimizer on first dynamic import from `useProductViewers`/gateways.
 *
 * CACHING CONTRACT
 * ----------------
 * `/build/*` assets are content-hashed => immutable forever. HTML and q-data
 * responses must never be cached. Dev disables caching entirely; preview and
 * production serving layers enforce the split below (see immutableHeaders).
 */
import path from "node:path";
import type { Plugin } from "vite";
import { defineConfig, type UserConfig } from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikCity } from "@builder.io/qwik-city/vite";
import tailwindcss from "@tailwindcss/vite";

/**
 * Nx runs package scripts with the owning project's directory as cwd
 * (`nx run moringa-frontend:<target>` => apps/moringa-frontend), so
 * process.cwd() is a deterministic anchor for absolute alias targets without
 * touching `import.meta.url` (banned outside src/lib/env.ts by the NodeNext
 * seam policy).
 */
const projectRoot = process.cwd();
const monorepoRoot = path.resolve(projectRoot, "../..");

/** Absolute path helper for workspace-linked packages consumed as source. */
const fromRoot = (relative: string): string =>
  path.join(monorepoRoot, relative);

/**
 * Cache headers for hashed build output. Applied by the preview middleware
 * below; production edge/origin servers must apply the identical policy so
 * CDN TTLs match asset hashes across deployments.
 */
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

/**
 * Preview-server middleware implementing the caching contract. Kept inline
 * because it is ~15 lines; extracting a plugin package for this would be
 * ceremony without behavioural gain.
 */
function immutableBuildAssets(): Plugin {
  return {
    name: "moringa:immutable-build-assets",
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/build/") || req.url?.startsWith("/assets/")) {
          res.setHeader("Cache-Control", IMMUTABLE_CACHE_CONTROL);
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }): UserConfig => {
  // Internal Fastify origin used by the dev proxy and (via API_ORIGIN) by SSR
  // loaders/actions when they call the backend server-to-server.
  const apiOrigin = process.env.API_ORIGIN ?? "http://127.0.0.1:5000";

  return {
    plugins: [qwikCity(), qwikVite(), tailwindcss(), immutableBuildAssets()],

    resolve: {
      alias: [
        // Exact-specifier + subpath aliases pin the linked SDK and shared
        // domain contracts to their TypeScript sources, bypassing node_modules
        // symlink probing and keeping HMR live across workspace edits.
        {
          find: /^@moringa\/sdk$/,
          replacement: fromRoot("libs/sdk/src/index.ts"),
        },
        {
          find: /^@moringa\/sdk\/(.+)$/,
          replacement: `${fromRoot("libs/sdk/src")}/$1`,
        },
        {
          find: /^@moringa\/shared$/,
          replacement: fromRoot("libs/shared/src/index.ts"),
        },
        {
          find: /^@moringa\/shared\/(.+)$/,
          replacement: `${fromRoot("libs/shared/src")}/$1`,
        },
      ],
    },

    /* Build-time environment contract: only VITE_-prefixed variables are ever
     * inlined into client bundles; server secrets stay in process.env on the
     * SSR plane and never enter the public graph. */
    envPrefix: ["VITE_"],

    optimizeDeps: {
      include: [
        "@nestia/fetcher",
        "socket.io-client",
      ],
    },

    ssr: {
      // Workspace packages are raw-TS sources: force-inline them into the SSR
      // bundle instead of leaving them external to Node require().
      noExternal: [/^@moringa\//],
    },

    build: {
      target: "es2022",
      outDir: "dist",
      // Qwik's optimizer owns code-splitting (per-route + per-component QRL
      // chunks). Hand-rolled manualChunks fights its entry analysis, so we
      // tune size reporting and inline thresholds instead.
      reportCompressedSize: false,
      assetsInlineLimit: 4096,
      // "hidden" in production: maps are emitted for error-tracking ingestion
      // (e.g. Sentry) but no sourceMappingURL comment is exposed publicly.
      sourcemap: mode === "production" ? "hidden" : true,
    },

    server: {
      headers: { "Cache-Control": "public, max-age=0" },
      fs: {
        strict: true,
        // Linked workspace packages (libs/sdk, libs/shared) are served as
        // source; allow the monorepo root explicitly so parallel `nx run-many`
        // invocations never fall out of the served graph.
        allow: [monorepoRoot],
      },
      watch: {
        ignored: ["**/dist/**", "**/node_modules/**", "**/.qwik/**"],
      },
      proxy: {
        // Same-origin /api pathing during development: mirrors the production
        // edge topology where the storefront origin reverse-proxies the API.
        // Required for SameSite=Strict auth cookies when clients opt into
        // relative base URLs via VITE_API_BASE_URL=/api/v1.
        "/api": {
          target: apiOrigin,
          changeOrigin: true,
          ws: false,
        },
      },
    },

    preview: {
      headers: { "Cache-Control": "public, max-age=600" },
      port: Number(process.env.FRONTEND_PREVIEW_PORT ?? 4173),
    },
  };
});
