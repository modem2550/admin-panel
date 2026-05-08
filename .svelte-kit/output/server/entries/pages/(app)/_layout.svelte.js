import "../../../chunks/index-server.js";
import { $ as getContext, B as escape_html, a as ensure_array_like, c as stringify, l as unsubscribe_stores, n as attr_class, s as store_get } from "../../../chunks/dev.js";
import "../../../chunks/supabase.js";
import "../../../chunks/client.js";
import "../../../chunks/navigation.js";
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
		$$renderer.push(`<div class="notification-stack svelte-1cpok13"><!--[-->`);
		const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$toasts", toasts));
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let toast = each_array[$$index];
			$$renderer.push(`<div${attr_class(`notification-node ${stringify(toast.type)}`, "svelte-1cpok13")} role="alert"><header class="node-header svelte-1cpok13"><span class="mono-label svelte-1cpok13">${escape_html(toast.type?.toUpperCase() || "SYSTEM_LOG")}</span> <button class="node-close svelte-1cpok13" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button></header> <div class="node-body svelte-1cpok13">${escape_html(toast.message)}</div></div>`);
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
		let { children } = $$props;
		$$renderer.push(`<div class="announcement-bar svelte-1v2axqk"><div class="announcement-content svelte-1v2axqk"><span class="svelte-1v2axqk">New feature: BNK48 Media Explorer is now live.</span> <a href="/playback" class="svelte-1v2axqk">Explore now <i class="fa-solid fa-arrow-right"></i></a></div></div> <header class="global-nav svelte-1v2axqk"><div class="nav-left svelte-1v2axqk"><button class="mobile-menu-trigger svelte-1v2axqk" aria-label="Toggle Menu"><i${attr_class(`fa-solid ${stringify("fa-bars-staggered")}`)}></i></button> <a href="/dashboard" class="logo svelte-1v2axqk"><i class="fa-solid fa-cube svelte-1v2axqk"></i> <span class="logo-text svelte-1v2axqk">COHERE<span class="svelte-1v2axqk">ADMIN</span></span></a></div> <nav class="nav-center svelte-1v2axqk"><ul class="nav-links svelte-1v2axqk"><li><a href="/dashboard"${attr_class("svelte-1v2axqk", void 0, { "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === "/dashboard" })}>Dashboard</a></li> <li><a href="/assets"${attr_class("svelte-1v2axqk", void 0, { "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === "/assets" })}>Assets</a></li> <li><a href="/events"${attr_class("svelte-1v2axqk", void 0, { "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === "/events" })}>Events</a></li> <li><a href="/members"${attr_class("svelte-1v2axqk", void 0, { "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === "/members" })}>Members</a></li> <li><a href="/playback"${attr_class("svelte-1v2axqk", void 0, { "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === "/playback" })}>Playback</a></li></ul></nav> <div class="nav-right svelte-1v2axqk"><button class="icon-btn theme-toggle svelte-1v2axqk" aria-label="Toggle Theme"><i class="fa-solid fa-circle-half-stroke"></i></button> <a href="/settings" class="icon-btn svelte-1v2axqk" aria-label="Settings"><i class="fa-solid fa-gear"></i></a> <button class="button-primary hide-mobile svelte-1v2axqk">Sign Out</button></div></header> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="app-layout svelte-1v2axqk"><main class="main-content svelte-1v2axqk">`);
		children($$renderer);
		$$renderer.push(`<!----></main></div> `);
		Toast($$renderer, {});
		$$renderer.push(`<!---->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _layout as default };
