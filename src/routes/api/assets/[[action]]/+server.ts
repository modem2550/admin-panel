import { json, error, type RequestEvent } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTheaterArchive } from '$lib/bnk48.server';
import { proxyUrl, getCDNDiscoveryUrls, getDefaultAssetUrl } from '$lib/bnk48';
import { supabaseAdmin } from '$lib/supabase.server';
import https from 'node:https';

// ── Scan Configuration ──────────────────────────────────────────────────────────
const SCAN_SECRET = import.meta.env.SCAN_SECRET;
const UPPER_BOUND = { product: 15000, group: 2000 };
const BATCH_SIZE = 50;
const TIMEOUT_MS = 2000;

// ── Theater Archive Configuration ────────────────────────────────────────────────
const PERFORMANCE_LIST_URL = 'https://public.bnk48.io/performance/list';
const PERFORMANCE_URL = 'https://public.bnk48.io/performance/';
const HISTORICAL_ID_MIN = 14;
const DEFAULT_MAX_BUFFER = 10;

// Member Cache
const MEMBER_CACHE_TTL_MS = 60 * 60 * 1000;
interface CacheEntry {
    name: string;
    expiresAt: number;
}
const memberNameCache = new Map<number, CacheEntry>();

async function getMemberName(memberId: number): Promise<string> {
    const cached = memberNameCache.get(memberId);
    if (cached && Date.now() < cached.expiresAt) return cached.name;

    try {
        const resp = await fetch(`https://public.bnk48.io/member/${memberId}/profile`);
        if (!resp.ok) return `#${memberId}`;
        const member = await resp.json();
        const name = member.codeName || member.nickname || member.name || `#${memberId}`;
        memberNameCache.set(memberId, { name, expiresAt: Date.now() + MEMBER_CACHE_TTL_MS });
        return name;
    } catch {
        return `#${memberId}`;
    }
}

