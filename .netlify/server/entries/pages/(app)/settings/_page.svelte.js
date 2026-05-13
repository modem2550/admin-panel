import "../../../../chunks/index-server.js";
import "../../../../chunks/dev.js";
import "../../../../chunks/supabase.js";
//#region src/routes/(app)/settings/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		$$renderer.push(`<div class="page-shell"><div class="co-page-hero"><div class="co-page-hero__main"><span class="mono-label">Environment config</span> <h1 class="hero-display">System parameters</h1> <p class="body-large">Configuration of administrative credentials, security protocols, and platform environment variables.</p></div></div> <div class="config-surface">`);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<div class="status-stream"><div class="status-node"><i class="fa-solid fa-spinner fa-spin me-3 opacity-50"></i> <span class="mono-label">FETCHING_IDENTITY_RECORDS...</span></div></div>`);
		$$renderer.push(`<!--]--></div></div>`);
	});
}
//#endregion
export { _page as default };
