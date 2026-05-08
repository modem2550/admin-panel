import "../../../../chunks/index-server.js";
import "../../../../chunks/dev.js";
import "../../../../chunks/supabase.js";
//#region src/routes/(app)/settings/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		$$renderer.push(`<div class="page-container svelte-15kgmsr"><header class="page-header svelte-15kgmsr"><div class="header-left"><span class="mono-label">Environment Config</span> <h1 class="hero-display svelte-15kgmsr">System Parameters</h1> <p class="body-large svelte-15kgmsr">Configuration of administrative credentials, security protocols, and platform environment variables.</p></div></header> <div class="config-surface svelte-15kgmsr">`);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<div class="status-stream svelte-15kgmsr"><div class="status-node svelte-15kgmsr"><i class="fa-solid fa-spinner fa-spin me-3 opacity-50"></i> <span class="mono-label">FETCHING_IDENTITY_RECORDS...</span></div></div>`);
		$$renderer.push(`<!--]--></div></div>`);
	});
}
//#endregion
export { _page as default };
