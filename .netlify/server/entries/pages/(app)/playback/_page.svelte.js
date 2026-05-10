import { B as escape_html, a as ensure_array_like, z as attr } from "../../../../chunks/dev.js";
import "../../../../chunks/client.js";
import "../../../../chunks/navigation.js";
import "../../../../chunks/toasts.js";
//#region src/routes/(app)/playback/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { form } = $$props;
		let isLoading = false;
		let fetchingVodId = null;
		function formatDate(dateStr) {
			return new Date(dateStr).toLocaleString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit"
			});
		}
		$$renderer.push(`<div class="page-shell"><header class="page-header"><div class="header-left"><span class="mono-label">Technical Intelligence</span> <h1 class="hero-display">Playback</h1> <p class="body-large">Automated extraction and indexing of member broadcast
                infrastructure and media resources.</p></div> <form method="POST" action="?/search" class="playback-search-form"><div class="playback-search-field"><i class="fa-solid fa-magnifying-glass"></i> <input type="text" name="name" placeholder="Member alias or App URI endpoint..." required="" autocomplete="off"/> <button type="submit" class="button-pill-outline"${attr("disabled", isLoading, true)}>`);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`Query`);
		$$renderer.push(`<!--]--></button></div></form></header> `);
		if (form?.error) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="banner-error" role="alert"><i class="fa-solid fa-triangle-exclamation"></i> <span>System Error: ${escape_html(form.error)}</span></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (form?.lives) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="section-divider"><h2 class="card-heading">${escape_html(form.memberName)} Sessions</h2> <div class="mono-label">Total Nodes: ${escape_html(form.lives.length)}</div></div> <div class="technical-grid svelte-8my1qj"><!--[-->`);
			const each_array = ensure_array_like(form.lives);
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let live = each_array[$$index];
				$$renderer.push(`<div class="media-card-co svelte-8my1qj"><div class="card-media svelte-8my1qj"><img${attr("src", live.thumbnailImageUrl)}${attr("alt", live.title)} loading="lazy" class="svelte-8my1qj"/> <button class="play-trigger svelte-8my1qj"${attr("disabled", fetchingVodId === live.id, true)} aria-label="Initialize VOD">`);
				if (fetchingVodId === live.id) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<i class="fa-solid fa-spinner fa-spin"></i>`);
				} else {
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`<i class="fa-solid fa-play"></i>`);
				}
				$$renderer.push(`<!--]--></button></div> <div class="card-info"><div class="mono-label">${escape_html(formatDate(live.publishedAt))}</div> <h3 class="technical-title svelte-8my1qj"${attr("title", live.title)}>${escape_html(live.title || "UNDEFINED_SESSION")}</h3></div></div>`);
			}
			$$renderer.push(`<!--]--></div>`);
		} else if (!form?.error) {
			$$renderer.push("<!--[1-->");
			$$renderer.push(`<div class="empty-state"><h3 class="card-heading">Null Response</h3> <p class="body">Enter a valid member identifier to begin technical extraction.</p></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
export { _page as default };
