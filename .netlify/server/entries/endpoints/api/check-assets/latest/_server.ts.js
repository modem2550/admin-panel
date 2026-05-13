import { t as supabaseAdmin } from "../../../../../chunks/supabase.server.js";
import { d as getDefaultAssetUrl } from "../../../../../chunks/bnk48.js";
import { json } from "@sveltejs/kit";
import https from "node:https";
//#region src/routes/api/check-assets/latest/+server.ts
async function checkExists(urlStr) {
	return new Promise((resolve) => {
		const req = https.request(urlStr, {
			method: "GET",
			timeout: 3e3,
			headers: {
				"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
				"Accept": "*/*"
			}
		}, (res) => {
			res.destroy();
			resolve(res.statusCode === 200);
		});
		req.on("timeout", () => {
			req.destroy();
			resolve(false);
		});
		req.on("error", () => resolve(false));
		req.end();
	});
}
var cache = /* @__PURE__ */ new Map();
var CACHE_TTL = 1e3 * 60 * 15;
async function theaterExists(id) {
	try {
		const perfResp = await fetch(`https://public.bnk48.io/performance/${id}`);
		if (!perfResp.ok) return false;
		const perf = await perfResp.json();
		return Boolean(perf?.eventId) && perf.type === "theater";
	} catch {
		return false;
	}
}
async function shopProductExists(id) {
	try {
		const resp = await fetch(`https://public.bnk48.io/shop/product/${id}`);
		if (!resp.ok) return false;
		return typeof (await resp.json())?.id === "number";
	} catch {
		return false;
	}
}
var GET = async ({ url }) => {
	const type = url.searchParams.get("type") || "product";
	if (type === "theater") {
		const cached = cache.get(type);
		if (cached && cached.expires > Date.now()) return json(cached.data);
		let low = 1;
		let high = 5e3;
		let lastFound = 0;
		while (low <= high) {
			const mid = Math.floor((low + high) / 2);
			if (await theaterExists(mid)) {
				lastFound = mid;
				low = mid + 1;
			} else high = mid - 1;
		}
		let probe = lastFound + 1;
		let misses = 5;
		while (misses > 0 && probe <= 8e3) {
			if (await theaterExists(probe)) {
				lastFound = probe;
				misses = 5;
			} else misses -= 1;
			probe += 1;
		}
		const result = {
			id: String(lastFound || 294),
			url: ""
		};
		cache.set(type, {
			data: result,
			expires: Date.now() + CACHE_TTL
		});
		return json(result);
	}
	if (type === "product") {
		const cached = cache.get(type);
		if (cached && cached.expires > Date.now()) return json(cached.data);
		console.log(`[API/Latest] Searching latest product via shop API...`);
		const startTime = Date.now();
		let low = 0;
		let high = 15e3;
		let lastFoundId = 0;
		while (low <= high) {
			const mid = Math.floor((low + high) / 2);
			if (await shopProductExists(mid)) {
				lastFoundId = mid;
				low = mid + 1;
			} else high = mid - 1;
		}
		let checkId = lastFoundId + 1;
		let gapLimit = 3;
		while (gapLimit > 0 && checkId <= 16e3) {
			if (await shopProductExists(checkId)) {
				lastFoundId = checkId;
				gapLimit = 3;
			} else gapLimit--;
			checkId++;
		}
		if (lastFoundId > 0) {
			let thumbUrl = "";
			try {
				const r = await fetch(`https://public.bnk48.io/shop/product/${lastFoundId}`);
				if (r.ok) {
					const p = await r.json();
					if (typeof p.thumbnailImageUrl === "string") thumbUrl = p.thumbnailImageUrl.startsWith("https://img.bnk48cdn.net/") ? p.thumbnailImageUrl.replace("https://img.bnk48cdn.net/", "/p/img/") : p.thumbnailImageUrl;
				}
			} catch {}
			console.log(`[API/Latest] Found latest product: ${lastFoundId} (Took ${Date.now() - startTime}ms)`);
			const result = {
				id: lastFoundId.toString(),
				url: thumbUrl
			};
			cache.set(type, {
				data: result,
				expires: Date.now() + CACHE_TTL
			});
			return json(result);
		}
		return json({
			id: "0",
			url: ""
		});
	}
	const cached = cache.get(type);
	if (cached && cached.expires > Date.now()) return json(cached.data);
	console.log(`[API/Latest] Searching latest ${type}...`);
	const startTime = Date.now();
	const { data: maxRow, error: dbErr } = await supabaseAdmin.from("cdn_assets").select("id, url").eq("type", type).order("id", { ascending: false }).limit(1).maybeSingle();
	if (!dbErr && maxRow) {
		console.log(`[API/Latest] Found latest ${type}: ${maxRow.id} from DB (Took ${Date.now() - startTime}ms)`);
		const result = {
			id: maxRow.id.toString(),
			url: maxRow.url || getDefaultAssetUrl(type, maxRow.id)
		};
		cache.set(type, {
			data: result,
			expires: Date.now() + CACHE_TTL
		});
		return json(result);
	}
	console.log(`[API/Latest] DB empty for ${type}, falling back to binary search...`);
	async function quickProbe(id) {
		const idStr = id.toString();
		let quickUrls;
		if (type === "group") quickUrls = [`https://img.bnk48cdn.net/shop/product-group/${idStr}.jpg`, `https://img.bnk48cdn.net/shop/product-group/${idStr}.png`];
		else {
			quickUrls = [`https://img.bnk48cdn.net/shop/product/${idStr}/sku-1.jpg`, `https://img.bnk48cdn.net/shop/product/${idStr}/sku-1.png`];
			const fallbackUrl = `https://img.bnk48cdn.net/${getDefaultAssetUrl("product", id).replace("/p/img/", "")}`;
			if (!quickUrls.includes(fallbackUrl)) quickUrls.push(fallbackUrl);
		}
		return (await Promise.all(quickUrls.map((u) => checkExists(u)))).some((r) => r === true);
	}
	let low = 0;
	let high = type === "product" ? 1e4 : 3e3;
	let lastFoundId = 0;
	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		if (await quickProbe(mid)) {
			lastFoundId = mid;
			low = mid + 1;
		} else high = mid - 1;
	}
	let checkId = lastFoundId + 1;
	let gapLimit = 3;
	while (gapLimit > 0 && checkId <= (type === "product" ? 1e4 : 3e3)) {
		if (await quickProbe(checkId)) {
			lastFoundId = checkId;
			gapLimit = 3;
		} else gapLimit--;
		checkId++;
	}
	if (lastFoundId > 0) {
		console.log(`[API/Latest] Found latest ${type}: ${lastFoundId} via binary search (Took ${Date.now() - startTime}ms)`);
		const result = {
			id: lastFoundId.toString(),
			url: getDefaultAssetUrl(type, lastFoundId)
		};
		cache.set(type, {
			data: result,
			expires: Date.now() + CACHE_TTL
		});
		return json(result);
	}
	console.log(`[API/Latest] No ${type} found (Took ${Date.now() - startTime}ms)`);
	return json({
		id: "0",
		url: ""
	});
};
//#endregion
export { GET };
