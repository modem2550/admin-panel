import { R as attr, i as ensure_array_like, n as attr_class, r as derived, s as stringify, z as escape_html } from "../../../../chunks/dev.js";
import { f as proxyUrl } from "../../../../chunks/bnk48.js";
import "../../../../chunks/supabase.js";
import "../../../../chunks/toasts.js";
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
		$$renderer.push(`<div class="page-shell"><div class="co-page-hero"><div class="co-page-hero__main"><span class="mono-label">Mission ledger</span> <h1 class="hero-display">Event operations</h1> <p class="body-large">Technical indexing of public appearances, broadcast schedules,
				and group-wide activities.</p></div> <div class="co-page-hero__actions"><button type="button" class="button-primary">Create event <i class="fa-solid fa-plus ms-2"></i></button></div></div> <div class="technical-filter-bar"><div class="filter-pills"><button type="button"${attr_class("button-pill-outline taxonomy-chip", void 0, { "active": filterMode === "all" })}>Global ledger</button> <button type="button"${attr_class("button-pill-outline taxonomy-chip", void 0, { "active": filterMode === "upcoming" })}>Upcoming</button> <button type="button"${attr_class("button-pill-outline taxonomy-chip", void 0, { "active": filterMode === "past" })}>Archives</button></div> <div class="search-box"><i class="fa-solid fa-magnifying-glass opacity-50" aria-hidden="true"></i> <input type="search" placeholder="Search operations..."${attr("value", searchQuery)}/></div></div> `);
		if (filteredEvents().length === 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="status-stream"><div class="status-node"><i class="fa-solid fa-calendar-xmark me-2 opacity-50"></i> <span class="mono-label">No records match query</span></div></div>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="data-table-wrap data-table-wrap--scroll"><table class="data-table data-table--zebra data-table--sticky"><thead><tr><th scope="col" class="data-table__thumb">Visual</th><th scope="col">State</th><th scope="col">Date</th><th scope="col">Location</th><th scope="col">Operation</th><th scope="col" class="data-table__actions">Actions</th></tr></thead><tbody><!--[-->`);
			const each_array = ensure_array_like(filteredEvents());
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let event = each_array[$$index];
				$$renderer.push(`<tr><td class="data-table__thumb">`);
				if (event.image_url) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<img${attr("src", proxyUrl(event.image_url))} alt="" loading="lazy"/>`);
				} else {
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`<div class="data-table__thumb-placeholder" aria-hidden="true"><i class="fa-solid fa-cube"></i></div>`);
				}
				$$renderer.push(`<!--]--></td><td><span${attr_class(`data-table__chip ${stringify(new Date(event.date) >= new Date(today) ? "data-table__chip--live" : "data-table__chip--muted")}`)}>${escape_html(new Date(event.date) >= new Date(today) ? "Live" : "Archive")}</span></td><td class="data-table__meta">${escape_html(new Date(event.date).toLocaleDateString("en-US", {
					year: "numeric",
					month: "2-digit",
					day: "2-digit"
				}).replace(/\//g, "."))}</td><td class="data-table__meta">${escape_html(event.location ?? "—")}</td><td><h3 class="data-table__title">${escape_html(event.title)}</h3></td><td class="data-table__actions"><div class="data-table__ops"><button type="button" class="action-icon-btn" aria-label="Edit record"><i class="fa-solid fa-pen-to-square"></i></button> <button type="button" class="action-icon-btn danger" aria-label="Delete record"><i class="fa-solid fa-trash"></i></button> `);
				if (event.link) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<button type="button" class="button-pill-outline btn-small">URI <i class="fa-solid fa-arrow-up-right-from-square ms-2"></i></button>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div></td></tr>`);
			}
			$$renderer.push(`<!--]--></tbody></table></div>`);
		}
		$$renderer.push(`<!--]--></div> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
export { _page as default };
