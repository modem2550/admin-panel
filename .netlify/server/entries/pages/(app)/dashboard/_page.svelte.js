import { B as escape_html, a as ensure_array_like, c as stringify, r as attr_style, z as attr } from "../../../../chunks/dev.js";
//#region src/routes/(app)/dashboard/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data } = $$props;
		$$renderer.push(`<div class="page-container svelte-1tyszyy"><header class="dashboard-header svelte-1tyszyy"><div class="header-split svelte-1tyszyy"><div class="header-text svelte-1tyszyy"><span class="mono-label">Operational Overview</span> <h1 class="hero-display svelte-1tyszyy">Dashboard</h1></div> <div class="header-visual svelte-1tyszyy"><div class="visual-grid svelte-1tyszyy"></div> <div class="visual-pulse svelte-1tyszyy"></div> <div class="visual-data-stream svelte-1tyszyy"><!--[-->`);
		const each_array = ensure_array_like(Array(5));
		for (let i = 0, $$length = each_array.length; i < $$length; i++) {
			each_array[i];
			$$renderer.push(`<div class="stream-line svelte-1tyszyy"${attr_style(`--delay: ${stringify(i * .8)}s; --x: ${stringify(i * 20)}%`)}></div>`);
		}
		$$renderer.push(`<!--]--></div></div></div></header> <div class="stats-grid svelte-1tyszyy"><div class="card-cohere stat-node svelte-1tyszyy"><span class="mono-label">Network Scope</span> <div class="stat-main svelte-1tyszyy"><span class="stat-value svelte-1tyszyy">${escape_html(data.membersCount)}</span> <span class="stat-unit svelte-1tyszyy">Members Indexed</span></div></div> <div class="card-cohere stat-node svelte-1tyszyy"><span class="mono-label">Activity Flux</span> <div class="stat-main svelte-1tyszyy"><span class="stat-value svelte-1tyszyy">${escape_html(data.eventsCount)}</span> <span class="stat-unit svelte-1tyszyy">Total Activities</span></div></div> <div class="card-cohere stat-node highlight svelte-1tyszyy"><span class="mono-label">Imminent Event</span> <div class="stat-main svelte-1tyszyy">`);
		if (data.nextEvent) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<span class="stat-title svelte-1tyszyy">${escape_html(data.nextEvent.title)}</span> <span class="stat-meta svelte-1tyszyy">${escape_html(data.nextEvent.date)}</span>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<span class="stat-value svelte-1tyszyy">—</span>`);
		}
		$$renderer.push(`<!--]--></div></div></div> <section class="asset-stream svelte-1tyszyy"><div class="section-header svelte-1tyszyy"><h2 class="card-heading">Asset Registry</h2> <a href="/assets" class="button-secondary">Explore Repository <i class="fa-solid fa-arrow-right ms-1"></i></a></div> <div class="row">`);
		if (data.latestAssets.product && data.latestAssets.product.url) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="col col-md-3 d-flex justify-content-center flex-column gap-3"><div class="preview-media svelte-1tyszyy"><img${attr("src", data.latestAssets.product.url)} alt="Latest Product" class="svelte-1tyszyy"/></div> <div class="preview-info svelte-1tyszyy"><span class="mono-label">PRD-${escape_html(data.latestAssets.product.id.toString().padStart(4, "0"))}</span> <h3 class="technical-title svelte-1tyszyy">Latest Product Media</h3></div></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (data.latestAssets.group && data.latestAssets.group.url) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="col col-md-3 d-flex justify-content-center flex-column gap-3"><div class="preview-media svelte-1tyszyy"><img${attr("src", data.latestAssets.group.url)} alt="Latest Group" class="svelte-1tyszyy"/></div> <div class="preview-info svelte-1tyszyy"><span class="mono-label">GRP-${escape_html(data.latestAssets.group.id.toString().padStart(4, "0"))}</span> <h3 class="technical-title svelte-1tyszyy">Latest Collective Media</h3></div></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div></section></div>`);
	});
}
//#endregion
export { _page as default };
