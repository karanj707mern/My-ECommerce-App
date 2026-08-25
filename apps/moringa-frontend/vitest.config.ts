/**
 * Vitest pipeline for the storefront's unit-test tier.
 *
 * Scope: pure logic modules (`lib/*`, hooks' pure helpers). These tests do
 * NOT need the Qwik optimizer — component/QRL behaviour is covered by the
 * production-artifact smoke script (`npm run smoke`, see scripts/), which
 * renders routes through the real built SSR bundle instead of re-transforming
 * source under a second toolchain.
 *
 * The SDK / shared path aliases mirror `vite.config.ts` because vitest does
 * not read tsconfig `paths`.
 */
import path from "node:path";
import { defineConfig } from "vitest/config";

const projectRoot = process.cwd();
const monorepoRoot = path.resolve(projectRoot, "../..");
const fromRoot = (relative: string): string =>
  path.join(monorepoRoot, relative);

export default defineConfig({
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
    alias: [
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
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
