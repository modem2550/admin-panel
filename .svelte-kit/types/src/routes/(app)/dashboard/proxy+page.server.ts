// @ts-nocheck
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = async ({ locals }: Parameters<PageServerLoad>[0]) => {
    if (!locals.session) {
        throw redirect(303, '/login');
    }

    const supabase = locals.supabase;

    const [membersResult, eventsResult, nextEventResult] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('event_data').select('*', { count: 'exact', head: true }),
        supabase.from('event_data')
            .select('*')
            .gte('date', new Date().toISOString().split('T')[0])
            .order('date', { ascending: true })
            .limit(1)
            .maybeSingle()
    ]);

    return {
        membersCount: membersResult.count ?? 0,
        eventsCount: eventsResult.count ?? 0,
        nextEvent: nextEventResult.data ?? null
    };
};