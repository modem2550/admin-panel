import { redirect } from "@sveltejs/kit";
//#region src/routes/(app)/dashboard/+page.server.ts
var load = async ({ locals }) => {
	if (!locals.session) throw redirect(303, "/login");
	return {};
};
//#endregion
export { load };
