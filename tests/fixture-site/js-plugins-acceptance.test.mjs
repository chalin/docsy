// The js-plugins architecture's acceptance test (js-plugins spike): a project
// site drops assets/js/plugins/hello.js + one params.docsy.jsPlugins entry and
// gets its script loaded — with zero layout overrides, asserted structurally
// (the fixture contains no layouts/ directory). Same-name shadowing of a theme
// plugin is covered in js-plugins.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { buildSite } from './lib/build-site.mjs';

test('a project adds a JS plugin with zero layout overrides', () => {
  const r = buildSite('js-plugins-acceptance', {
    files: {
      'content/_index.md': '---\ntitle: Home\n---\nHome body\n',
      'assets/js/plugins/hello.js':
        "import * as params from '@params';\n" +
        "console.log('hello from a project plugin', params.who);\n",
    },
    extraConfig: `params:
  docsy:
    jsPlugins:
      - name: hello
        options:
          who: acceptance
`,
  });
  assert.equal(r.status, 0, `hugo build succeeds:\n${r.stderr}`);
  assert.ok(
    !existsSync(path.join(r.site, 'layouts')),
    'the fixture site carries no layout overrides',
  );
  const html = r.publicFile('index.html');
  const m = html.match(/<script[^>]*src="\/(js\/plugins\/hello[^"]*\.js)"/);
  assert.ok(m, 'the project plugin is loaded');
  assert.match(
    r.publicFile(m[1]),
    /acceptance/,
    'the config options reach the plugin',
  );
});
