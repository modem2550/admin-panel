import "../../../../chunks/index-server.js";
import { B as escape_html } from "../../../../chunks/dev.js";
//#region src/routes/(app)/dashboard/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data } = $$props;
		$$renderer.push(`<div class="page-shell"><div class="co-page-hero"><div class="co-page-hero__main"><span class="mono-label">Operational Overview</span> <h1 class="hero-display">Dashboard</h1> <p class="body-large">High-level counts, the next scheduled activity, and a snapshot
				of the newest indexed media — white surface, rule-based
				hierarchy.</p></div></div> <div class="stats-grid"><div class="product-stat"><span class="mono-label">Network Scope</span> <div class="stat-main"><span class="stat-value">${escape_html(data.membersCount)}</span> <span class="stat-unit">Members indexed</span></div></div> <div class="product-stat"><span class="mono-label">Activity flux</span> <div class="stat-main"><span class="stat-value">${escape_html(data.eventsCount)}</span> <span class="stat-unit">Total activities</span></div></div> <div class="product-stat product-stat--accent"><span class="mono-label">Imminent event</span> <div class="stat-main">`);
		if (data.nextEvent) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<span class="stat-title">${escape_html(data.nextEvent.title)}</span> <span class="stat-meta">${escape_html(data.nextEvent.date)}</span>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<span class="stat-dash">—</span>`);
		}
		$$renderer.push(`<!--]--></div></div></div> <section class="asset-stream svelte-1tyszyy"><div class="section-header svelte-1tyszyy"><h2 class="card-heading">Asset registry</h2> <a href="/assets" class="button-secondary">Explore repository <i class="fa-solid fa-arrow-right ms-1"></i></a></div> <div class="media-preview-row svelte-1tyszyy">`);
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<div class="preview-col"><div class="skeleton-media mb-3"></div> <div class="skeleton-text"></div></div> <div class="preview-col"><div class="skeleton-media mb-3"></div> <div class="skeleton-text"></div></div> <div class="preview-col"><div class="skeleton-media mb-3"></div> <div class="skeleton-text"></div></div>`);
		$$renderer.push(`<!--]--></div></section></div>`);
	});
}
//#endregion
export { _page as default };
