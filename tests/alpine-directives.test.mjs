// Alpine-directive lint: Alpine stays out of Docsy's public API surface.
// Core layouts carry no Alpine directives (x-data, x-on/@…, x-show, …) —
// the same boundary the framework-classes lint draws for Bootstrap class
// names. Directive markup is allowed only in plugin-owned partials: files
// that ship with an opt-in JS plugin and are emitted only when that plugin
// is enabled. A deliberate lint, not a boundary (per the repo's runner-lint
// stance): computed attribute names are review's job.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const layoutsRoot = path.join(repoRoot, 'theme/layouts');

// Markup shipped by an opt-in plugin (its registry entry's partial), not by
// core: the one place Alpine directives may appear.
const PLUGIN_OWNED = new Set(['_partials/scripts/search-modal.html']);

// Alpine directive attributes as written in markup: x-* directives and the
// x-on @shorthand. Word-ish boundary on the left so tokens like `max-data=`
// don't match; the @shorthand requires a preceding whitespace to skip email
// addresses and CSS at-rules in inline styles.
const DIRECTIVE =
  /(^|[\s"'<])(x-(data|on|show|model|text|html|bind|init|ref|cloak|if|for|transition|effect|teleport|id|trap)\b|@[a-z][\w.:-]*\s*=)/;

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
  });

test('alpine-directive lint: core layouts carry no Alpine directives', () => {
  // Self-test: a dead regex plus an empty allowlist would stay green forever.
  assert.ok(
    DIRECTIVE.test('<div x-data="widget" @click.self="close()">'),
    'the directive pattern recognizes x-data and @shorthand forms',
  );
  assert.ok(
    !DIRECTIVE.test('<a href="mailto:x@y.z" data-x="1" max-data="2">'),
    'emails and data-* attributes are not flagged',
  );

  const layouts = walk(layoutsRoot);
  assert.ok(layouts.length > 50, 'the layouts tree was scanned');

  let pluginOwnedSeen = 0;
  for (const file of layouts) {
    const rel = path.relative(layoutsRoot, file);
    if (PLUGIN_OWNED.has(rel)) {
      pluginOwnedSeen += 1;
      continue;
    }
    const offending = fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line, i) =>
        DIRECTIVE.test(line) ? [`${i + 1}: ${line.trim()}`] : [],
      );
    assert.deepEqual(
      offending,
      [],
      `${rel} is Alpine-free (directives live in plugin-owned markup only)`,
    );
  }
  assert.equal(
    pluginOwnedSeen,
    PLUGIN_OWNED.size,
    'every allowlisted plugin-owned partial exists',
  );
});
