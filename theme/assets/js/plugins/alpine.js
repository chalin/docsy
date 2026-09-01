// Alpine.js runtime, shipped as an opt-in Docsy JS plugin. Enable via
// params.docsy.jsPlugins (registry entry `alpine`, defer recommended); plugins
// registered after this one extend it via the alpine:init event:
//
//   document.addEventListener('alpine:init', () => {
//     Alpine.data('widget', () => ({ ... }));
//   });
//
// Alpine.start() dispatches alpine:init, so any listener added before this
// deferred script executes — i.e. any plugin in document order — is heard.
// Note: Alpine's expression evaluator uses `new Function`, which requires
// 'unsafe-eval' under a strict CSP.

import Alpine from 'alpinejs';

window.Alpine = Alpine;
Alpine.start();
