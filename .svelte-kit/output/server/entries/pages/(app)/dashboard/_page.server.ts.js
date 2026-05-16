import { redirect } from "@sveltejs/kit";
//#region src/routes/(app)/dashboard/+page.server.ts
var load = async ({ locals }) => {
	if (!locals.session) throw redirect(303, "/login");
	const supabase = locals.supabase;
	const [membersResult, eventsResult, nextEventResult, adsResponse] = await Promise.all([
		supabase.from("members").select("*", {
			count: "exact",
			head: true
		}),
		supabase.from("event_data").select("*", {
			count: "exact",
			head: true
		}),
		supabase.from("event_data").select("*").gte("date", (/* @__PURE__ */ new Date()).toISOString().split("T")[0]).order("date", { ascending: true }).limit(1).maybeSingle(),
		fetch("https://public.bnk48.io/ads", { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" } }).then((res) => res.json()).catch(() => null)
	]);
	let champSplashUrl = null;
	if (adsResponse && adsResponse.sections) {
		const splashSection = adsResponse.sections.find((s) => s.type === "splash-screen");
		if (splashSection) for (const ad of splashSection.ads) {
			const item = ad.items.find((i) => i.code === "champ-of-the-week/376");
			if (item) {
				champSplashUrl = item.imageUrl;
				break;
			}
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
