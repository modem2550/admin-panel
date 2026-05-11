import { t as supabaseAdmin } from "../../../../chunks/supabase.server.js";
import { d as getDefaultAssetUrl } from "../../../../chunks/bnk48.js";
import { error, json } from "@sveltejs/kit";
//#region src/routes/api/check-assets/+server.ts
var MAX_COUNT = 250;
var ALLOWED_TYPES = new Set(["product", "group"]);
var ALLOWED_ORDERS = new Set(["asc", "desc"]);
var GET = async ({ url }) => {
	const startRaw = parseInt(url.searchParams.get("start") || "0");
	const countRaw = parseInt(url.searchParams.get("count") || "50");
	const type = url.searchParams.get("type") || "product";
	const order = url.searchParams.get("order") || "asc";
	if (!ALLOWED_TYPES.has(type)) throw error(400, "Invalid type parameter");
	if (!ALLOWED_ORDERS.has(order)) throw error(400, "Invalid order parameter");
	if (isNaN(startRaw) || startRaw < 0) throw error(400, "Invalid start parameter");
	if (isNaN(countRaw) || countRaw < 1) throw error(400, "Invalid count parameter");
	const count = Math.min(countRaw, MAX_COUNT);
	const rangeStart = order === "asc" ? Math.max(1, startRaw) : Math.max(1, startRaw - count + 1);
	const rangeEnd = order === "asc" ? rangeStart + count - 1 : Math.max(1, startRaw);
	try {
		const { data: rows, error: dbErr } = await supabaseAdmin.from("cdn_assets").select("id, url, skus, extra_urls").eq("type", type).gte("id", rangeStart).lte("id", rangeEnd).order("id", { ascending: order === "asc" }).limit(count);
		if (!dbErr && rows && rows.length > 0) return json(rows.map((row) => {
			const idStr = row.id.toString();
			let actualUrl = row.extra_urls?.[0] || row.url;
			if (!actualUrl || actualUrl === "") actualUrl = getDefaultAssetUrl(type, row.id);
			if (actualUrl.startsWith("https://img.bnk48cdn.net/")) actualUrl = actualUrl.replace("https://img.bnk48cdn.net/", "/p/img/");
			return {
				id: idStr,
				url: actualUrl,
				extra_skus: []
			};
		}), { headers: { "Cache-Control": "public, max-age=60" } });
	} catch {}
	const assets = [];
	if (order === "asc") for (let id = rangeStart; id <= rangeEnd && assets.length < count; id++) assets.push({
		id: id.toString(),
		url: getDefaultAssetUrl(type, id),
		extra_skus: []
	});
	else for (let id = rangeEnd; id >= rangeStart && assets.length < count; id--) assets.push({
		id: id.toString(),
		url: getDefaultAssetUrl(type, id),
		extra_skus: []
	});
	return json(assets, { headers: { "Cache-Control": "public, max-age=60" } });
};
//#endregion
export { GET };
