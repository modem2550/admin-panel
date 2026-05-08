import { B as escape_html, a as ensure_array_like, c as stringify, i as derived, n as attr_class, z as attr } from "../../../../chunks/dev.js";
import "../../../../chunks/supabase.js";
import "../../../../chunks/toasts.js";
import { u as proxyUrl } from "../../../../chunks/bnk48.js";
//#region src/routes/(app)/events/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data } = $$props;
		let events = [];
		let filterMode = "all";
		let searchQuery = "";
		const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
		let filteredEvents = derived(() => events.filter((e) => {
			if (!e || !e.title) return false;
			if (filterMode === "upcoming") {
				if (!(e.date >= today || e.end_date && e.end_date >= today)) return false;
			} else if (filterMode === "past") {
				if (!(e.date < today && (!e.end_date || e.end_date < today))) return false;
			}
			return e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.location && e.location.toLowerCase().includes(searchQuery.toLowerCase());
		}).sort((a, b) => b.date.localeCompare(a.date)));
		$$renderer.push(`<div class="page-container container svelte-3s0wz7"><header class="page-header"><div class="header-left"><span class="mono-label">Mission Ledger</span> <h1 class="hero-display svelte-3s0wz7">Event Operations</h1> <p class="body-large svelte-3s0wz7">Technical indexing of public appearances, broadcast schedules,
				and group-wide activities.</p></div> <div class="technical-filter-bar svelte-3s0wz7"><div class="filter-pills svelte-3s0wz7"><button${attr_class("button-pill-outline", void 0, { "active": filterMode === "all" })}>Global Ledger</button> <button${attr_class("button-pill-outline", void 0, { "active": filterMode === "upcoming" })}>Upcoming</button> <button${attr_class("button-pill-outline", void 0, { "active": filterMode === "past" })}>Archives</button></div> <div class="technical-input-group search-box svelte-3s0wz7"><i class="fa-solid fa-magnifying-glass opacity-50"></i> <input type="text" placeholder="Search operations..."${attr("value", searchQuery)} class="svelte-3s0wz7"/></div> <button class="button-pill-outline">Create Record</button></div></header> `);
		if (filteredEvents().length === 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="status-stream svelte-3s0wz7"><div class="status-node svelte-3s0wz7"><i class="fa-solid fa-calendar-xmark me-2 opacity-50"></i> <span class="mono-label">NO_RECORDS_MATCH_QUERY</span></div></div>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="row row-cols-1 row-cols-lg-2 g-4 editorial-grid svelte-3s0wz7"><!--[-->`);
			const each_array = ensure_array_like(filteredEvents());
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let event = each_array[$$index];
				$$renderer.push(`<div class="col d-flex justify-content-center"><div class="node-media svelte-3s0wz7">`);
				if (event.image_url) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<img${attr("src", proxyUrl(event.image_url))} alt="" loading="lazy" class="svelte-3s0wz7"/>`);
				} else {
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`<div class="media-placeholder svelte-3s0wz7"><i class="fa-solid fa-cube"></i></div>`);
				}
				$$renderer.push(`<!--]--> <div${attr_class(`node-status ${stringify(new Date(event.date) >= new Date(today) ? "upcoming" : "archived")}`, "svelte-3s0wz7")}>${escape_html(new Date(event.date) >= new Date(today) ? "UPCOMING" : "PAST")}</div></div> <div class="mx-3 node-details svelte-3s0wz7"><div class="node-meta svelte-3s0wz7"><span class="mono-label">DATE: ${escape_html(new Date(event.date).toLocaleDateString("en-US", {
					year: "numeric",
					month: "2-digit",
					day: "2-digit"
				}).replace(/\//g, "."))}</span> `);
				if (event.location) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<span class="separator svelte-3s0wz7">/</span> <span class="mono-label">LOC: ${escape_html(event.location.toUpperCase())}</span>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div> <h3 class="node-title svelte-3s0wz7">${escape_html(event.title)}</h3> <div class="node-ops svelte-3s0wz7"><div class="ops-left svelte-3s0wz7"><button class="action-icon-btn svelte-3s0wz7" aria-label="Edit record"><i class="fa-solid fa-pen-to-square"></i></button> <button class="action-icon-btn danger svelte-3s0wz7" aria-label="Delete record"><i class="fa-solid fa-trash"></i></button></div> <div class="ops-right svelte-3s0wz7">`);
				if (event.link) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<button class="button-pill-outline btn-small svelte-3s0wz7">Access URI <i class="fa-solid fa-arrow-up-right-from-square ms-2"></i></button>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div></div></div></div>`);
			}
			$$renderer.push(`<!--]--></div>`);
		}
		$$renderer.push(`<!--]--></div> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
export { _page as default };
