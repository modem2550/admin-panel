import "../../../chunks/dev.js";
//#region src/routes/(auth)/+layout.svelte
function _layout($$renderer, $$props) {
	let { children } = $$props;
	$$renderer.push(`<div class="auth-layout svelte-5bky5h">`);
	children($$renderer);
	$$renderer.push(`<!----></div>`);
}
//#endregion
export { _layout as default };
