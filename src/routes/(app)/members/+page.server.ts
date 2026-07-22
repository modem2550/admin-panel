import { fail } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/supabase.server';
import type { Actions, PageServerLoad } from './$types';

export interface MemberItem {
	id: number;
	name: string;
	real_name: string | null;
	brand: string | null;
	gen: string | null;
	team: string | null;
	profile_image_url: string | null;
	graduated_at: string | null;
	created_at: string;
}

export const load: PageServerLoad = async () => {
	const { data, error } = await supabaseAdmin
		.from('members')
		.select('*')
		.order('brand', { ascending: true })
		.order('name', { ascending: true });

	if (error) {
		console.error('[members] Supabase error:', error.message);
		return { members: [] as MemberItem[], error: error.message };
	}

	return { members: (data ?? []) as MemberItem[], error: null };
};

export const actions: Actions = {
	createMember: async ({ request }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();

		if (!name) {
			return fail(400, { error: 'Member name is required.' });
		}

		const payload = {
			name,
			real_name: String(form.get('real_name') ?? '').trim() || null,
			brand: String(form.get('brand') ?? '').trim() || null,
			gen: String(form.get('gen') ?? '').trim() || null,
			team: String(form.get('team') ?? '').trim() || null,
			profile_image_url: String(form.get('profile_image_url') ?? '').trim() || null,
			graduated_at: String(form.get('graduated_at') ?? '').trim() || null,
			created_at: new Date().toISOString()
		};

		const { error } = await supabaseAdmin
			.from('members')
			.insert(payload);

		if (error) {
			console.error('[members] insert error:', error.message);
			return fail(500, { error: error.message });
		}

		return { success: true };
	},
	updateMember: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		const name = String(form.get('name') ?? '').trim();

		if (!id || !name) {
			return fail(400, { error: 'Member ID and name are required.' });
		}

		const payload = {
			name,
			real_name: String(form.get('real_name') ?? '').trim() || null,
			brand: String(form.get('brand') ?? '').trim() || null,
			gen: String(form.get('gen') ?? '').trim() || null,
			team: String(form.get('team') ?? '').trim() || null,
			profile_image_url: String(form.get('profile_image_url') ?? '').trim() || null,
			graduated_at: String(form.get('graduated_at') ?? '').trim() || null,
		};

		const { error } = await supabaseAdmin
			.from('members')
			.update(payload)
			.eq('id', id);

		if (error) {
			console.error('[members] update error:', error.message);
			return fail(500, { error: error.message });
		}

		return { success: true };
	}
};