// Performance ID Cache
let cachedAllIds: number[] | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getAllPerformanceIds(): Promise<number[]> {
    if (cachedAllIds && Date.now() < cacheExpiresAt) return cachedAllIds;

    const idSet = new Set<number>();
    let maxIdFound = HISTORICAL_ID_MIN;

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

    const searchLimit = maxIdFound + DEFAULT_MAX_BUFFER;
    for (let id = searchLimit; id >= HISTORICAL_ID_MIN; id--) {
        idSet.add(id);
    }

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

// ── Scan helper functions ───────────────────────────────────────────────────────
async function checkAnyExists(urls: string[]): Promise<string | null> {
    const results = await Promise.all(urls.map(async (u) => {
        return new Promise<string | null>((resolve) => {
            const req = https.request(u, {
                method: 'HEAD',
                timeout: TIMEOUT_MS,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': '*/*'
                }
            }, (res) => {
                resolve(res.statusCode === 200 ? u : null);
            });
            req.on('timeout', () => { req.destroy(); resolve(null); });
            req.on('error', () => resolve(null));
            req.end();
        });
    }));
    return results.find(r => r !== null) ?? null;
}

async function runScan(type: string, startId: number, endId: number, logId: number) {
    const ids: number[] = [];
    for (let i = startId; i <= endId; i++) ids.push(i);

    let scannedCount = 0;
    let foundCount = 0;

    try {
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
            const batch = ids.slice(i, i + BATCH_SIZE);

            const results = await Promise.all(
                batch.map(async (id) => {
                    const foundUrl = await checkAnyExists(getCDNDiscoveryUrls(type as 'product' | 'group', id));
                    if (!foundUrl) return null;
                    const proxiedUrl = foundUrl.replace('https://img.bnk48cdn.net/', '/api/img/');
                    return { id, proxiedUrl };
                })
            );

            const found = results.filter((r): r is { id: number; proxiedUrl: string } => r !== null);
            scannedCount += batch.length;
            foundCount += found.length;

            if (found.length > 0) {
                const rows = found.map(({ id, proxiedUrl }) => ({
                    id,
                    type,
                    url: proxiedUrl,
                    skus: [1],
                    discovered_at: new Date().toISOString(),
                    last_seen: new Date().toISOString(),
                }));

                await supabaseAdmin
                    .from('cdn_assets')
                    .upsert(rows, { onConflict: 'id,type' });
            }

            if (i % (BATCH_SIZE * 10) === 0) {
                await supabaseAdmin
                    .from('cdn_scan_log')
                    .update({ scanned_count: scannedCount, found_count: foundCount })
                    .eq('id', logId);
            }
        }

        await supabaseAdmin
            .from('cdn_scan_log')
            .update({
                status: 'done',
                finished_at: new Date().toISOString(),
                scanned_count: scannedCount,
                found_count: foundCount,
            })
            .eq('id', logId);

    } catch (err) {
        console.error('Scan error:', err);
        await supabaseAdmin
            .from('cdn_scan_log')
            .update({ status: 'error', finished_at: new Date().toISOString() })
            .eq('id', logId);
    }
}

// ── Sku Helper Functions ────────────────────────────────────────────────────────
async function headExists(urlStr: string): Promise<boolean> {
    return new Promise((resolve) => {
        const req = https.request(urlStr, {
            method: 'GET',
            timeout: 3000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*'
            }
        }, (res) => {
            res.destroy();
            resolve(res.statusCode === 200);
        });
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.on('error', () => resolve(false));
        req.end();
    });
}

// ── GET HANDLER ─────────────────────────────────────────────────────────────────
export const GET: RequestHandler = async ({ url, params }) => {
    const action = params.action;

    // 1. Playback Listing
    if (action === 'playback') {
        const skip = parseInt(url.searchParams.get('skip') || '0');
        const take = parseInt(url.searchParams.get('take') || '20');

        if (isNaN(skip) || skip < 0) throw error(400, 'Invalid skip parameter');
        if (isNaN(take) || take < 1 || take > 200) throw error(400, 'Invalid take parameter (1–200)');

        try {
            const result = await getTheaterArchive(skip, take);
            
            const assets = result.items.map((item: any) => {
                const rawDate: string = item.publishedAt ?? item.date ?? '';
                let dateStr = '';
                let timeStr = '';
                if (rawDate) {
                    if (rawDate.includes('T')) {
                        const parts = rawDate.split('T');
                        dateStr = parts[0];
                        timeStr = parts[1].substring(0, 5);
                    } else {
                        dateStr = rawDate;
                    }
                }

                return {
                    id: String(item.id ?? item.eventId ?? item.playbackId ?? item.contentId ?? '0'),
                    url: proxyUrl(item.thumbnailImageUrl || item.imageFileUrl || item.thumbnailUrl || ''),
                    title: item.title || 'Playback',
                    description: item.description || item.detail || '',
                    date: dateStr,
                    time: item.time || timeStr,
                    placeName: item.placeName || '',
                    memberIdList: item.memberIdList || [],
                    memberNames: item.memberNames || [],
                };
            });

            return json({
                items: assets,
                total: result.total,
                skip: result.skip,
                take: result.take
            }, {
                headers: { 'Cache-Control': 'no-store' }
            });
        } catch (e: any) {
            console.error('[PlaybackArchive] API error:', e);
            throw error(500, e.message || 'Internal Server Error');
        }
    }

    // 2. Theater Archive (Performance) Listing
    if (action === 'theater-archive') {
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

            const rawResults = await Promise.all(pageIds.map(id => fetchPerformance(id)));
            const validPairs = rawResults
                .map((item, idx) => ({ item, id: pageIds[idx] }))
                .filter(({ item }) => item !== null);

            const assets = await Promise.all(
                validPairs.map(async ({ item, id }) => {
                    const memberIds: number[] = Array.isArray(item.memberIdList) ? item.memberIdList : [];
                    const memberNames = memberIds.length > 0
                        ? await Promise.all(memberIds.map(mid => getMemberName(mid)))
                        : [];

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

            // Sync to DB in background
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
                        if (!dbErr) return;
                        if (dbErr.code === 'PGRST104') return;
                        if (dbErr.code === '42501' || dbErr.message.includes('row-level security')) return;
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
    }

    // 3. Scan Log Status
    if (action === 'scan-status') {
        const id = url.searchParams.get('id');
        if (!id) throw error(400, 'Missing id');

        const { data, error: err } = await supabaseAdmin
            .from('cdn_scan_log')
            .select('*')
            .eq('id', id)
            .single();

        if (err || !data) throw error(404, 'Scan log not found');
        return json(data);
    }

    // 4. Scan Sku Verification
    if (action === 'scan-sku') {
        const idParam = url.searchParams.get('id');
        const type = url.searchParams.get('type') || 'product';

        if (!idParam) throw error(400, 'Missing id');
        const id = parseInt(idParam);
        if (isNaN(id)) throw error(400, 'Invalid id');

        const { data: existing, error: dbErr } = await supabaseAdmin
            .from('cdn_assets')
            .select('skus, extra_urls')
            .eq('id', id)
            .eq('type', type)
            .maybeSingle();

        if (dbErr) throw error(500, 'DB error');

        if (existing && Array.isArray(existing.extra_urls)) {
            return json({ urls: existing.extra_urls, skus: existing.skus || [] });
        }

        const candidates = getCDNDiscoveryUrls(type as 'product' | 'group', id);
        const validUrls: string[] = [];
        const validSkus: number[] = [1];
        
        const checkResults = await Promise.all(
            candidates.map(async (u) => {
                if (await headExists(u)) return u;
                return null;
            })
        );

        for (const u of checkResults) {
            if (u) {
                const proxyUrl = u.replace('https://img.bnk48cdn.net/shop/', '/api/image/');
                validUrls.push(proxyUrl);
                
                const match = u.match(/(\d+)\.\w+$/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (!validSkus.includes(num)) validSkus.push(num);
                }
            }
        }

        const foundSkus = validSkus.sort((a, b) => a - b);

        supabaseAdmin
            .from('cdn_assets')
            .update({ skus: foundSkus, extra_urls: validUrls, last_seen: new Date().toISOString() })
            .eq('id', id)
            .eq('type', type)
            .then(() => { });

        return json({ skus: foundSkus, urls: validUrls });
    }

    throw error(404, 'Action not found');
};

// ── POST HANDLER ────────────────────────────────────────────────────────────────
export const POST: RequestHandler = async ({ request, params }) => {
    const action = params.action;

    // 1. Trigger Asset Scanning
    if (action === 'scan') {
        const secret = request.headers.get('x-scan-secret');
        if (!secret || secret !== SCAN_SECRET) throw error(401, 'Unauthorized');

        const body = await request.json().catch(() => ({}));
        const type = body.type === 'group' ? 'group' : 'product';

        const { data: maxRow } = await supabaseAdmin
            .from('cdn_assets')
            .select('id')
            .eq('type', type)
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle();

        const startId = maxRow ? maxRow.id + 1 : 0;
        const endId = UPPER_BOUND[type as keyof typeof UPPER_BOUND];

        if (startId > endId) {
            return json({ message: 'Already up to date', startId, endId });
        }

        const { data: logRow } = await supabaseAdmin
            .from('cdn_scan_log')
            .insert({ type, status: 'running' })
            .select('id')
            .single();

        const logId = logRow!.id;
        runScan(type, startId, endId, logId);

        return json({ scan_log_id: logId, startId, endId });
    }

    throw error(404, 'Action not found');
};
