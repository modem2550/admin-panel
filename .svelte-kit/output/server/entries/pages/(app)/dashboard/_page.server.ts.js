import { t as supabaseAdmin } from "../../../../chunks/supabase.server.js";
import { redirect } from "@sveltejs/kit";
//#region src/routes/(app)/dashboard/+page.server.ts
var load = async ({ parent }) => {
	const { session } = await parent();
	if (!session) throw redirect(303, "/login");
	const [membersResult, eventsResult, nextEventResult, adsResponse] = await Promise.all([
		supabaseAdmin.from("members").select("*", {
			count: "exact",
			head: true
		}),
		supabaseAdmin.from("event_data").select("*", {
			count: "exact",
			head: true
		}),
		supabaseAdmin.from("event_data").select("*").gte("date", (/* @__PURE__ */ new Date()).toISOString().split("T")[0]).order("date", { ascending: true }).limit(1).maybeSingle(),
		fetch("https://public.bnk48.io/ads").then((res) => res.json()).catch(() => null)
	]);
	let champSplashUrl = null;
	if (adsResponse?.sections) {
		const splashSection = adsResponse.sections.find((s) => s.type === "splash-screen");
		if (splashSection) {
			const champItem = (splashSection.ads?.find((ad) => ad.code === "champ-of-the-week"))?.items?.find((item) => item.imageUrl);
			if (champItem) champSplashUrl = champItem.imageUrl;
		}
	}
	return {
		membersCount: membersResult.count ?? 0,
		eventsCount: eventsResult.count ?? 0,
		nextEvent: nextEventResult.data ?? null,
		champSplashUrl
	};
};
//#endregion
export { load };
