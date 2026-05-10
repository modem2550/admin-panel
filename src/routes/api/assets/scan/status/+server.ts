import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/supabase.server';

export const GET: RequestHandler = async ({ url }) => {
    const id = url.searchParams.get('id');
    if (!id) throw error(400, 'Missing id');

    const { data, error: err } = await supabaseAdmin
        .from('cdn_scan_log')
        .select('*')
        .eq('id', id)
        .single();

    if (err || !data) throw error(404, 'Scan log not found');

    return json(data);
};