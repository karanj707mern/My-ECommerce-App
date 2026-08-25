/**
 * Rewrites TypeScript path aliases (@/, @moringa/backend/) in emitted CJS
 * under dist/ into correct relative requires.
 *
 * Why this exists: the production build runs through tspc (ts-patch's
 * in-memory patched compiler) so Typia/Nestia AOT transforms execute.
 * typescript-transform-paths does not apply in that pipeline, so aliased
 * specifiers survive into emit where Node cannot resolve them. This pass
 * closes the gap deterministically after every build.
 *
 * Run automatically as part of `npm run build`.
 */
const fs = require('node:fs');
const path = require('node:path');

const DIST = path.join(__dirname, '..', 'dist');
const SRC = path.join(__dirname, '..', 'src');

const ALIAS_RE = /require\("(?:@\/|@moringa\/backend\/)([^"]+)"\)/g;

function rewriteFile(file) {
  const code = fs.readFileSync(file, 'utf8');
  let touched = false;

  const next = code.replace(ALIAS_RE, (_match, target) => {
    // tsc only emits requires for modules it RESOLVED at typecheck time,
    // so dist/<target>.js is guaranteed to exist — no filesystem probe needed.
    const absoluteTarget = path.join(DIST, target);
    let rel = path.relative(path.dirname(file), absoluteTarget).replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = './' + rel;
    touched = true;
    return `require("${rel}")`;
  });

  if (touched) {
    fs.writeFileSync(file, next);
    return true;
  }
  return false;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

let count = 0;
for (const file of walk(DIST)) {
  if (rewriteFile(file)) count += 1;
}
console.log(`[fix-dist-aliases] rewrote ${count} file(s)`);
