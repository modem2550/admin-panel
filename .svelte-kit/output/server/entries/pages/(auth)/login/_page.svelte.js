import { z as attr } from "../../../../chunks/dev.js";
import "../../../../chunks/supabase.js";
import "../../../../chunks/navigation.js";
//#region src/routes/(auth)/login/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let email = "";
		let password = "";
		let loading = false;
		$$renderer.push(`<div class="access-terminal svelte-8k30lk"><header class="terminal-header svelte-8k30lk"><span class="mono-label">Authentication Protocol</span> <h1 class="hero-display svelte-8k30lk">Access Terminal</h1></header> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="terminal-form svelte-8k30lk"><div class="input-section svelte-8k30lk"><span class="mono-label">USER_IDENTIFIER</span> <div class="technical-input-group svelte-8k30lk"><input type="email"${attr("value", email)} placeholder="admin@cohere.lab"${attr("disabled", loading, true)} class="svelte-8k30lk"/></div></div> <div class="input-section svelte-8k30lk"><span class="mono-label">SECURITY_TOKEN</span> <div class="technical-input-group svelte-8k30lk"><input type="password"${attr("value", password)} placeholder="••••••••"${attr("disabled", loading, true)} class="svelte-8k30lk"/></div></div> <button class="button-pill-outline w-full mt-8 svelte-8k30lk"${attr("disabled", loading, true)}>`);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`ESTABLISH_SESSION`);
		$$renderer.push(`<!--]--></button></div> <footer class="terminal-footer svelte-8k30lk"><p class="mono-label opacity-30">© 2026 RESEARCH OPERATIONS. ALL ACCESS LOGGED.</p></footer></div>`);
	});
}
//#endregion
export { _page as default };
