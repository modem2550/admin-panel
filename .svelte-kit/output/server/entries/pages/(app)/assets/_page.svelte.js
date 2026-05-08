import "../../../../chunks/index-server.js";
import { B as escape_html, a as ensure_array_like, n as attr_class, z as attr } from "../../../../chunks/dev.js";
import "../../../../chunks/toasts.js";
//#region src/routes/(app)/assets/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let assetType = "product";
		let sortOrder = "desc";
		let assets = [];
		let loading = false;
		let jumpToId = "";
		const loadMoreLabel = () => sortOrder === "asc" ? "โหลดเพิ่ม (รุ่นเก่า)" : "โหลดรุ่นเก่าต่อ";
		$$renderer.push(`<div class="page-container svelte-y9savv"><header class="page-header"><div class="header-left"><span class="mono-label">Visual Infrastructure</span> <h1 class="hero-display svelte-y9savv">Asset Registry</h1> <p class="body-large svelte-y9savv">Technical repository for indexing and discovering official
				imagery assets and product media.</p></div> <div class="header-actions svelte-y9savv"><div class="filter-pills svelte-y9savv"><button${attr_class("button-pill-outline svelte-y9savv", void 0, { "active": assetType === "product" })}>Products</button> <button${attr_class("button-pill-outline svelte-y9savv", void 0, { "active": assetType === "group" })}>Collectives</button></div> <div class="technical-select svelte-y9savv">`);
		$$renderer.select({
			value: sortOrder,
			class: ""
		}, ($$renderer) => {
			$$renderer.option({ value: "desc" }, ($$renderer) => {
				$$renderer.push(`Latest Archives`);
			});
			$$renderer.option({ value: "asc" }, ($$renderer) => {
				$$renderer.push(`Historical First`);
			});
		}, "svelte-y9savv");
		$$renderer.push(`</div> <div class="technical-input-group jump-box svelte-y9savv"><input type="number" placeholder="Jump to Node ID"${attr("value", jumpToId)} class="svelte-y9savv"/> <button class="query-btn svelte-y9savv" aria-label="Go to ID"><i class="fa-solid fa-chevron-right"></i></button></div> <button class="button-pill-outline"${attr("disabled", loading, true)}>Find Latest</button></div></header> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="asset-grid svelte-y9savv"><!--[-->`);
		const each_array = ensure_array_like(assets);
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let asset = each_array[$$index];
			$$renderer.push(`<div class="editorial-card svelte-y9savv" role="button" tabindex="0"><div class="media-wrap svelte-y9savv"><img${attr("src", asset.url)}${attr("alt", asset.id)} loading="lazy" class="svelte-y9savv"/> <div class="node-id svelte-y9savv">#${escape_html(asset.id)}</div></div> <div class="card-overlay svelte-y9savv"><i class="fa-solid fa-expand"></i></div></div>`);
		}
		$$renderer.push(`<!--]--></div> <div class="pagination-footer svelte-y9savv"><button class="button-pill-outline px-5"${attr("disabled", loading, true)}>${escape_html(loadMoreLabel())}</button></div></div> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
export { _page as default };
