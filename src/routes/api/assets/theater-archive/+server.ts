import { json, error, type RequestEvent } from '@sveltejs/kit';
import { getTheaterArchive } from '$lib/bnk48.server';
import { proxyUrl } from '$lib/bnk48';
import { supabaseAdmin } from '$lib/supabase.server';

const memberNameCache = new Map<number, string>();

async function getMemberName(memberId: number): Promise<string> {
    const cached = memberNameCache.get(memberId);
    if (cached) return cached;

    try {
        const memberResp = await fetch(`https://public.bnk48.io/member/${memberId}/profile`);
        if (!memberResp.ok) return `#${memberId}`;
        const member = await memberResp.json();
        const name = member.codeName || member.nickname || member.name || `#${memberId}`;
        memberNameCache.set(memberId, name);
        return name;
    } catch {
        return `#${memberId}`;
    }
}

export const GET = async ({ url }: RequestEvent) => {
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const take = parseInt(url.searchParams.get('take') || '20');

    if (isNaN(skip) || skip < 0) throw error(400, 'Invalid skip parameter');
    if (isNaN(take) || take < 1) throw error(400, 'Invalid take parameter');

    try {
        const result = await getTheaterArchive(skip, take);
        console.log(`[TheaterArchiveAPI] Fetched ${result.items.length} items (skip=${skip}, take=${take})`);
        
        // Map TheaterPlayback to Asset-like structure
        const assets = await Promise.all(result.items.map(async (item, idx) => {
            const memberIds: number[] = item.memberIdList || (item.memberList ? item.memberList.map((m: any) => m.id) : []);
            
            let memberNames = item.memberNames || 
                               (item.memberList ? item.memberList.map((m: any) => m.name || m.nickname || m.codeName) : []);
            
            // If we have IDs but no names, resolve them
            if (memberNames.length === 0 && memberIds.length > 0) {
                memberNames = await Promise.all(memberIds.map(id => getMemberName(id)));
            }

            const mapped = {
                id: String(item.contentId ?? item.id ?? item.eventId ?? item._id ?? item.performanceId ?? item.id_playback ?? `gen-${idx}-${Date.now()}`),
                url: proxyUrl(item.imageFileUrl || item.thumbnailImageUrl || item.thumbnailUrl),
                title: item.title || item.name || 'Theater Playback',
                description: item.description || item.detail || item.content || item.subTitle || '',
                date: item.liveDate || item.date || (item.publishedAt ? item.publishedAt.split('T')[0] : ''),
                time: item.liveAt || item.time || (item.publishedAt && item.publishedAt.includes('T') ? item.publishedAt.split('T')[1].split('.')[0].slice(0, 5) : ''),
                placeName: item.livePlace || item.placeName || '',
                memberIdList: memberIds,
                memberNames: memberNames
            };
            
            if (idx === 0) {
                console.log(`[TheaterArchiveAPI] Sample Raw Item 0:`, JSON.stringify(item).slice(0, 500));
                console.log(`[TheaterArchiveAPI] Sample Mapped Item 0:`, mapped);
            }
            
            return mapped;
        }));

        // Background Sync: Upsert into cdn_assets for discovery (don't block response)
        const syncRows = assets.map(a => ({
            id: parseInt(a.id),
            type: 'archive',
            url: a.url,
            discovered_at: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            skus: [1]
        })).filter(row => !isNaN(row.id));

        if (syncRows.length > 0) {
            supabaseAdmin
                .from('cdn_assets')
                .upsert(syncRows, { onConflict: 'id,type' })
                .then(({ error }) => {
                    if (error) console.error('[TheaterArchiveSync] Error:', error.message);
                    else console.log(`[TheaterArchiveSync] Synced ${syncRows.length} items`);
                });
        }

        return json(assets, {
            headers: { 'Cache-Control': 'no-store' }
        });
    } catch (e: any) {
        console.error('Theater archive API error:', e);
        throw error(500, e.message || 'Internal Server Error');
    }
};
