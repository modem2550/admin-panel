import { t as supabase } from "../../../../chunks/supabase.js";
//#region src/routes/(app)/dashboard/+page.ts
var load = async ({ fetch }) => {
	const [membersResult, eventsResult, nextEventResult] = await Promise.all([
		supabase.from("members").select("*", {
			count: "exact",
			head: true
		}),
		supabase.from("event_data").select("*", {
			count: "exact",
			head: true
		}),
		supabase.from("event_data").select("*").gte("date", (/* @__PURE__ */ new Date()).toISOString().split("T")[0]).order("date", { ascending: true }).limit(1).maybeSingle()
	]);
	return {
		membersCount: membersResult.count ?? 0,
		eventsCount: eventsResult.count ?? 0,
		nextEvent: nextEventResult.data ?? null
	};
};
//#endregion
export { load };
