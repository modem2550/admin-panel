import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// ถ้ายังไม่มี session → ไปหน้า login
	if (!locals.session) {
		throw redirect(302, `/login?redirectTo=${url.pathname}`);
	}

	return {
		session: {
			access_token: locals.session.access_token,
			refresh_token: locals.session.refresh_token ?? ''
		}
	};
};