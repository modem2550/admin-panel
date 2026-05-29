import { d as getCDNDiscoveryUrls } from "../../../../../../../chunks/bnk48.js";
import { t as supabaseAdmin } from "../../../../../../../chunks/supabase.server.js";
import { error, json } from "@sveltejs/kit";
import https from "node:https";
//#region src/routes/api/assets/scan/status/sku/+server.ts
var TIMEOUT_MS = 3e3;
async function headExists(urlStr) {
	return new Promise((resolve) => {
		const req = https.request(urlStr, {
			method: "GET",
			timeout: TIMEOUT_MS,
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
var GET = async ({ url }) => {
	const idParam = url.searchParams.get("id");
	const type = url.searchParams.get("type") || "product";
	if (!idParam) throw error(400, "Missing id");
	const id = parseInt(idParam);
	if (isNaN(id)) throw error(400, "Invalid id");
	const { data: existing, error: dbErr } = await supabaseAdmin.from("cdn_assets").select("skus, extra_urls").eq("id", id).eq("type", type).maybeSingle();
	if (dbErr) throw error(500, "DB error");
	if (existing && Array.isArray(existing.extra_urls)) return json({
		urls: existing.extra_urls,
		skus: existing.skus || []
	});
	const candidates = getCDNDiscoveryUrls(type, id);
	const validUrls = [];
	const validSkus = [1];
	const checkResults = await Promise.all(candidates.map(async (url) => {
		if (await headExists(url)) return url;
		return null;
	}));
	for (const url of checkResults) if (url) {
		const proxyUrl = url.replace("https://img.bnk48cdn.net/shop/", "/api/image/");
		validUrls.push(proxyUrl);
		const match = url.match(/(\d+)\.\w+$/);
		if (match) {
			const num = parseInt(match[1]);
			if (!validSkus.includes(num)) validSkus.push(num);
		}
	}
	const foundSkus = validSkus.sort((a, b) => a - b);
	supabaseAdmin.from("cdn_assets").update({
		skus: foundSkus,
		extra_urls: validUrls,
		last_seen: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", id).eq("type", type).then(() => {});
	return json({
		skus: foundSkus,
		urls: validUrls
	});
};
//#endregion
export { GET };
