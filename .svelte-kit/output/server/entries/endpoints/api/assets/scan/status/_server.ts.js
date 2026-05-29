import { t as supabaseAdmin } from "../../../../../../chunks/supabase.server.js";
import { error, json } from "@sveltejs/kit";
//#region src/routes/api/assets/scan/status/+server.ts
var GET = async ({ url, locals }) => {
	if (!locals.session) return json({ error: "Unauthorized" }, { status: 401 });
	const id = url.searchParams.get("id");
	if (!id) throw error(400, "Missing id");
	const { data, error: err } = await supabaseAdmin.from("cdn_scan_log").select("*").eq("id", id).single();
	if (err || !data) throw error(404, "Scan log not found");
	return json(data);
};
//#endregion
export { GET };
