// Alpine.js runtime (CSP build), shipped as an opt-in Docsy JS plugin. Enable
// via params.docsy.jsPlugins (registry entry `alpine`, defer recommended);
// plugins registered after this one extend it via the alpine:init event:
//
//   document.addEventListener('alpine:init', () => {
//     Alpine.data('widget', () => ({ ... }));
//   });
//
// Alpine.start() is postponed to DOMContentLoaded, which fires after every
// deferred script has executed — so alpine:init listeners are heard no
// matter where a plugin sits in the registry, and alpine:init remains the
// one ordering contract. (Verified in-browser: starting synchronously here
// fires alpine:init before later plugins can listen.)
// The CSP build evaluates directive expressions without Function
// constructors, so strict Content-Security-Policy sites need no
// 'unsafe-eval'. It supports most inline expressions but not arrow
// functions, template literals, or globals — logic belongs in registered
// components, not markup, which is the boundary Docsy wants anyway.

import Alpine from '@alpinejs/csp';

window.Alpine = Alpine;
// Deferred scripts run with readyState 'interactive', before DOMContentLoaded
// fires — so under the registry convention (deferred plugin scripts) the
// listener path is the one taken; 'complete' covers late manual injection.
if (document.readyState === 'complete') {
  Alpine.start();
} else {
  document.addEventListener('DOMContentLoaded', () => Alpine.start());
}
