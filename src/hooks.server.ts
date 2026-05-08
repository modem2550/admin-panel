import { supabase } from '$lib/supabase';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionCookie = event.cookies.get('sb-session');

	if (sessionCookie) {
		try {
			const session = JSON.parse(sessionCookie);
			event.locals.session = session;
			event.locals.supabase = supabase;
		} catch (e) {
			event.locals.session = null;
			event.locals.supabase = supabase;
		}
	} else {
		event.locals.session = null;
		event.locals.supabase = supabase;
	}

	return resolve(event);
};
