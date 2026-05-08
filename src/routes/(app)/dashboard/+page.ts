import { supabase } from '$lib/supabase';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
    const [membersResult, eventsResult, nextEventResult, latestProduct, latestGroup] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('event_data').select('*', { count: 'exact', head: true }),
        supabase.from('event_data')
            .select('*')
            .gte('date', new Date().toISOString().split('T')[0])
            .order('date', { ascending: true })
            .limit(1)
            .maybeSingle(),
        fetch('/api/check-assets/latest?type=product').then(r => r.json()),
        fetch('/api/check-assets/latest?type=group').then(r => r.json())
    ]);

    return {
        membersCount: membersResult.count ?? 0,
        eventsCount: eventsResult.count ?? 0,
        nextEvent: nextEventResult.data ?? null,
        latestAssets: {
            product: latestProduct,
            group: latestGroup
        }
    };
};
