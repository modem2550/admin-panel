import { B as escape_html, a as ensure_array_like, c as stringify, i as derived, n as attr_class, z as attr } from "../../../../chunks/dev.js";
import { d as proxyUrl } from "../../../../chunks/bnk48.js";
import "../../../../chunks/supabase.js";
import "../../../../chunks/toasts.js";
//#region src/routes/(app)/members/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data } = $$props;
		let members = [];
		let searchQuery = "";
		let filterBrand = "All";
		let filterStatus = "All";
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
		$$renderer.push(`<div class="page-shell"><header class="page-header page-header--split"><div class="header-left"><span class="mono-label">Personnel Directory</span> <h1 class="hero-display">Collective Registry</h1> <p class="body-large">Operational management of member records, generation indexing,
				and active status tracking.</p></div> <div class="header-actions"><button class="button-pill-outline">Add Entry <i class="fa-solid fa-plus ms-2"></i></button></div> <div class="technical-filter-bar svelte-1z0yobh"><div class="filter-group flex-1 svelte-1z0yobh"><div class="search-box"><i class="fa-solid fa-magnifying-glass opacity-50"></i> <input type="text" placeholder="Search entries..."${attr("value", searchQuery)}/></div></div> <div class="filter-group svelte-1z0yobh"><div class="filter-pills"><button${attr_class("button-pill-outline", void 0, { "active": filterBrand === "All" })}>All</button> <button${attr_class("button-pill-outline", void 0, { "active": filterBrand === "BNK48" })}>BNK48</button> <button${attr_class("button-pill-outline", void 0, { "active": filterBrand === "CGM48" })}>CGM48</button></div></div> <div class="filter-group svelte-1z0yobh"><div class="technical-select svelte-1z0yobh">`);
		$$renderer.select({
			value: filterGen,
			class: ""
		}, ($$renderer) => {
			$$renderer.option({ value: "All" }, ($$renderer) => {
				$$renderer.push(`All Generations`);
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
		}, "svelte-1z0yobh");
		$$renderer.push(`</div></div> <div class="filter-group svelte-1z0yobh"><div class="technical-select svelte-1z0yobh">`);
		$$renderer.select({
			value: filterTeam,
			class: ""
		}, ($$renderer) => {
			$$renderer.option({ value: "All" }, ($$renderer) => {
				$$renderer.push(`All Teams`);
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
		}, "svelte-1z0yobh");
		$$renderer.push(`</div></div> <div class="filter-group svelte-1z0yobh"><div class="technical-select svelte-1z0yobh">`);
		$$renderer.select({
			value: filterStatus,
			class: ""
		}, ($$renderer) => {
			$$renderer.option({ value: "All" }, ($$renderer) => {
				$$renderer.push(`Global Status`);
			});
			$$renderer.option({ value: "Active" }, ($$renderer) => {
				$$renderer.push(`Active Duty`);
			});
			$$renderer.option({ value: "Graduated" }, ($$renderer) => {
				$$renderer.push(`Graduated`);
			});
		}, "svelte-1z0yobh");
		$$renderer.push(`</div></div></div></header> <div class="row row-cols-1 row-cols-lg-2 g-4"><!--[-->`);
		const each_array_2 = ensure_array_like(filteredMembers());
		for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
			let member = each_array_2[$$index_2];
			$$renderer.push(`<div class="col d-flex justify-content-center member-node svelte-1z0yobh"><div class="node-media svelte-1z0yobh">`);
			if (member.profile_image_url) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<img${attr("src", proxyUrl(member.profile_image_url))}${attr("alt", member.name)} loading="lazy" class="svelte-1z0yobh"/>`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<div class="media-placeholder svelte-1z0yobh">${escape_html(member.name?.charAt(0))}</div>`);
			}
			$$renderer.push(`<!--]--> <div${attr_class(`node-status ${stringify(member.graduated_at ? "graduated" : "active")}`, "svelte-1z0yobh")}>${escape_html(member.graduated_at ? "GRADUATED" : "ACTIVE")}</div></div> <div class="node-details svelte-1z0yobh"><div class="node-meta svelte-1z0yobh"><span class="separator svelte-1z0yobh">/</span> <span class="mono-label">ORG: ${escape_html(member.brand)}</span> <span class="separator svelte-1z0yobh">/</span> <span class="mono-label">${escape_html(member.gen)}</span></div> <h3 class="node-title svelte-1z0yobh">${escape_html(member.name)}</h3> <div class="node-sub svelte-1z0yobh"><span class="technical-tag svelte-1z0yobh">UNIT: ${escape_html(member.team)}</span></div> <div class="node-ops svelte-1z0yobh"><div class="ops-left svelte-1z0yobh"><button class="action-icon-btn svelte-1z0yobh" aria-label="Edit entry"><i class="fa-solid fa-pen-to-square"></i></button> <button class="action-icon-btn danger svelte-1z0yobh" aria-label="Delete entry"><i class="fa-solid fa-trash"></i></button></div></div></div></div>`);
		}
		$$renderer.push(`<!--]--></div></div> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
export { _page as default };
