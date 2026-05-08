import { redirect } from "@sveltejs/kit";
//#region src/routes/(app)/dashboard/+page.server.ts
var load = async ({ locals }) => {
	console.log("[Dashboard Load] Checking session...", { hasSession: !!locals.session });
	if (!locals.session) {
		console.warn("[Dashboard Load] No session found in locals. Redirecting to /login");
		throw redirect(303, "/login");
	}
	return {};
};
//#endregion
export { load };
