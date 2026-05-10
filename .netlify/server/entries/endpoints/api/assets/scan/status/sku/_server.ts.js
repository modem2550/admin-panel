import { t as supabaseAdmin } from "../../../../../../../chunks/supabase.server.js";
import { error, json } from "@sveltejs/kit";
import https from "node:https";
//#region src/routes/api/assets/scan/status/sku/+server.ts
var TIMEOUT_MS = 3e3;
var MAX_SKU = 10;
async function headExists(urlStr) {
	return new Promise((resolve) => {
		const req = https.request(urlStr, {
			method: "HEAD",
			timeout: TIMEOUT_MS,
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Accept": "*/*"
			}
		}, (res) => {
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
	const { data: existing, error: dbErr } = await supabaseAdmin.from("cdn_assets").select("skus").eq("id", id).eq("type", type).maybeSingle();
	if (dbErr) throw error(500, "DB error");
	if (existing?.skus && existing.skus.length > 1) return json({ skus: existing.skus });
	const idStr = id.toString();
	const foundSkus = [1, ...(await Promise.all(Array.from({ length: MAX_SKU - 1 }, async (_, i) => {
		const sku = i + 2;
		const jpgUrl = `https://img.bnk48cdn.net/shop/product/${idStr}/sku-${sku}.jpg`;
		const pngUrl = `https://img.bnk48cdn.net/shop/product/${idStr}/sku-${sku}.png`;
		if (await headExists(jpgUrl)) return sku;
		if (await headExists(pngUrl)) return sku;
		return null;
	}))).filter((s) => s !== null)];
	supabaseAdmin.from("cdn_assets").update({
		skus: foundSkus,
		last_seen: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", id).eq("type", type).then(() => {});
	return json({ skus: foundSkus });
};
//#endregion
export { GET };
