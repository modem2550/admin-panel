import { n as supabaseAdmin } from "../../../../../chunks/supabase.js";
import { error, json } from "@sveltejs/kit";
//#region src/routes/api/assets/scan/+server.ts
var SCAN_SECRET = void 0;
var UPPER_BOUND = {
	product: 6e3,
	group: 1200
};
var BATCH_SIZE = 50;
var TIMEOUT_MS = 2e3;
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
function makeUrl(type, id) {
	const padded = id.toString().padStart(4, "0");
	return type === "product" ? `https://img.bnk48cdn.net/shop/product/${padded}/sku-1.jpg` : `https://img.bnk48cdn.net/shop/product-group/${padded}.jpg`;
}
var POST = async ({ request }) => {
	if (request.headers.get("x-scan-secret") !== SCAN_SECRET) throw error(401, "Unauthorized");
	const type = (await request.json().catch(() => ({}))).type === "group" ? "group" : "product";
	const { data: maxRow } = await supabaseAdmin.from("cdn_assets").select("id").eq("type", type).order("id", { ascending: false }).limit(1).maybeSingle();
	const startId = maxRow ? maxRow.id + 1 : 0;
	const endId = UPPER_BOUND[type];
	if (startId > endId) return json({
		message: "Already up to date",
		startId,
		endId
	});
	const { data: logRow } = await supabaseAdmin.from("cdn_scan_log").insert({
		type,
		status: "running"
	}).select("id").single();
	const logId = logRow.id;
	runScan(type, startId, endId, logId);
	return json({
		scan_log_id: logId,
		startId,
		endId
	});
};
async function runScan(type, startId, endId, logId) {
	const ids = [];
	for (let i = startId; i <= endId; i++) ids.push(i);
	let scannedCount = 0;
	let foundCount = 0;
	try {
		for (let i = 0; i < ids.length; i += BATCH_SIZE) {
			const batch = ids.slice(i, i + BATCH_SIZE);
			const found = (await Promise.all(batch.map(async (id) => {
				return await headExists(makeUrl(type, id)) ? id : null;
			}))).filter((id) => id !== null);
			scannedCount += batch.length;
			foundCount += found.length;
			if (found.length > 0) {
				const rows = found.map((id) => ({
					id,
					type,
					skus: [1],
					discovered_at: (/* @__PURE__ */ new Date()).toISOString(),
					last_seen: (/* @__PURE__ */ new Date()).toISOString()
				}));
				await supabaseAdmin.from("cdn_assets").upsert(rows, { onConflict: "id,type" });
			}
			if (i % (BATCH_SIZE * 10) === 0) await supabaseAdmin.from("cdn_scan_log").update({
				scanned_count: scannedCount,
				found_count: foundCount
			}).eq("id", logId);
		}
		await supabaseAdmin.from("cdn_scan_log").update({
			status: "done",
			finished_at: (/* @__PURE__ */ new Date()).toISOString(),
			scanned_count: scannedCount,
			found_count: foundCount
		}).eq("id", logId);
	} catch (err) {
		console.error("Scan error:", err);
		await supabaseAdmin.from("cdn_scan_log").update({
			status: "error",
			finished_at: (/* @__PURE__ */ new Date()).toISOString()
		}).eq("id", logId);
	}
}
//#endregion
export { POST };
