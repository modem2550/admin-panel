import { R as attr, i as ensure_array_like, n as attr_class, r as derived, s as stringify, z as escape_html } from "../../../../chunks/dev.js";
import { p as proxyUrl } from "../../../../chunks/bnk48.js";
import "../../../../chunks/supabase.js";
import "../../../../chunks/toasts.js";
//#region src/routes/(app)/members/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data } = $$props;
		let members = [];
		let searchQuery = "";
		let filterBrand = "All";
		let filterStatus = "Active";
		let filterGen = "All";
		let filterTeam = "All";
		let availableGens = derived(() => ["All", ...Array.from(new Set(members.map((m) => m.gen).filter(Boolean)))]);
		let availableTeams = derived(() => ["All", ...Array.from(new Set(members.map((m) => m.team).filter(Boolean)))]);
		let filteredMembers = derived(() => members.filter((m) => {
			if (!m || !m.name) return false;
			const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesBrand = filterBrand === "All" || m.brand === filterBrand;
			const matchesStatus = filterStatus === "All" || filterStatus === "Active" && !m.graduated_at || filterStatus === "Graduated" && !!m.graduated_at;
			const matchesGen = filterGen === "All" || m.gen === filterGen;
			const matchesTeam = filterTeam === "All" || m.team === filterTeam;
			return matchesSearch && matchesBrand && matchesStatus && matchesGen && matchesTeam;
		}));
		$$renderer.push(`<div class="page-shell"><div class="co-page-hero"><div class="co-page-hero__main"><span class="mono-label">Personnel directory</span> <h1 class="hero-display">Collective registry</h1> <p class="body-large">Operational management of member records, generation indexing,
				and active status tracking.</p></div> <div class="co-page-hero__actions"><button type="button" class="button-primary">Add entry <i class="fa-solid fa-plus ms-2"></i></button> <div class="filter-group flex-1"><div class="search-box"><i class="fa-solid fa-magnifying-glass opacity-50" aria-hidden="true"></i> <input type="search" placeholder="Search entries..."${attr("value", searchQuery)}/></div></div></div></div> <div class="technical-filter-bar"><div class="filter-group"><div class="filter-pills"><button type="button"${attr_class("button-pill-outline taxonomy-chip", void 0, { "active": filterBrand === "All" })}>All</button> <button type="button"${attr_class("button-pill-outline taxonomy-chip", void 0, { "active": filterBrand === "BNK48" })}>BNK48</button> <button type="button"${attr_class("button-pill-outline taxonomy-chip", void 0, { "active": filterBrand === "CGM48" })}>CGM48</button></div></div> <div class="filter-group"><div class="technical-select">`);
		$$renderer.select({ value: filterGen }, ($$renderer) => {
			$$renderer.option({ value: "All" }, ($$renderer) => {
				$$renderer.push(`All generations`);
			});
			$$renderer.push(`<!--[-->`);
			const each_array = ensure_array_like(availableGens().filter((g) => g !== "All"));
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let gen = each_array[$$index];
				$$renderer.option({ value: gen }, ($$renderer) => {
					$$renderer.push(`${escape_html(gen)}`);
				});
			}
			$$renderer.push(`<!--]-->`);
		});
		$$renderer.push(`</div></div> <div class="filter-group"><div class="technical-select">`);
		$$renderer.select({ value: filterTeam }, ($$renderer) => {
			$$renderer.option({ value: "All" }, ($$renderer) => {
				$$renderer.push(`All teams`);
			});
			$$renderer.push(`<!--[-->`);
			const each_array_1 = ensure_array_like(availableTeams().filter((t) => t !== "All"));
			for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
				let team = each_array_1[$$index_1];
				$$renderer.option({ value: team }, ($$renderer) => {
					$$renderer.push(`${escape_html(team)}`);
				});
			}
			$$renderer.push(`<!--]-->`);
		});
		$$renderer.push(`</div></div> <div class="filter-group"><div class="technical-select">`);
		$$renderer.select({ value: filterStatus }, ($$renderer) => {
			$$renderer.option({ value: "All" }, ($$renderer) => {
				$$renderer.push(`All`);
			});
			$$renderer.option({ value: "Active" }, ($$renderer) => {
				$$renderer.push(`Active`);
			});
			$$renderer.option({ value: "Graduated" }, ($$renderer) => {
				$$renderer.push(`Graduated`);
			});
		});
		$$renderer.push(`</div></div></div> `);
		if (filteredMembers().length === 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="status-stream"><div class="status-node"><i class="fa-solid fa-user-slash me-2 opacity-50" aria-hidden="true"></i> <span class="mono-label">No entries match filters</span></div></div>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="data-table-wrap data-table-wrap--scroll"><table class="data-table data-table--zebra data-table--sticky"><thead><tr><th scope="col" class="data-table__thumb">Visual</th><th scope="col">State</th><th scope="col">Unit</th><th scope="col">Identity</th><th scope="col" class="data-table__actions">Actions</th></tr></thead><tbody><!--[-->`);
			const each_array_2 = ensure_array_like(filteredMembers());
			for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
				let member = each_array_2[$$index_2];
				$$renderer.push(`<tr><td class="data-table__thumb">`);
				if (member.profile_image_url) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<img${attr("src", proxyUrl(member.profile_image_url))}${attr("alt", member.name)} loading="lazy"/>`);
				} else {
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`<div class="data-table__thumb-placeholder">${escape_html(member.name?.charAt(0) ?? "—")}</div>`);
				}
				$$renderer.push(`<!--]--></td><td><span${attr_class(`data-table__chip ${stringify(member.graduated_at ? "data-table__chip--muted" : "data-table__chip--live")}`)}>${escape_html(member.graduated_at ? "Alumni" : "Active")}</span></td><td class="data-table__meta"><span>${escape_html(member.brand)}</span> <span class="sep">/</span> <span>${escape_html(member.gen)}</span> <span class="sep">/</span> <span>${escape_html(member.team)}</span></td><td><h3 class="data-table__title">${escape_html(member.name)}</h3></td><td class="data-table__actions"><div class="data-table__ops"><button type="button" class="action-icon-btn" aria-label="Edit entry"><i class="fa-solid fa-pen-to-square"></i></button> <button type="button" class="action-icon-btn danger" aria-label="Delete entry"><i class="fa-solid fa-trash"></i></button></div></td></tr>`);
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
