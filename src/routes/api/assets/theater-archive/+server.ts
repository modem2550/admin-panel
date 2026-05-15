import { json, error, type RequestEvent } from '@sveltejs/kit';
import { proxyUrl } from '$lib/bnk48';
import { supabaseAdmin } from '$lib/supabase.server';

// ── Constants ──────────────────────────────────────────────────────────────────
/** Inclusive range of known performance IDs on public.bnk48.io */
const DEFAULT_MIN_ID = 14;
const DEFAULT_MAX_ID = 299;

// ── Member name cache ──────────────────────────────────────────────────────────
const memberNameCache = new Map<number, string>();

async function getMemberName(memberId: number): Promise<string> {
    const cached = memberNameCache.get(memberId);
    if (cached) return cached;
    try {
        const resp = await fetch(`https://public.bnk48.io/member/${memberId}/profile`);
        if (!resp.ok) return `#${memberId}`;
        const m = await resp.json();
        const name = m.codeName || m.nickname || m.name || `#${memberId}`;
        memberNameCache.set(memberId, name);
        return name;
    } catch {
        return `#${memberId}`;
    }
}

// ── Fetch a single performance from public API ─────────────────────────────────
async function fetchPerformance(id: number): Promise<any | null> {
    try {
        const resp = await fetch(`https://public.bnk48.io/performance/${id}`);
        if (!resp.ok) return null;
        const data = await resp.json();
        // Store the ID we used to fetch this item to ensure uniqueness in the list
        return { ...data, _requestedId: id };
    } catch {
        return null;
    }
}

// ── Map raw performance object → asset-like shape ────────────────────────────
async function mapPerformance(item: any) {
    const memberIds: number[] = Array.isArray(item.memberIdList) ? item.memberIdList : [];

    let memberNames: string[] = [];
    if (memberIds.length > 0) {
        memberNames = await Promise.all(memberIds.map(id => getMemberName(id)));
    }

    // date field from public API is ISO-8601, e.g. "2026-02-24T12:30:00+00:00"
    const rawDate: string = item.date ?? '';
    const dateOnly = rawDate ? rawDate.split('T')[0] : '';

    return {
        // Use requested ID as the primary ID to ensure it matches the range and is unique
        id: String(item._requestedId ?? item.eventId ?? item.id ?? ''),
        url: proxyUrl(item.imageFileUrl ?? item.thumbnailImageUrl ?? ''),
        title: item.title ?? item.name ?? 'Performance',
        description: item.description ?? item.detail ?? '',
        date: dateOnly,
        time: item.time ?? '',
        placeName: item.placeName ?? item.livePlace ?? '',
        type: item.type ?? 'concert',
        memberIdList: memberIds,
        memberNames,
    };
}

// ── GET /api/assets/theater-archive ───────────────────────────────────────────
export const GET = async ({ url }: RequestEvent) => {
    /**
     * Query params:
     *   ids   = comma-separated list of performance IDs, e.g. "273,272,267"
     *   min   = lower bound of ID range (inclusive), default 14
     *   max   = upper bound of ID range (inclusive), default 294
     *   skip  = pagination offset applied after resolving IDs (default 0)
     *   take  = page size (default 20)
     *   raw   = 1 → return raw API responses (no mapping)
     */
    const idsParam = url.searchParams.get('ids');
    const minId = parseInt(url.searchParams.get('min') || String(DEFAULT_MIN_ID));
    const maxId = parseInt(url.searchParams.get('max') || String(DEFAULT_MAX_ID));
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const take = parseInt(url.searchParams.get('take') || '20');

    if (isNaN(skip) || skip < 0) throw error(400, 'Invalid skip parameter');
    if (isNaN(take) || take < 1) throw error(400, 'Invalid take parameter');
    if (isNaN(minId) || isNaN(maxId) || minId > maxId) throw error(400, 'Invalid min/max range');

    // Build ordered list of IDs to fetch (descending, newest first)
    let allIds: number[];
    if (idsParam) {
        allIds = idsParam.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    } else {
        // Build descending range: maxId → minId
        allIds = [];
        for (let i = maxId; i >= minId; i--) allIds.push(i);
    }

    // Apply pagination on the ID list before fetching
    const pageIds = allIds.slice(skip, skip + take);
    const total = allIds.length;

    console.log(`[PerformanceAPI] Fetching IDs ${pageIds[0]}..${pageIds[pageIds.length - 1]} (skip=${skip}, take=${take})`);

    try {
        // Fetch all pages in parallel; null = 404 / error, filtered out
        const rawItems = (await Promise.all(pageIds.map(fetchPerformance))).filter(Boolean);

        if (url.searchParams.get('raw') === '1') {
            return json({ items: rawItems, total, skip, take });
        }

        const assets = await Promise.all(rawItems.map(mapPerformance));

        // Final safety: deduplicate by ID just in case
        const seen = new Set<string>();
        const uniqueAssets = assets.filter(a => {
            if (seen.has(a.id)) return false;
            seen.add(a.id);
            return true;
        });

        console.log(`[PerformanceAPI] Resolved ${uniqueAssets.length} unique assets`);
        if (assets.length > 0) {
            console.log(`[PerformanceAPI] Sample asset[0]:`, JSON.stringify(assets[0]).slice(0, 300));
        }

        // Background Sync → cdn_assets (non-blocking)
        const syncRows = assets
            .map(a => ({
                id: parseInt(a.id),
                type: 'archive',
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
                .then(({ error: e }) => {
                    if (!e) {
                        console.log(`[PerformanceSync] Synced ${syncRows.length} rows`);
                        return;
                    }
                    if (e.code === 'PGRST104') return; // table not found
                    if (e.code === '42501' || e.message.includes('row-level security')) {
                        console.warn('[PerformanceSync] RLS denied — check SUPABASE_SERVICE_ROLE_KEY');
                        return;
                    }
                    console.error('[PerformanceSync] Error:', e.message);
                });
        }

        return json(
            { items: uniqueAssets, total, skip, take },
            { headers: { 'Cache-Control': 'no-store' } }
        );
    } catch (e: any) {
        console.error('[PerformanceAPI] Fatal error:', e);
        throw error(500, e.message || 'Internal Server Error');
    }
};
