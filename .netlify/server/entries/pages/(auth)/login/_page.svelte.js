import { z as attr } from "../../../../chunks/dev.js";
import "../../../../chunks/navigation.js";
import "../../../../chunks/supabase.js";
//#region src/routes/(auth)/login/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let email = "";
		let password = "";
		let loading = false;
		$$renderer.push(`<div class="auth-shell"><header class="auth-terminal-header"><span class="mono-label">Authentication Protocol</span> <h1 class="hero-display hero-display--auth">Access Terminal</h1></header> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="auth-panel"><form class="login-form svelte-8k30lk"><div class="login-field svelte-8k30lk"><span class="mono-label">USER_IDENTIFIER</span> <div class="technical-input-group svelte-8k30lk"><input type="email"${attr("value", email)} placeholder="admin@example.com"${attr("disabled", loading, true)} autocomplete="username" required="" class="svelte-8k30lk"/></div></div> <div class="login-field svelte-8k30lk"><span class="mono-label">SECURITY_TOKEN</span> <div class="technical-input-group svelte-8k30lk"><input type="password"${attr("value", password)} placeholder="••••••••"${attr("disabled", loading, true)} autocomplete="current-password" required="" class="svelte-8k30lk"/></div></div> <button class="button-pill-outline login-submit svelte-8k30lk" type="submit"${attr("disabled", loading, true)}>`);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`ESTABLISH_SESSION`);
		$$renderer.push(`<!--]--></button></form></div> <footer class="login-footer svelte-8k30lk"><p class="mono-label opacity-30 svelte-8k30lk">© 2026 RESEARCH OPERATIONS · ALL ACCESS LOGGED</p></footer></div>`);
	});
}
//#endregion
export { _page as default };
