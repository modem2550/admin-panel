import { t as supabase } from "../../../../chunks/supabase.js";
//#region src/routes/(app)/events/+page.ts
var load = async () => {
	const { data: events, error } = await supabase.from("event_data").select("*").order("date", { ascending: false });
	if (error) {
		console.error("Error fetching events:", error);
		return { events: [] };
	}
	return { events };
};
//#endregion
export { load };
