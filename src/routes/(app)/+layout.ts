import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { isTauri } from '$lib/api';
import { supabase } from '$lib/supabase';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data }) => {
	if (data.session) {
		return { session: data.session };
	}

	// Tauri / SPA: session may exist only in Supabase client storage (no HttpOnly cookie yet).
	if (browser && isTauri()) {
		const {
			data: { session }
		} = await supabase.auth.getSession();
		if (session) {
			return {
				session: {
					access_token: session.access_token,
					refresh_token: session.refresh_token ?? ''
				}
			};
		}
	}

	throw redirect(302, '/login');
};
