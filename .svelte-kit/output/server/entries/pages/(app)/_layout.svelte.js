import "../../../chunks/index-server.js";
import { Q as getContext, c as unsubscribe_stores, i as ensure_array_like, n as attr_class, o as store_get, s as stringify, z as escape_html } from "../../../chunks/dev.js";
import "../../../chunks/client.js";
import "../../../chunks/navigation.js";
import "../../../chunks/supabase.js";
import { t as toasts } from "../../../chunks/toasts.js";
//#region node_modules/@sveltejs/kit/src/runtime/app/stores.js
/**
* A function that returns all of the contextual stores. On the server, this must be called during component initialization.
* Only use this if you need to defer store subscription until after the component has mounted, for some reason.
*
* @deprecated Use `$app/state` instead (requires Svelte 5, [see docs for more info](https://svelte.dev/docs/kit/migrating-to-sveltekit-2#SvelteKit-2.12:-$app-stores-deprecated))
*/
var getStores = () => {
	const stores$1 = getContext("__svelte__");
	return {
		/** @type {typeof page} */
		page: { subscribe: stores$1.page.subscribe },
		/** @type {typeof navigating} */
		navigating: { subscribe: stores$1.navigating.subscribe },
		/** @type {typeof updated} */
		updated: stores$1.updated
	};
};
/**
* A readable store whose value contains page data.
*
* On the server, this store can only be subscribed to during component initialization. In the browser, it can be subscribed to at any time.
*
* @deprecated Use `page` from `$app/state` instead (requires Svelte 5, [see docs for more info](https://svelte.dev/docs/kit/migrating-to-sveltekit-2#SvelteKit-2.12:-$app-stores-deprecated))
* @type {import('svelte/store').Readable<import('@sveltejs/kit').Page>}
*/
var page = { subscribe(fn) {
	return getStores().page.subscribe(fn);
} };
//#endregion
//#region src/lib/components/Toast.svelte
function Toast($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		$$renderer.push(`<div class="notification-stack"><!--[-->`);
		const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$toasts", toasts));
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let toast = each_array[$$index];
			$$renderer.push(`<div${attr_class(`notification-node ${stringify(toast.type)}`)} role="alert"><header class="node-header"><span class="mono-label">${escape_html(toast.type?.toUpperCase() || "SYSTEM_LOG")}</span> <button class="node-close" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button></header> <div class="node-body">${escape_html(toast.message)}</div></div>`);
		}
		$$renderer.push(`<!--]--></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/routes/(app)/+layout.svelte
function _layout($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { data, children } = $$props;
		$$renderer.push(`<header class="global-nav"><div class="nav-left"><button class="mobile-menu-trigger" aria-label="Toggle Menu"><i${attr_class(`fa-solid ${stringify("fa-bars-staggered")}`)}></i></button> <a href="/dashboard" class="logo"><i class="fa-solid fa-cube"></i> <span class="logo-text">Niya's <span>ADMIN<small>beta</small></span></span></a></div> <nav class="nav-center"><ul class="nav-links"><li><a href="/dashboard"${attr_class("", void 0, { "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === "/dashboard" })}>Dashboard</a></li> <li><a href="/assets"${attr_class("", void 0, { "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === "/assets" })}>Assets</a></li> <li><a href="/events"${attr_class("", void 0, { "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === "/events" })}>Events</a></li> <li><a href="/members"${attr_class("", void 0, { "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === "/members" })}>Members</a></li> <li><a href="/downloader"${attr_class("", void 0, { "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === "/downloader" })}>Downloader</a></li> <li><a href="/settings"${attr_class("", void 0, { "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === "/settings" })}>Settings</a></li></ul></nav> <div class="nav-right"><button class="icon-btn theme-toggle" aria-label="Toggle Theme"><i class="fa-solid fa-circle-half-stroke"></i></button> <button class="button-primary">Sign Out</button></div></header> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="app-layout"><main class="main-content">`);
		children($$renderer);
		$$renderer.push(`<!----></main></div> `);
		Toast($$renderer, {});
		$$renderer.push(`<!---->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _layout as default };
