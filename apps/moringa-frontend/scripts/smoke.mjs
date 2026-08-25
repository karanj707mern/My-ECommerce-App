/**
 * Production-artifact route smoke test.
 *
 * Boots the REAL built SSR bundle (dist/smoke + dist client chunks) on an
 * ephemeral localhost port and asserts the served HTML for key routes.
 * This is the runtime verification layer that unit tests cannot provide:
 * it exercises the actual Qwik City router, catch-all 404 registration,
 * loaders and SSR streaming end-to-end.
 *
 * Usage: npm run smoke   (builds the smoke entry, boots, asserts, exits)
 */
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");

/** Production mode so SSR behaves exactly like a deployment. */
process.env.NODE_ENV = "production";

const smokeModule = await import(
  path.join(appRoot, "dist/smoke/entry.smoke.mjs")
);
// entry.smoke.tsx default-exports the createQwikCity middleware bundle.
const { router, notFound } = smokeModule.default ?? smokeModule;

const server = http.createServer((req, res) => {
  let done = false;
  const next = () => {
    if (!done) {
      done = true;
      res.statusCode = 500;
      res.end("smoke: middleware chain fell through");
    }
  };
  router(req, res, () => notFound(req, res, next));
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();

async function fetchPage(pathname) {
  const res = await fetch(`http://127.0.0.1:${port}${pathname}`);
  return { status: res.status, html: await res.text() };
}

let failures = 0;
function expectContains(label, html, needle) {
  if (!html.includes(needle)) {
    failures++;
    console.error(`✗ ${label}: missing "${needle}"`);
  } else {
    console.log(`✓ ${label}: "${needle}"`);
  }
}

try {
  // --- Home ---------------------------------------------------------------
  const home = await fetchPage("/");
  console.log(`\n[home] status=${home.status}`);
  if (home.status !== 200) {
    failures++;
    console.error("✗ home: expected HTTP 200");
  }
  for (const marker of [
    "Pure moringa for everyday wellness", // hero badge
    "Earn points with every purchase", // rewards banner
    "Why This Store Works", // stats section
    "Browse a fuller moringa collection", // products grid
    "Skip to main content", // a11y skip link
  ]) {
    expectContains("home", home.html, marker);
  }

  // --- Catch-all 404 ------------------------------------------------------
  const missing = await fetchPage("/definitely/not/a/real/page");
  console.log(`\n[404] status=${missing.status}`);
  for (const marker of [
    "Oops! Page not found",
    "Popular destinations",
    'href="/shop"',
    "Track your order",
    'aria-label="Toggle theme"',
  ]) {
    expectContains("404", missing.html, marker);
  }

  // --- Known nested route sanity ------------------------------------------
  const shop = await fetchPage("/shop");
  console.log(`\n[shop] status=${shop.status}`);
  if (shop.status !== 200) {
    failures++;
    console.error("✗ shop: expected HTTP 200");
  }
} finally {
  server.close();
}

console.log(
  failures === 0
    ? "\nSMOKE PASS — all routes rendered through the built SSR bundle"
    : `\nSMOKE FAIL — ${failures} assertion(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
