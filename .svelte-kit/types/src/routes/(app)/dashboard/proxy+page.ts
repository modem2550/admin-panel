// @ts-nocheck
import { supabase } from '$lib/supabase';
import type { PageLoad } from './$types';

export const load = async ({ fetch }: Parameters<PageLoad>[0]) => {
    if (import.meta.env.DEV) console.time("[Dashboard] Load Data");
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
    if (import.meta.env.DEV) console.timeEnd("[Dashboard] Load Data");

    return {
        membersCount: membersResult.count ?? 0,
        eventsCount: eventsResult.count ?? 0,
        nextEvent: nextEventResult.data ?? null
    };
};
