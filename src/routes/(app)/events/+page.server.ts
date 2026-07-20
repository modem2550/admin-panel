import { fail } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/supabase.server';
import type { Actions, PageServerLoad } from './$types';

export interface EventItem {
	id: number;
	date: string;
	end_date: string | null;
	title: string;
	location: string | null;
	link: string | null;
	image_url: string | null;
	live: string | null;
	image_urls: string[] | null;
	image_path: string | null;
	updated_at: string;
}

export const load: PageServerLoad = async () => {
	const tableCandidates = ['events', 'events_past'];
	let events: EventItem[] = [];
	let errorMessage: string | null = null;
	let eventTable = 'events';

	for (const table of tableCandidates) {
		const { data, error } = await supabaseAdmin
			.from(table)
			.select('*')
			.order('date', { ascending: false });

		if (error) {
			if (table === 'events' && error.code === 'PGRST205' && error.message.includes("public.events")) {
				continue;
			}

			console.error('[events] Supabase error:', error.message);
			errorMessage = error.message;
			break;
		}

		events = (data ?? []) as EventItem[];
		eventTable = table;
		break;
	}

	return { events, error: errorMessage, eventTable };
};

export const actions: Actions = {
	updateEvent: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		const table = String(form.get('table') ?? 'events');
		const title = String(form.get('title') ?? '').trim();
		const date = String(form.get('date') ?? '').trim();

		if (!id || !title || !date) {
			return fail(400, { error: 'Event ID, title, and date are required.' });
		}

		const imageUrlsRaw = String(form.get('image_urls') ?? '').trim();
		let image_urls: string[] | null = null;

		if (imageUrlsRaw) {
			try {
				if (imageUrlsRaw.startsWith('[')) {
					image_urls = JSON.parse(imageUrlsRaw);
				} else {
					image_urls = imageUrlsRaw
						.split(/\r?\n|,/) 
						.map((item) => item.trim())
						.filter(Boolean);
				}
			} catch {
				image_urls = imageUrlsRaw
					.split(/\r?\n|,/) 
					.map((item) => item.trim())
					.filter(Boolean);
			}
		}

		const payload = {
			title,
			date,
			end_date: String(form.get('end_date') ?? '').trim() || null,
			location: String(form.get('location') ?? '').trim() || null,
			link: String(form.get('link') ?? '').trim() || null,
			image_url: String(form.get('image_url') ?? '').trim() || null,
			live: String(form.get('live') ?? '').trim() || null,
			image_urls,
		};

		const { error } = await supabaseAdmin
			.from(table)
			.update(payload)
			.eq('id', id);

		if (error) {
			console.error('[events] update error:', error.message);
			return fail(500, { error: error.message });
		}

		return { success: true };
	}
};
