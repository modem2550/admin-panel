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
	const tablesToFetch = ['event_data', 'events_upcoming', 'events', 'events_past'];
	let allEvents: EventItem[] = [];
	let errorMessage: string | null = null;
	let defaultTable = 'event_data';

	for (const table of tablesToFetch) {
		const { data, error } = await supabaseAdmin
			.from(table)
			.select('*')
			.order('date', { ascending: false });

		if (error) {
			if (error.code !== 'PGRST205' && error.code !== '42P01') {
				console.error(`[events] Supabase error on table ${table}:`, error.message);
				if (!errorMessage) errorMessage = error.message;
			}
			continue;
		}

		// If event_data is the first successfully queried table, make sure we use it for inserts
		if (data && data.length > 0 && defaultTable === 'event_data') {
			defaultTable = table;
		}

		if (data) {
			allEvents.push(...(data as EventItem[]));
		}
	}

	// Deduplicate by ID just in case
	const uniqueEventsMap = new Map<number, EventItem>();
	for (const ev of allEvents) {
		if (!uniqueEventsMap.has(ev.id)) {
			uniqueEventsMap.set(ev.id, ev);
		}
	}

	let events = Array.from(uniqueEventsMap.values());
	events.sort((a, b) => {
		if (a.date < b.date) return 1;
		if (a.date > b.date) return -1;
		return 0;
	});

	return { events, error: errorMessage, eventTable: defaultTable };
};

export const actions: Actions = {
	createEvent: async ({ request }) => {
		const form = await request.formData();
		const table = String(form.get('table') ?? 'events');
		const title = String(form.get('title') ?? '').trim();
		const date = String(form.get('date') ?? '').trim();

		if (!title || !date) {
			return fail(400, { error: 'Event title and date are required.' });
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
			updated_at: new Date().toISOString()
		};

		const { error } = await supabaseAdmin
			.from(table)
			.insert(payload);

		if (error) {
			console.error('[events] insert error:', error.message);
			return fail(500, { error: error.message });
		}

		return { success: true };
	},
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
