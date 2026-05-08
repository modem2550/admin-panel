import { supabase } from '$lib/supabase';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const { data: members, error } = await supabase
		.from('members')
		.select('*')
		.order('id', { ascending: true });

	if (error) {
		console.error('Error fetching members:', error);
		return { members: [] };
	}

	return { members };
};
