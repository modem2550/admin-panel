import { supabase } from '$lib/supabase';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const { data: events, error } = await supabase
		.from('event_data')
		.select('*')
		.order('date', { ascending: false });

	if (error) {
		console.error('Error fetching events:', error);
		return { events: [] };
	}

	return { events };
};
