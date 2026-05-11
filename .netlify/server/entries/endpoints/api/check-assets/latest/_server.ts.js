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
var GET = async ({ url }) => {
	const type = url.searchParams.get("type") || "product";
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
