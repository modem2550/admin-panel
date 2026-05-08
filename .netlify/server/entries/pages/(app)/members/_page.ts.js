import { t as supabase } from "../../../../chunks/supabase.js";
//#region src/routes/(app)/members/+page.ts
var load = async () => {
	const { data: members, error } = await supabase.from("members").select("*").order("id", { ascending: true });
	if (error) {
		console.error("Error fetching members:", error);
		return { members: [] };
	}
	return { members };
};
//#endregion
export { load };
