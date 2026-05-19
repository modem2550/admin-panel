import { d as getCDNDiscoveryUrls } from "../../../../../chunks/bnk48.js";
import { t as supabaseAdmin } from "../../../../../chunks/supabase.server.js";
import { error, json } from "@sveltejs/kit";
import { createHash, timingSafeEqual } from "node:crypto";
import https from "node:https";
//#region src/lib/secret-verify.server.ts
/** เปรียบเทียบ secret แบบคงที่เวลา (ลดการ leak ผ่าน timing — input ถูก hash เป็นความยาวคงที่) */
function timingSafeSecretMatch(provided, expected) {
	if (!provided || !expected) return false;
	try {
		return timingSafeEqual(createHash("sha256").update(provided, "utf8").digest(), createHash("sha256").update(expected, "utf8").digest());
	} catch {
		return false;
	}
}
//#endregion
//#region src/routes/api/assets/scan/+server.ts
var SCAN_SECRET = void 0;
var UPPER_BOUND = {
	product: 15e3,
	group: 2e3
};
var BATCH_SIZE = 50;
var TIMEOUT_MS = 2e3;
async function checkAnyExists(urls) {
	return (await Promise.all(urls.map(async (u) => {
		return new Promise((resolve) => {
			const req = https.request(u, {
				method: "HEAD",
				timeout: TIMEOUT_MS,
				headers: {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
					"Accept": "*/*"
				}
			}, (res) => {
				resolve(res.statusCode === 200 ? u : null);
			});
			req.on("timeout", () => {
				req.destroy();
				resolve(null);
			});
			req.on("error", () => resolve(null));
			req.end();
		});
	}))).find((r) => r !== null) ?? null;
}
function getDiscoveryUrls(type, id) {
	return getCDNDiscoveryUrls(type, id);
}
var POST = async ({ request }) => {
	if (!timingSafeSecretMatch(request.headers.get("x-scan-secret"), SCAN_SECRET)) throw error(401, "Unauthorized");
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
				const foundUrl = await checkAnyExists(getDiscoveryUrls(type, id));
				if (!foundUrl) return null;
				return {
					id,
					proxiedUrl: foundUrl.replace("https://img.bnk48cdn.net/", "/api/img/")
				};
			}))).filter((r) => r !== null);
			scannedCount += batch.length;
			foundCount += found.length;
			if (found.length > 0) {
				const rows = found.map(({ id, proxiedUrl }) => ({
					id,
					type,
					url: proxiedUrl,
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
