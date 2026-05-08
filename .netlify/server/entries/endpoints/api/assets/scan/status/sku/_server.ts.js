import { n as supabaseAdmin } from "../../../../../../../chunks/supabase.js";
import { error, json } from "@sveltejs/kit";
//#region src/routes/api/assets/scan/status/sku/+server.ts
var TIMEOUT_MS = 2e3;
var MAX_SKU = 5;
async function headExists(url) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const resp = await fetch(url, {
			method: "HEAD",
			signal: controller.signal
		});
		clearTimeout(timeout);
		return resp.ok;
	} catch {
		clearTimeout(timeout);
		return false;
	}
}
var GET = async ({ url }) => {
	const idParam = url.searchParams.get("id");
	const type = url.searchParams.get("type") || "product";
	if (!idParam) throw error(400, "Missing id");
	const id = parseInt(idParam);
	if (isNaN(id)) throw error(400, "Invalid id");
	const { data: existing } = await supabaseAdmin.from("cdn_assets").select("skus").eq("id", id).eq("type", type).maybeSingle();
	if (existing && existing.skus.length > 1) return json({ skus: existing.skus });
	const padded = id.toString().padStart(4, "0");
	const foundSkus = [1, ...(await Promise.all(Array.from({ length: MAX_SKU - 1 }, (_, i) => {
		const sku = i + 2;
		return headExists(`https://img.bnk48cdn.net/shop/product/${padded}/sku-${sku}.jpg`).then((exists) => exists ? sku : null);
	}))).filter((s) => s !== null)];
	await supabaseAdmin.from("cdn_assets").update({
		skus: foundSkus,
		last_seen: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", id).eq("type", type);
	return json({ skus: foundSkus });
};
//#endregion
export { GET };
