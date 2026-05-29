import "../../../../chunks/index-server.js";
import { B as escape_html, a as ensure_array_like, i as derived, n as attr_class, z as attr } from "../../../../chunks/dev.js";
import "../../../../chunks/supabase.js";
import { t as toasts } from "../../../../chunks/toasts.js";
//#region src/routes/(app)/assets/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let itemsPerPage = 180;
		let assetType = "product";
		let sortOrder = "desc";
		/** Shop product gallery from public API `imageFileUrlList` (proxied paths). */
		let assets = [];
		let loading = false;
		let scanningStatus = "";
		let currentCursor = null;
		let _fetchInFlight = false;
		async function loadNextBatch() {
			if (_fetchInFlight) return;
			_fetchInFlight = true;
			loading = true;
			let start;
			if (sortOrder === "asc") start = currentCursor ?? 1;
			else {
				if (currentCursor === null) {
					try {
						const apiResp = await fetch(`/api/check-assets/latest?type=${assetType}`);
						if (apiResp.ok) {
							const latest = await apiResp.json();
							if (latest?.id && latest.id !== "0" && latest.id !== "0000") currentCursor = parseInt(latest.id, 10);
						}
					} catch {}
					if (currentCursor === null) if (assetType === "archive" || assetType === "playback") currentCursor = 1;
					else {
						_fetchInFlight = false;
						loading = false;
						scanningStatus = "โหมดใหม่สุดต้องรู้ ID ล่าสุดก่อน — กด Find Latest หรือสลับลำดับ";
						toasts.add("ไม่ทราบ ID ล่าสุดสำหรับโหมดนี้ กด Find Latest", "warning");
						return;
					}
				}
				start = currentCursor;
			}
			const rangeEnd = sortOrder === "asc" ? start + itemsPerPage - 1 : Math.max(1, start - itemsPerPage + 1);
			if (assetType === "archive" || assetType === "playback") scanningStatus = `กำลังโหลดรายการใหม่ (${assets.length}–${assets.length + itemsPerPage}) ...`;
			else scanningStatus = sortOrder === "asc" ? `กำลังโหลด ID ${start}–${start + itemsPerPage - 1} ...` : `กำลังโหลด ID ${start}–${rangeEnd} (ใหม่ไปเก่า) ...`;
			try {
				let resp;
				if (assetType === "archive") {
					const skip = assets.length;
					resp = await fetch(`/api/assets/theater-archive?skip=${skip}&take=${itemsPerPage}`);
				} else if (assetType === "playback") {
					const skip = assets.length;
					resp = await fetch(`/api/assets/playback?skip=${skip}&take=${itemsPerPage}`);
				} else resp = await fetch(`/api/check-assets?start=${start}&count=${itemsPerPage}&type=${assetType}&order=${sortOrder}`);
				if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
				let newAssets;
				let archiveTotal = null;
				if (assetType === "archive" || assetType === "playback") {
					const envelope = await resp.json();
					newAssets = envelope.items ?? [];
					archiveTotal = envelope.total ?? null;
				} else newAssets = await resp.json();
				if (newAssets.length === 0) scanningStatus = `ไม่พบ asset ในช่วงนี้ ลองเปลี่ยนประเภทหรือลำดับ`;
				else {
					const existingIds = new Set(assets.map((a) => a.id));
					const filteredNew = newAssets.filter((a) => !existingIds.has(a.id));
					assets = [...assets, ...filteredNew];
					if (assetType !== "archive" && assetType !== "playback") if (sortOrder === "asc") currentCursor = start + itemsPerPage;
					else currentCursor = Math.min(...newAssets.map((a) => parseInt(a.id))) - 1;
					if ((assetType === "archive" || assetType === "playback") && archiveTotal !== null) scanningStatus = assets.length >= archiveTotal ? `โหลดครบแล้ว ${assets.length} รายการ` : `โหลดแล้ว ${assets.length} / ${archiveTotal} รายการ`;
					else scanningStatus = "";
				}
			} catch (error) {
				console.error(error);
				scanningStatus = "เกิดข้อผิดพลาดในการโหลด";
				setTimeout(() => scanningStatus = "", 3e3);
				toasts.add("เกิดข้อผิดพลาดในการโหลด", "error");
			} finally {
				_fetchInFlight = false;
				loading = false;
			}
		}
		async function findLatestAdaptive() {
			if (_fetchInFlight) return;
			if (assetType === "archive" || assetType === "playback") {
				resetAndLoad();
				return;
			}
			_fetchInFlight = true;
			loading = true;
			assets = [];
			scanningStatus = "กำลังหา ID ล่าสุด...";
			try {
				const apiResp = await fetch(`/api/check-assets/latest?type=${assetType}`);
				if (apiResp.ok) {
					const latest = await apiResp.json();
					if (latest && latest.id && latest.id !== "0" && latest.id !== "0000") {
						const latestId = parseInt(latest.id);
						scanningStatus = `พบ ID ล่าสุด = ${latestId}`;
						if (sortOrder !== "desc") sortOrder = "desc";
						currentCursor = latestId;
						_fetchInFlight = false;
						await loadNextBatch();
						return;
					}
				}
				scanningStatus = "ไม่พบ asset เลย หรือเกิดข้อผิดพลาดจาก Server";
			} catch (err) {
				console.error(err);
				scanningStatus = "เกิดข้อผิดพลาด";
				toasts.add("ค้นหาล่าสุดไม่สำเร็จ", "error");
			} finally {
				_fetchInFlight = false;
				loading = false;
			}
		}
		function resetAndLoad() {
			assets = [];
			if (assetType === "archive" || assetType === "playback") {
				loadNextBatch();
				return;
			}
			if (sortOrder === "asc") {
				currentCursor = 1;
				loadNextBatch();
			} else {
				currentCursor = null;
				findLatestAdaptive();
			}
		}
		function productThumbCandidates(assetId) {
			const id = parseInt(assetId, 10);
			if (!Number.isFinite(id)) return null;
			const base = `/api/image/product/${assetId}`;
			if (id >= 422 && id <= 750) {
				const out = [`${base}/sku-1.jpg`, `${base}/sku-1.png`];
				for (let r = 1; r <= 6; r++) out.push(`${base}/SAT-Round${r}.png`, `${base}/SAT-Round${r}.jpg`, `${base}/SUN-Round${r}.png`, `${base}/SUN-Round${r}.jpg`);
				return out;
			}
			if (id >= 850 && id <= 914) {
				const out = [`${base}/sku-1.jpg`, `${base}/sku-1.png`];
				for (let r = 1; r <= 6; r++) out.push(`${base}/Round${r}.png`, `${base}/Round${r}.jpg`);
				return out;
			}
			return null;
		}
		derived(() => {
			return [];
		});
		function assetThumbSrc(asset) {
			if (assetType !== "product" && assetType !== "archive" && assetType !== "playback") return asset.url;
			if (asset.imageFileUrlList?.length) return asset.imageFileUrlList[0] ?? asset.url;
			const c = productThumbCandidates(asset.id);
			if (c) return c[0] ?? asset.url;
			return asset.url;
		}
		let jumpToId = "";
		const loadMoreLabel = () => sortOrder === "asc" ? "โหลดเพิ่ม (รุ่นเก่า)" : "Load More";
		let visibleStart = 0;
		let visibleEnd = 100;
		derived(() => assets.slice(visibleStart, visibleEnd));
		$$renderer.push(`<div class="page-shell"><div class="co-page-hero"><div class="co-page-hero__main"><span class="mono-label">Visual infrastructure</span> <h1 class="hero-display">Asset registry</h1> <p class="body-large">Technical repository for indexing and discovering official
				imagery assets and product media.</p></div></div> <div class="technical-filter-bar"><div class="filter-pills"><button type="button"${attr_class("button-pill-outline taxonomy-chip", void 0, { "active": assetType === "product" })}>Products</button> <button type="button"${attr_class("button-pill-outline taxonomy-chip", void 0, { "active": assetType === "group" })}>Collectives</button> <button type="button"${attr_class("button-pill-outline taxonomy-chip", void 0, { "active": assetType === "archive" })}>Archive</button> <button type="button"${attr_class("button-pill-outline taxonomy-chip", void 0, { "active": assetType === "playback" })}>Playback</button></div> <div class="technical-select">`);
		$$renderer.select({ value: sortOrder }, ($$renderer) => {
			$$renderer.option({ value: "desc" }, ($$renderer) => {
				$$renderer.push(`Latest archives`);
			});
			$$renderer.option({ value: "asc" }, ($$renderer) => {
				$$renderer.push(`Historical first`);
			});
		});
		$$renderer.push(`</div> <div class="search-box jump-box"><input type="number" placeholder="Jump to node ID"${attr("value", jumpToId)}/> <button type="button" class="jump-trigger" aria-label="Jump to ID"><i class="fa-solid fa-arrow-right"></i></button></div></div> `);
		if (loading || scanningStatus && !scanningStatus.includes("เสร็จ")) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="status-stream"><div class="status-node mb-4">`);
			if (loading) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<i class="fa-solid fa-spinner fa-spin me-2"></i>`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<i class="fa-solid fa-circle-notch fa-spin me-2 opacity-50"></i>`);
			}
			$$renderer.push(`<!--]--> <span class="mono-label">${escape_html(scanningStatus)}</span></div></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="asset-grid">`);
		if (visibleStart > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg" width="100%"${attr("height", visibleStart * 2)} aria-hidden="true" role="presentation"></svg>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <!--[-->`);
		const each_array = ensure_array_like(assets);
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let asset = each_array[$$index];
			$$renderer.push(`<div class="editorial-card" role="button" tabindex="0"><div class="media-wrap"><img${attr("src", assetThumbSrc(asset))}${attr("alt", asset.title ?? asset.id)} loading="lazy" onload="this.__e=event" onerror="this.__e=event"/> <div class="node-id">#${escape_html(asset.id)}</div></div> <div class="card-overlay"><i class="fa-solid fa-expand"></i></div></div>`);
		}
		$$renderer.push(`<!--]--> `);
		if (visibleEnd < assets.length) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg" width="100%"${attr("height", (assets.length - visibleEnd) * 2)} aria-hidden="true" role="presentation"></svg>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div> <div class="load-more-container"><button class="button-secondary load-more-container"${attr("disabled", loading, true)}>${escape_html(loadMoreLabel())}</button></div></div> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
export { _page as default };
