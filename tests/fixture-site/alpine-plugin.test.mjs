// Alpine as an opt-in JS plugin (alpine-plugin spike): the theme ships
// assets/js/plugins/alpine.js (bundling the npm alpinejs dep via js.Build);
// a site enables it with a registry entry only. Pins:
// - enabling ships the Alpine runtime (window.Alpine + start());
// - not enabling ships zero Alpine bytes anywhere in the output;
// - a project-authored plugin can register components against the
//   theme-shipped Alpine (alpine:init), relying on registry order.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSite } from './lib/build-site.mjs';

const content = {
  'content/_index.md': '---\ntitle: Home\n---\nHome body\n',
};

test('enabling the alpine plugin ships the Alpine runtime', () => {
  const r = buildSite('alpine-enabled', {
    files: content,
    title: 'Runtime fixture',
    extraConfig: `params:
  docsy:
    jsPlugins:
      - name: alpine
        defer: true
`,
  });
  assert.equal(r.status, 0, `hugo build succeeds:\n${r.stderr}`);
  const html = r.publicFile('index.html');
  const m = html.match(
    /<script[^>]*\bdefer\b[^>]*src="\/(js\/plugins\/alpine[^"]*\.js)"/,
  );
  assert.ok(m, 'alpine plugin script tag is emitted, deferred');
  const js = r.publicFile(m[1]);
  assert.match(js, /Alpine/, 'bundle carries the Alpine runtime');
  assert.match(js, /alpine:init/, 'runtime dispatches alpine:init');
});

test('without a registry entry, zero Alpine bytes ship', () => {
  const r = buildSite('alpine-absent', {
    files: content,
    title: 'Absence fixture',
  });
  assert.equal(r.status, 0, `hugo build succeeds:\n${r.stderr}`);
  assert.doesNotMatch(
    r.publicFile('index.html'),
    /js\/plugins\/alpine/,
    'no alpine script tag',
  );
  assert.throws(
    () => r.publicFile('js/plugins/alpine.js'),
    'no alpine bundle is published',
  );
});

test('a later-registered project plugin extends the theme-shipped Alpine', () => {
  // Registry order is the emission order; the consumer registers via
  // alpine:init, which fires when Alpine.start() runs after DOMContentLoaded,
  // so document order (= registry order) is what the convention needs.
  const r = buildSite('alpine-consumer', {
    files: {
      ...content,
      'assets/js/plugins/greeter.js': `document.addEventListener('alpine:init', () => {
  window.Alpine.data('greeter', () => ({ msg: 'hi-from-consumer' }));
});
`,
    },
    title: 'Consumer fixture',
    extraConfig: `params:
  docsy:
    jsPlugins:
      - name: alpine
        defer: true
      - name: greeter
        defer: true
`,
  });
  assert.equal(r.status, 0, `hugo build succeeds:\n${r.stderr}`);
  const html = r.publicFile('index.html');
  const alpineAt = html.search(/src="\/js\/plugins\/alpine/);
  const greeterAt = html.search(/src="\/js\/plugins\/greeter/);
  assert.ok(alpineAt >= 0, 'alpine script tag is emitted');
  assert.ok(greeterAt >= 0, 'consumer plugin script tag is emitted');
  assert.ok(alpineAt < greeterAt, 'registry order is the document order');
  const js = r.publicFile(
    html.match(/src="\/(js\/plugins\/greeter[^"]*\.js)"/)[1],
  );
  assert.match(js, /hi-from-consumer/, 'consumer plugin is built as authored');
});
