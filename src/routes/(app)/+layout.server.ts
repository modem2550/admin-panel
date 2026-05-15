import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/** ยึด session จาก HttpOnly cookie (locals) — ไม่พึ่ง getSession() บน client ที่ persistSession: false */
export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.session) {
		throw redirect(303, '/login');
	}
	return {
		session: locals.session
	};
};
