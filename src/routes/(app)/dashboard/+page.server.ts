import { redirect } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/supabase.server';
import type { PageServerLoad } from './$types';  // ← เปลี่ยน

export const load: PageServerLoad = async ({ parent }) => {  // ← เปลี่ยน
	const { session } = await parent();
	if (!session) {
		throw redirect(303, '/login');
	}

	const [membersResult, eventsResult, nextEventResult, adsResponse] = await Promise.all([
		supabaseAdmin.from('members').select('*', { count: 'exact', head: true }),
		supabaseAdmin.from('event_data').select('*', { count: 'exact', head: true }),
		supabaseAdmin
			.from('event_data')
			.select('*')
			.gte('date', new Date().toISOString().split('T')[0])
			.order('date', { ascending: true })
			.limit(1)
			.maybeSingle(),
		fetch('https://public.bnk48.io/ads')   // ← ไม่ต้องใส่ User-Agent ปลอมแล้ว
			.then((res) => res.json())
			.catch(() => null)
	]);

	let champSplashUrl = null;

	if (adsResponse?.sections) {
		const splashSection = adsResponse.sections.find(
			(s: any) => s.type === 'splash-screen'
		);

		if (splashSection) {
			// หา ad ที่ code เป็น champ-of-the-week
			const champAd = splashSection.ads?.find(
				(ad: any) => ad.code === 'champ-of-the-week'
			);

			// เอา item แรกที่มี imageUrl
			const champItem = champAd?.items?.find((item: any) => item.imageUrl);

			if (champItem) {
				champSplashUrl = champItem.imageUrl;
			}
		}
	}


	return {
		membersCount: membersResult.count ?? 0,
		eventsCount: eventsResult.count ?? 0,
		nextEvent: nextEventResult.data ?? null,
		champSplashUrl
	};
};
