// JS-plugin registry + loop (js-plugins spike): params.docsy.jsPlugins entries
// drive a resources.Match "js/plugins/*.js" loop. Pins the loop's contract:
// an enabled plugin is built (js.Build) and emitted; options reach the module
// as @params; a disabled or unlisted plugin ships zero bytes; defer is
// honored; a pageGate'd plugin is emitted only on pages whose Store flag is
// set.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSite } from './lib/build-site.mjs';

const content = {
  'content/_index.md': '---\ntitle: Home\n---\nHome body\n',
  'content/docs/_index.md': '---\ntitle: Docs\n---\nDocs body\n',
};

const helloJs = `import * as params from '@params';
console.log('hello-plugin', params.greeting);
`;

const quietJs = `console.log('quiet-plugin');
`;

test('an enabled plugin is built and emitted, with options as @params', () => {
  const r = buildSite('js-plugins-loop', {
    files: {
      ...content,
      'assets/js/plugins/hello.js': helloJs,
      'assets/js/plugins/quiet.js': quietJs,
    },
    extraConfig: `params:
  docsy:
    jsPlugins:
      - name: hello
        options:
          greeting: bonjour
`,
  });
  assert.equal(r.status, 0, `hugo build succeeds:\n${r.stderr}`);
  const html = r.publicFile('index.html');
  const m = html.match(/<script[^>]*src="\/(js\/plugins\/hello[^"]*\.js)"/);
  assert.ok(m, 'hello plugin script tag is emitted');
  const js = r.publicFile(m[1]);
  assert.match(js, /bonjour/, 'plugin options reach the module via @params');

  // quiet.js exists in the plugins dir but has no registry entry.
  assert.doesNotMatch(html, /quiet/, 'unlisted plugin is not emitted');
  assert.throws(
    () => r.publicFile('js/plugins/quiet.js'),
    'unlisted plugin publishes no output',
  );
});

test('a disabled plugin ships zero bytes', () => {
  const r = buildSite('js-plugins-disabled', {
    files: { ...content, 'assets/js/plugins/hello.js': helloJs },
    extraConfig: `params:
  docsy:
    jsPlugins:
      - name: hello
        enable: false
`,
  });
  assert.equal(r.status, 0, `hugo build succeeds:\n${r.stderr}`);
  assert.doesNotMatch(
    r.publicFile('index.html'),
    /js\/plugins\/hello/,
    'disabled plugin has no script tag',
  );
  assert.throws(
    () => r.publicFile('js/plugins/hello.js'),
    'disabled plugin publishes no output',
  );
});

test('defer is honored on the emitted script tag', () => {
  const r = buildSite('js-plugins-defer', {
    files: { ...content, 'assets/js/plugins/hello.js': helloJs },
    extraConfig: `params:
  docsy:
    jsPlugins:
      - name: hello
        defer: true
`,
  });
  assert.equal(r.status, 0, `hugo build succeeds:\n${r.stderr}`);
  assert.match(
    r.publicFile('index.html'),
    /<script[^>]*\bdefer\b[^>]*src="\/js\/plugins\/hello/,
    'plugin script tag carries defer',
  );
});

test('a project plugin shadows the theme plugin of the same name', () => {
  // tabpane-persist is a theme-shipped plugin; the fixture site provides its
  // own file under the same name. Union FS: the project file must win.
  const r = buildSite('js-plugins-shadow', {
    files: {
      ...content,
      'content/docs/tabs.md':
        '---\ntitle: Tabs\n---\n\n{{< tabpane text=true >}}\n' +
        '{{< tab header="One" >}}one{{< /tab >}}\n{{< /tabpane >}}\n',
      'assets/js/plugins/tabpane-persist.js':
        "console.log('project-shadow-wins');\n",
    },
    title: 'Docsy shadowing fixture',
  });
  assert.equal(r.status, 0, `hugo build succeeds:\n${r.stderr}`);
  const html = r.publicFile('docs/tabs/index.html');
  const m = html.match(/<script[^>]*src="\/(js\/plugins\/tabpane-persist[^"]*\.js)"/);
  assert.ok(m, 'tabpane-persist plugin script tag is emitted');
  const js = r.publicFile(m[1]);
  assert.match(js, /project-shadow-wins/, 'the project file shadows the theme plugin');
  assert.doesNotMatch(js, /td-tp-persist/, 'the theme implementation is fully replaced');
});

test('a pageGate plugin is emitted only where its Store flag is set', () => {
  const r = buildSite('js-plugins-gate', {
    files: {
      ...content,
      // The fixture shortcode sets the Store flag, standing in for a
      // theme shortcode/render hook that marks feature usage.
      'layouts/_shortcodes/set-hello-flag.html':
        '{{ .Page.Store.Set "hasHello" true }}',
      'content/docs/uses.md':
        '---\ntitle: Uses\n---\n{{< set-hello-flag >}}\nUses the feature\n',
      'assets/js/plugins/hello.js': helloJs,
    },
    extraConfig: `params:
  docsy:
    jsPlugins:
      - name: hello
        pageGate: hasHello
`,
  });
  assert.equal(r.status, 0, `hugo build succeeds:\n${r.stderr}`);
  assert.match(
    r.publicFile('docs/uses/index.html'),
    /js\/plugins\/hello/,
    'gated plugin loads on the page that sets the flag',
  );
  assert.doesNotMatch(
    r.publicFile('index.html'),
    /js\/plugins\/hello/,
    'gated plugin is absent from pages without the flag',
  );
});
