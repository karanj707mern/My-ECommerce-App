/**
 * Boot smoke test — runs the REAL production pipeline end-to-end.
 *
 * Replaces the former Jest-based `app.controller.spec.ts`: under Jest's VM,
 * NestJS's FastifyAdapter `reply()` synthesizes a partial kRouteContext
 * (without `preParsing`) for native responses, and the VM's module isolation
 * makes real requests crash inside fastify's hook runner. Plain Node has no
 * such artifact, and production is verified healthy through this exact path.
 *
 * Usage (after `nx build @moringa/backend`):
 *   node scripts/smoke-boot.mjs
 *
 * Exits 0 when every probe passes, 1 on the first failure.
 */
import { createApp } from '../dist/app.create.js';

const probes = [];

function record(name, fn) {
  probes.push({ name, fn });
}

record('health returns ok/degraded with checks', async (base) => {
  const res = await fetch(`${base}/api/v1/health`);
  if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
  const body = await res.json();
  if (!['ok', 'degraded'].includes(body.status)) {
    throw new Error(`unexpected status: ${body.status}`);
  }
  if (!body.checks?.database || typeof body.timestamp !== 'string') {
    throw new Error('malformed health payload');
  }
});

record('liveness probe returns alive', async (base) => {
  const res = await fetch(`${base}/api/v1/health/live`);
  if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
  const body = await res.json();
  if (body.status !== 'alive') throw new Error(`unexpected body: ${JSON.stringify(body)}`);
});

record('unknown route yields structured 404', async (base) => {
  const res = await fetch(`${base}/api/v1/definitely-not-a-route`);
  if (res.status !== 404) throw new Error(`expected 404, got ${res.status}`);
});

record('security headers present (helmet)', async (base) => {
  const res = await fetch(`${base}/api/v1/health/live`);
  if (!res.headers.get('x-frame-options') && !res.headers.get('content-security-policy')) {
    throw new Error('no helmet security headers on response');
  }
});

record('fastify plugins registered (helmet, compress, rate-limit, cookie, multipart)', () => {
  const fastify = app.getHttpAdapter().getInstance();
  // Names verified via fastify.printPlugins() — they are the package names.
  const required = ['@fastify/helmet', '@fastify/compress', '@fastify/rate-limit', '@fastify/cookie', '@fastify/multipart'];
  const missing = required.filter((name) => !fastify.hasPlugin(name));
  if (missing.length > 0) {
    throw new Error(`missing plugins: ${missing.join(', ')}`);
  }
});

let failed = 0;
let app;
try {
  ({ app } = await createApp({ websocket: false }));
  await app.init();
  await app.listen(0, '127.0.0.1');

  const address = app.getHttpAdapter().getInstance().server.address();
  const base = `http://127.0.0.1:${address.port}`;

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
  console.error(`\n${failed} probe(s) failed`);
  process.exit(1);
}
console.log('\nAll boot smoke probes passed');
