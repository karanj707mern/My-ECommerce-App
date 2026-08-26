/**
 * End-to-end API probes — run against a REAL boot of the production pipeline.
 *
 * Replaces the former Jest-based `test/app.e2e-spec.ts`: under Jest's VM,
 * NestJS's FastifyAdapter synthesizes partial route contexts that crash real
 * requests (see scripts/smoke-boot.mjs for the full analysis). Plain Node
 * exercises the exact production path.
 *
 * Usage (after `nx build @moringa/backend`, infra running):
 *   node scripts/e2e.mjs
 *
 * Probes are deliberately non-mutating: they verify request routing, auth
 * guards, and error contracts without writing to the database.
 *
 * Exits 0 when every probe passes, 1 on the first hard failure.
 */
import { createApp } from '../dist/app.create.js';

const probes = [];

function record(name, fn) {
  probes.push({ name, fn });
}

record('health returns ok/degraded with dependency checks', async (base) => {
  const res = await fetch(`${base}/api/v1/health`);
  if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
  const body = await res.json();
  if (!['ok', 'degraded'].includes(body.status)) {
    throw new Error(`unexpected status: ${body.status}`);
  }
});

record('login rejects unknown credentials with 401', async (base) => {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong-password' }),
  });
  if (res.status !== 401) {
    throw new Error(`expected 401 for invalid credentials, got ${res.status}`);
  }
});

record('session without cookies reports unauthenticated', async (base) => {
  const res = await fetch(`${base}/api/v1/auth/session`);
  if (res.status !== 200) throw new Error(`expected 200 envelope, got ${res.status}`);
  const body = await res.json();
  if (body.authenticated !== false) {
    throw new Error(`expected authenticated:false, got ${JSON.stringify(body)}`);
  }
});

record('product listing returns 200', async (base) => {
  const res = await fetch(`${base}/api/v1/product`);
  if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
});

record('guarded profile endpoint rejects anonymous access', async (base) => {
  const res = await fetch(`${base}/api/v1/auth/profile`);
  if (res.status !== 401) {
    throw new Error(`expected 401 for anonymous /auth/profile, got ${res.status}`);
  }
});

record('unknown route yields structured 404', async (base) => {
  const res = await fetch(`${base}/api/v1/definitely-not-a-route`);
  if (res.status !== 404) throw new Error(`expected 404, got ${res.status}`);
});

let failed = 0;
let app;
try {
  ({ app } = await createApp({ websocket: false }));
  await app.init();
  await app.listen(0, '127.0.0.1');

  const address = app.getHttpAdapter().getInstance().server.address();
  const base = `http://127.0.0.1:${address.port}`;
  console.log(`e2e target: ${base}\n`);

  for (const { name, fn } of probes) {
    try {
      await fn(base);
      console.log(`✓ ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`✗ ${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} catch (error) {
  console.error('Boot failure:', error);
  process.exit(1);
} finally {
  if (app) {
    await app.close().catch(() => {});
  }
}

if (failed > 0) {
  console.error(`\n${failed} e2e probe(s) failed`);
  process.exit(1);
}
console.log('\nAll e2e probes passed');
