// Ctrl+K search modal behavior: Alpine component for the markup in
// _partials/scripts/search-modal.html. Register after the alpine plugin in
// params.docsy.jsPlugins; alpine:init fires when Alpine starts.

document.addEventListener('alpine:init', () => {
  window.Alpine.data('tdSearchModal', () => ({
    isOpen: false,
    open() {
      this.isOpen = true;
      this.$nextTick(() => {
        this.$refs.panel.querySelector('input')?.focus();
      });
    },
    close() {
      this.isOpen = false;
    },
  }));
});
