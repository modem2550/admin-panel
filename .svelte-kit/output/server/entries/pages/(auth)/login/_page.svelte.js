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
		$$renderer.push(`<!--]--> <div class="auth-panel"><form class="login-form"><div class="login-field"><span class="mono-label">USER_IDENTIFIER</span> <div class="technical-input-group"><input type="email"${attr("value", email)} placeholder="admin@example.com"${attr("disabled", loading, true)} autocomplete="username" required=""/></div></div> <div class="login-field"><span class="mono-label">SECURITY_TOKEN</span> <div class="technical-input-group"><input type="password"${attr("value", password)} placeholder="••••••••"${attr("disabled", loading, true)} autocomplete="current-password" required=""/></div></div> <button class="button-primary login-submit" type="submit"${attr("disabled", loading, true)}>`);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`Sign in`);
		$$renderer.push(`<!--]--></button></form></div> <footer class="login-footer"><p class="mono-label opacity-30">© 2026 RESEARCH OPERATIONS · ALL ACCESS LOGGED</p></footer></div>`);
	});
}
//#endregion
export { _page as default };
