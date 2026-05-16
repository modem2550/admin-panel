import { json, error, type RequestEvent } from '@sveltejs/kit';
import { proxyUrl } from '$lib/bnk48';
import { supabaseAdmin } from '$lib/supabase.server';

const PERFORMANCE_LIST_URL = 'https://public.bnk48.io/performance/list';
const PERFORMANCE_URL = 'https://public.bnk48.io/performance/';

/**
 * Known range of historical performance IDs.
 * The public list endpoint only returns currently-open / upcoming events.
 * Historical events (eventId 14–293) must be probed directly.
 */
const HISTORICAL_ID_MIN = 14;
const DEFAULT_MAX_BUFFER = 10; // How many IDs to probe beyond the last known ID

// ── Member name cache ────────────────────────────────────────────────────────
const memberNameCache = new Map<number, string>();

async function getMemberName(memberId: number): Promise<string> {
    const cached = memberNameCache.get(memberId);
    if (cached) return cached;

    try {
        const resp = await fetch(`https://public.bnk48.io/member/${memberId}/profile`);
        if (!resp.ok) return `#${memberId}`;
        const member = await resp.json();
        const name = member.codeName || member.nickname || member.name || `#${memberId}`;
        memberNameCache.set(memberId, name);
        return name;
    } catch {
        return `#${memberId}`;
    }
}

// ── Full performance ID list cache (TTL 5 min) ───────────────────────────────
let cachedAllIds: number[] | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Returns a deduplicated, descending-sorted list of all known performance IDs.
 * Sources (merged):
 *   1. public.bnk48.io/performance/list  → available + upcoming (live events)
 *   2. Static historical range HISTORICAL_ID_MIN..HISTORICAL_ID_MAX (all integers)
 *
 * The actual /performance/{id} fetch will naturally return null for non-existent IDs,
 * so probing the full integer range is safe — those are filtered out later.
 */
async function getAllPerformanceIds(): Promise<number[]> {
    if (cachedAllIds && Date.now() < cacheExpiresAt) return cachedAllIds;

    const idSet = new Set<number>();
    let maxIdFound = HISTORICAL_ID_MIN;

    // 1. Check Database for latest known ID
    try {
        const { data } = await supabaseAdmin
            .from('cdn_assets')
            .select('id')
            .eq('type', 'archive')
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (data?.id) maxIdFound = Math.max(maxIdFound, data.id);
    } catch {}

    // 2. Public list endpoint (open / upcoming)
    try {
        const resp = await fetch(PERFORMANCE_LIST_URL);
        if (resp.ok) {
            const data = await resp.json();
            const items = [
                ...(Array.isArray(data.available) ? data.available : []),
                ...(Array.isArray(data.upcoming) ? data.upcoming : []),
            ];
            for (const item of items) {
                if (typeof item.eventId === 'number') {
                    idSet.add(item.eventId);
                    maxIdFound = Math.max(maxIdFound, item.eventId);
                }
            }
        }
    } catch (e) {
        console.warn('[PerformanceArchive] Failed to fetch performance list:', e);
    }

    // 3. Historical range probe (from dynamic max down to min)
    // We probe up to maxIdFound + DEFAULT_MAX_BUFFER to catch very new events
    const searchLimit = maxIdFound + DEFAULT_MAX_BUFFER;
    for (let id = searchLimit; id >= HISTORICAL_ID_MIN; id--) {
        idSet.add(id);
    }

    // Sort descending (newest first)
    cachedAllIds = Array.from(idSet).sort((a, b) => b - a);
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;


    return cachedAllIds;
}

async function fetchPerformance(id: number): Promise<any | null> {
    try {
        const resp = await fetch(`${PERFORMANCE_URL}${id}`);
        if (!resp.ok) return null;
        return await resp.json();
    } catch {
        return null;
    }
}

export const GET = async ({ url }: RequestEvent) => {
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const take = parseInt(url.searchParams.get('take') || '20');

    if (isNaN(skip) || skip < 0) throw error(400, 'Invalid skip parameter');
    if (isNaN(take) || take < 1 || take > 200) throw error(400, 'Invalid take parameter (1–200)');

    try {
        const allIds = await getAllPerformanceIds();
        const pageIds = allIds.slice(skip, skip + take);



        if (url.searchParams.get('raw') === '1') {
            return json({ total: allIds.length, ids: pageIds });
        }

        // Fetch each performance in parallel — public endpoint, no auth needed
        const rawResults = await Promise.all(pageIds.map(id => fetchPerformance(id)));

        // Filter nulls (IDs that don't exist in the system)
        const validPairs = rawResults
            .map((item, idx) => ({ item, id: pageIds[idx] }))
            .filter(({ item }) => item !== null);

        const assets = await Promise.all(
            validPairs.map(async ({ item, id }) => {
                const memberIds: number[] = Array.isArray(item.memberIdList) ? item.memberIdList : [];

                // Resolve member names
                const memberNames = memberIds.length > 0
                    ? await Promise.all(memberIds.map(mid => getMemberName(mid)))
                    : [];

                // Normalise date (ISO → date-only)
                const rawDate: string = item.date ?? '';
                const dateStr = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;

                return {
                    id: String(item.eventId ?? id),
                    url: proxyUrl(item.imageFileUrl || item.thumbnailImageUrl || item.thumbnailUrl || ''),
                    title: item.title || 'Performance',
                    description: item.description || item.detail || '',
                    date: dateStr,
                    time: item.time || '',
                    placeName: item.placeName || '',
                    memberIdList: memberIds,
                    memberNames,
                };
            })
        );



        // Background DB sync
        const syncRows = assets
            .map(a => ({
                id: parseInt(a.id),
                type: 'archive' as const,
                url: a.url,
                discovered_at: new Date().toISOString(),
                last_seen: new Date().toISOString(),
                skus: [1],
            }))
            .filter(row => !isNaN(row.id));

        if (syncRows.length > 0) {
            supabaseAdmin
                .from('cdn_assets')
                .upsert(syncRows, { onConflict: 'id,type' })
                .then(({ error: dbErr }) => {
                    if (!dbErr) {
                        return;
                    }
                    if (dbErr.code === 'PGRST104') return; // table not found
                    if (dbErr.code === '42501' || dbErr.message.includes('row-level security')) {
                        console.warn('[PerformanceArchiveSync] Permission denied (RLS).');
                        return;
                    }
                    console.error('[PerformanceArchiveSync] Error:', dbErr.message);
                });
        }

        return json({
            items: assets,
            total: allIds.length,
            skip,
            take
        }, {
            headers: { 'Cache-Control': 'no-store' }
        });

    } catch (e: any) {
        console.error('[PerformanceArchive] API error:', e);
        throw error(500, e.message || 'Internal Server Error');
    }
};
