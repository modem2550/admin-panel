import { error, json } from "@sveltejs/kit";
//#region src/routes/api/check-assets/+server.ts
var MAX_COUNT = 250;
var ALLOWED_TYPES = new Set(["product", "group"]);
var ALLOWED_ORDERS = new Set(["asc", "desc"]);
async function checkUrl(targetUrl) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 4e3);
	try {
		const resp = await fetch(targetUrl, {
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
	const startRaw = parseInt(url.searchParams.get("start") || "0");
	const countRaw = parseInt(url.searchParams.get("count") || "50");
	const type = url.searchParams.get("type") || "product";
	const order = url.searchParams.get("order") || "asc";
	const includeSkus = url.searchParams.get("includeSkus") === "true";
	if (!ALLOWED_TYPES.has(type)) throw error(400, "Invalid type parameter");
	if (!ALLOWED_ORDERS.has(order)) throw error(400, "Invalid order parameter");
	if (isNaN(startRaw) || startRaw < 0) throw error(400, "Invalid start parameter");
	if (isNaN(countRaw) || countRaw < 1) throw error(400, "Invalid count parameter");
	const start = startRaw;
	const count = Math.min(countRaw, MAX_COUNT);
	let ids = [];
	if (order === "asc") for (let i = start; i < start + count; i++) ids.push(i);
	else for (let i = start; i > start - count && i >= 0; i--) ids.push(i);
	const batchSize = 20;
	const validAssets = [];
	for (let i = 0; i < ids.length; i += batchSize) {
		const batchIds = ids.slice(i, i + batchSize);
		const batchResults = await Promise.all(batchIds.map(async (idNum) => {
			const id = idNum.toString().padStart(4, "0");
			if (!await checkUrl(type === "product" ? `https://img.bnk48cdn.net/shop/product/${id}/sku-1.jpg` : `https://img.bnk48cdn.net/shop/product-group/${id}.jpg`)) return [];
			const mainAsset = {
				id: idNum.toString(),
				url: type === "product" ? `/p/img/shop/product/${id}/sku-1.jpg` : `/p/img/shop/product-group/${id}.jpg`,
				extra_skus: []
			};
			if (type === "product" && includeSkus) {
				const skuUrls = Array.from({ length: 7 }, (_, i) => {
					return `https://img.bnk48cdn.net/shop/product/${id}/sku-${i + 2}.jpg`;
				});
				mainAsset.extra_skus = (await Promise.all(skuUrls.map(async (skuUrl, idx) => {
					return await checkUrl(skuUrl) ? `/p/img/shop/product/${id}/sku-${idx + 2}.jpg` : null;
				}))).filter((r) => r !== null);
			}
			return [mainAsset];
		}));
		validAssets.push(...batchResults.flat());
	}
	return json(validAssets, { headers: { "Cache-Control": "public, max-age=300" } });
};
//#endregion
export { GET };
