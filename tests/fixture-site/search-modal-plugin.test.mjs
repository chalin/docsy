// Ctrl+K search modal (alpine-plugin spike, poster child): the component unit
// "shortcode/partial markup + Alpine behavior + scoped CSS, shipped as a JS
// plugin". A site enables it via config only — alpine + search-modal registry
// entries; the modal markup rides the entry's vendorPartial hook and wraps the
// existing search input. Static assertions here (markup, behavior wiring,
// script order, absence when disabled); no browser run in the spike.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { buildSite } from './lib/build-site.mjs';

const content = {
  'content/_index.md': '---\ntitle: Home\n---\nHome body\n',
};

const enableConfig = `params:
  offlineSearch: true
  docsy:
    jsPlugins:
      - name: alpine
        defer: true
      - name: search-modal
        defer: true
        vendorPartial: search-modal.html
`;

test('config-only enablement ships modal markup, behavior, and no layout overrides', () => {
  const r = buildSite('search-modal', {
    files: content,
    title: 'Modal fixture',
    extraConfig: enableConfig,
  });
  assert.equal(r.status, 0, `hugo build succeeds:\n${r.stderr}`);

  // Acceptance guard: the fixture site brings no layouts of its own.
  assert.ok(
    !existsSync(path.join(r.site, 'layouts')),
    'fixture site has zero layout overrides',
  );

  const html = r.publicFile('index.html');
  assert.match(
    html,
    /x-data="tdSearchModal"/,
    'modal root binds the component',
  );
  assert.match(html, /keydown\.window/, 'global shortcut listener is declared');
  assert.match(html, /keydown\.escape/, 'Esc close is declared');
  assert.match(
    html,
    /td-search-modal[^>]*>[\s\S]*td-search__input/,
    'modal wraps the existing search input',
  );
  assert.match(
    html,
    /\.td-search-modal\s*{/,
    'scoped CSS ships with the markup',
  );

  const alpineAt = html.search(/src="\/js\/plugins\/alpine/);
  const modalAt = html.search(/src="\/js\/plugins\/search-modal/);
  assert.ok(alpineAt >= 0 && modalAt >= 0, 'both plugin scripts are emitted');
  assert.ok(alpineAt < modalAt, 'alpine loads before the modal plugin');

  const js = r.publicFile(
    html.match(/src="\/(js\/plugins\/search-modal[^"]*\.js)"/)[1],
  );
  assert.match(js, /alpine:init/, 'component registers on alpine:init');
});

test('without the registry entries, no modal bytes ship', () => {
  const r = buildSite('search-modal-absent', {
    files: content,
    title: 'Absence fixture',
    extraConfig: 'params:\n  offlineSearch: true\n',
  });
  assert.equal(r.status, 0, `hugo build succeeds:\n${r.stderr}`);
  const html = r.publicFile('index.html');
  assert.doesNotMatch(html, /tdSearchModal/, 'no modal markup');
  assert.doesNotMatch(html, /js\/plugins\/search-modal/, 'no modal script');
  assert.doesNotMatch(html, /js\/plugins\/alpine/, 'no Alpine runtime');
});
