// Per-page-gating determinism (alpine-plugin spike, step 0). Hugo's
// partialCached with no variant key caches the first execution's output under
// the partial *name* (tpl/partials: partialCacheKey.Key returns Name for nil
// variants) — one result for the whole site. scripts.html emits
// per-page-varying output (.Page.Store gates: hasmermaid, hasMath, plugin
// pageGate), so a variant-less `partialCached "scripts.html" .` poisons every
// page with whichever page rendered first (proven red: the gated page below
// lost its plugin script). The docs/blog/swagger baseofs already call plain
// `partial "scripts.html"`; only the root baseof cached. This test pins the
// fix by exercising pages that resolve through the root baseof (no docs/blog
// section): exactly one page sets a Store flag that gates a plugin, with
// ungated siblings on both sides so first-execution caching would poison the
// result in either direction.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSite } from './lib/build-site.mjs';

test('Store-gated plugin emission is per-page on root-baseof pages', () => {
  const files = {
    'content/_index.md': '---\ntitle: Home\n---\nHome body\n',
    'layouts/_shortcodes/set-hello-flag.html':
      '{{ .Page.Store.Set "hasHello" true }}',
    'assets/js/plugins/hello.js': "console.log('hello-plugin');\n",
  };
  for (const c of 'abcdefghij') {
    files[`content/misc/page-${c}.md`] =
      `---\ntitle: Page ${c}\n---\nPlain page ${c}\n`;
  }
  files['content/misc/page-m-gated.md'] =
    '---\ntitle: Gated\n---\n{{< set-hello-flag >}}\nUses the feature\n';

  const r = buildSite('partial-cached-gating', {
    files,
    title: 'Docsy caching probe fixture',
    extraConfig: `params:
  docsy:
    jsPlugins:
      - name: hello
        pageGate: hasHello
`,
  });
  assert.equal(r.status, 0, `hugo build succeeds:\n${r.stderr}`);

  assert.match(
    r.publicFile('misc/page-m-gated/index.html'),
    /js\/plugins\/hello/,
    'gated page carries the plugin script',
  );
  for (const rel of [
    'index.html',
    ...[...'abcdefghij'].map((c) => `misc/page-${c}/index.html`),
  ]) {
    assert.doesNotMatch(
      r.publicFile(rel),
      /js\/plugins\/hello/,
      `ungated page ${rel} ships no plugin script`,
    );
  }
});
