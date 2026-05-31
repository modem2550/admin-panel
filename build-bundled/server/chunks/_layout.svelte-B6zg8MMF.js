// build/server/chunks/_layout.svelte-B6zg8MMF.js
function _layout($$renderer, $$props) {
  let { children } = $$props;
  $$renderer.push(`<div class="auth-layout-bg">`);
  children($$renderer);
  $$renderer.push(`<!----></div>`);
}
export {
  _layout as default
};
