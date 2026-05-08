// @ts-nocheck
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = async ({ locals }: Parameters<PageServerLoad>[0]) => {
	console.log('[Dashboard Load] Checking session...', { hasSession: !!locals.session });
	// Auth guard: redirect to login if no session
	if (!locals.session) {
		console.warn('[Dashboard Load] No session found in locals. Redirecting to /login');
		throw redirect(303, '/login');
	}
	return {};
};
