import { json, error, type RequestEvent } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTheaterArchive, getTheaterTicketBooking, getToken, getValidToken } from '$lib/bnk48.server';
import { proxyUrl, getCDNDiscoveryUrls, getDefaultAssetUrl, DEFAULT_HEADERS } from '$lib/bnk48';
import { supabaseAdmin } from '$lib/supabase.server';
import https from 'node:https';

// ── Scan Configuration ──────────────────────────────────────────────────────────
const SCAN_SECRET = import.meta.env.SCAN_SECRET;
// product (variant) ids above 5630 switched to a new CDN naming scheme that can't be
// guessed anymore — those get discovered as a byproduct of the "group" (shop) scan
// instead, keyed by productVariantId. So the direct CDN-guess scan only needs to cover
// the legacy range now.
const UPPER_BOUND = { product: 5630, group: 2000 };
const BATCH_SIZE = 50;
const TIMEOUT_MS = 2000;

// ── Shop API Configuration (group/product scan) ─────────────────────────────────
const SHOP_PRODUCT_DETAIL_URL = 'https://public.bnk48.io/shop/product/detail/';
const SHOP_BATCH_SIZE = 20;
const SHOP_REQUEST_DELAY_MS = 150;

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ShopAssetRow {
    id: number;
    url: string;
    title: string;
    description: string;
}

interface ShopGroupScanResult {
    groupRow: ShopAssetRow | null;
    variantRows: ShopAssetRow[];
}

/**
 * Fetches a single shop product-group's full detail (title, description, thumbnail,
 * and nested variants) from the Shop API. Returns:
 *  - the parsed JSON on success (200)
 *  - 'unauthorized' on 401/403 (caller should refresh the token and retry once)
 *  - null on 404/400/other (not found / doesn't exist)
 */
async function fetchShopProductDetail(id: number, token: string): Promise<any | 'unauthorized' | null> {
    try {
        const res = await fetch(`${SHOP_PRODUCT_DETAIL_URL}${id}`, {
            headers: { ...DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
        });
        if (res.status === 200) return await res.json();
        if (res.status === 401 || res.status === 403) return 'unauthorized';
        return null;
    } catch {
        return null;
    }
}

/**
 * Scans one product-group id via the Shop API. On success, returns the flattened
 * group row plus one row per variant (keyed by productVariantId) so variants get
 * discovered/stored as type='product' rows without needing their own sequential scan.
 */
async function scanShopGroup(id: number, tokenRef: { current: string }): Promise<ShopGroupScanResult> {
    let data = await fetchShopProductDetail(id, tokenRef.current);

    if (data === 'unauthorized') {
        tokenRef.current = await getValidToken(true);
        data = await fetchShopProductDetail(id, tokenRef.current);
    }

    if (data === 'unauthorized' || data === null) {
        return { groupRow: null, variantRows: [] };
    }

    const groupTitle = typeof data.title === 'string' ? data.title : '';
    const groupDescription = typeof data.description === 'string' ? data.description : '';
    const groupThumb = typeof data.thumbnailImageUrl === 'string'
        ? data.thumbnailImageUrl.replace('https://img.bnk48cdn.net/', '/api/img/')
        : '';

    const groupRow: ShopAssetRow = { id, url: groupThumb, title: groupTitle, description: groupDescription };

    const variantRows: ShopAssetRow[] = [];
    for (const v of Array.isArray(data.variants) ? data.variants : []) {
        if (typeof v?.productVariantId !== 'number') continue;
        const variantTitle = typeof v.variantTitle === 'string' ? v.variantTitle : '';
        const variantThumb = typeof v.thumbnailImageUrl === 'string'
            ? v.thumbnailImageUrl.replace('https://img.bnk48cdn.net/', '/api/img/')
            : '';
        variantRows.push({
            id: v.productVariantId,
            url: variantThumb,
            title: variantTitle ? `${groupTitle} ${variantTitle}`.trim() : groupTitle,
            description: groupDescription,
        });
    }

    return { groupRow, variantRows };
}

// ── Theater DB Cache (Performance + Rounds) ──────────────────────────────────────
// Public, non-personal theater data (Performance, Rounds) is cached in cdn_assets so
// page loads read from Supabase instead of live-walking the BNK48 API every time.
// Freshness is kept up automatically: whichever request notices the cache is stale
// (older than REFRESH_INTERVAL_MS) kicks off a full background re-scan without
// blocking its own response — no manual "Start Scan" button needed for these two.
const CACHE_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

let archiveRefreshInFlight = false;
let roundRefreshInFlight = false;

async function getCacheLastScanned(type: 'archive' | 'round'): Promise<number> {
    try {
        const { data } = await supabaseAdmin
            .from('theater_cache_meta')
            .select('last_scanned_at')
            .eq('type', type)
            .maybeSingle();
        return data?.last_scanned_at ? new Date(data.last_scanned_at).getTime() : 0;
    } catch {
        return 0;
    }
}

async function touchCacheLastScanned(type: 'archive' | 'round') {
    try {
        await supabaseAdmin
            .from('theater_cache_meta')
            .upsert({ type, last_scanned_at: new Date().toISOString() }, { onConflict: 'type' });
    } catch (e) {
        console.error(`[TheaterCache] Failed to update last_scanned_at for ${type}:`, e);
    }
}

async function maybeTriggerBackgroundRefresh(type: 'archive' | 'round', headers: Record<string, string>) {
    if (type === 'archive' && archiveRefreshInFlight) return;
    if (type === 'round' && roundRefreshInFlight) return;

    const lastScanned = await getCacheLastScanned(type);
    if (Date.now() - lastScanned < CACHE_REFRESH_INTERVAL_MS) return;

    if (type === 'archive') {
        archiveRefreshInFlight = true;
        refreshArchiveCache(headers)
            .catch((e) => console.error('[TheaterCache] Archive background refresh failed:', e))
            .finally(() => { archiveRefreshInFlight = false; });
    } else {
        roundRefreshInFlight = true;
        refreshRoundCache(headers)
            .catch((e) => console.error('[TheaterCache] Round background refresh failed:', e))
            .finally(() => { roundRefreshInFlight = false; });
    }
}


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
const PERFORMANCE_FETCH_BATCH = 20;

let validTotalCache: { idsKey: string; count: number; expiresAt: number } | null = null;

async function getPerformanceAuthHeaders() {
    const token = await getToken();
    return {
        ...DEFAULT_HEADERS,
        Authorization: `Bearer ${token}`,
    };
}

async function getAllPerformanceIds(headers: Record<string, string>): Promise<number[]> {
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
    } catch { }

    try {
        const resp = await fetch(PERFORMANCE_LIST_URL, { headers });
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

async function fetchPerformance(id: number, headers: Record<string, string>): Promise<any | null> {
    try {
        const resp = await fetch(`${PERFORMANCE_URL}${id}`, { headers });
        if (!resp.ok) return null;
        return await resp.json();
    } catch {
        return null;
    }
}

async function fetchPerformanceArchivePage(
    allIds: number[],
    headers: Record<string, string>,
    skip: number,
    take: number,
): Promise<{ pairs: { item: any; id: number }[]; total: number }> {
    const idsKey = allIds.join(',');
    const cachedTotal =
        validTotalCache &&
            validTotalCache.idsKey === idsKey &&
            Date.now() < validTotalCache.expiresAt
            ? validTotalCache.count
            : null;

    const pairs: { item: any; id: number }[] = [];
    let validSeen = 0;
    let validCount = 0;

    for (let i = 0; i < allIds.length; i += PERFORMANCE_FETCH_BATCH) {
        if (pairs.length >= take && cachedTotal !== null) break;

        const batchIds = allIds.slice(i, i + PERFORMANCE_FETCH_BATCH);
        const batchResults = await Promise.all(
            batchIds.map(async (id) => {
                const item = await fetchPerformance(id, headers);
                return item ? { id, item } : null;
            }),
        );

        for (const result of batchResults) {
            if (!result) continue;
            validCount++;
            if (validSeen < skip) {
                validSeen++;
                continue;
            }
            if (pairs.length < take) {
                pairs.push(result);
            }
        }
    }

    if (cachedTotal !== null) {
        return { pairs, total: cachedTotal };
    }

    validTotalCache = {
        idsKey,
        count: validCount,
        expiresAt: Date.now() + CACHE_TTL_MS,
    };
    return { pairs, total: validCount };
}

// Full background walk — upserts every known performance into cdn_assets with
// complete fields (title, description, date/time/place/members in extra_data) so
// future requests can be served entirely from the DB.
async function refreshArchiveCache(headers: Record<string, string>) {
    const allIds = await getAllPerformanceIds(headers);

    for (let i = 0; i < allIds.length; i += PERFORMANCE_FETCH_BATCH) {
        const batchIds = allIds.slice(i, i + PERFORMANCE_FETCH_BATCH);
        const batchResults = await Promise.all(
            batchIds.map(async (id) => {
                const item = await fetchPerformance(id, headers);
                return item ? { id, item } : null;
            }),
        );

        const rows = [];
        for (const result of batchResults) {
            if (!result) continue;
            const { id, item } = result;
            const memberIds: number[] = Array.isArray(item.memberIdList) ? item.memberIdList : [];
            const memberNames = memberIds.length > 0
                ? await Promise.all(memberIds.map((mid: number) => getMemberName(mid)))
                : [];
            const rawDate: string = item.date ?? '';
            const dateStr = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
            const now = new Date().toISOString();

            rows.push({
                id: item.eventId ?? id,
                type: 'archive' as const,
                url: proxyUrl(item.imageFileUrl || item.thumbnailImageUrl || item.thumbnailUrl || ''),
                title: item.title || 'Performance',
                description: item.description || item.detail || '',
                extra_data: { date: dateStr, time: item.time || '', placeName: item.placeName || '', memberIdList: memberIds, memberNames },
                skus: [1],
                discovered_at: now,
                last_seen: now,
            });
        }

        if (rows.length > 0) {
            await supabaseAdmin.from('cdn_assets').upsert(rows, { onConflict: 'id,type' });
        }
    }

    await touchCacheLastScanned('archive');
}


// ── Theater Round Configuration ──────────────────────────────────────────────────
const ROUND_URL = 'https://public.bnk48.io/performance/round/';
const ROUND_SEARCH_CEILING = 20000;
const ROUND_FETCH_BATCH = 20;

async function fetchRound(id: number, headers: Record<string, string>): Promise<any | null> {
    try {
        const resp = await fetch(`${ROUND_URL}${id}`, { headers });
        if (!resp.ok) return null;
        return await resp.json();
    } catch {
        return null;
    }
}

function flattenRound(id: number, item: any) {
    const zones = Array.isArray(item.zoneList)
        ? item.zoneList.map((z: any) => ({
            zoneId: z.zoneId,
            name: z.name || '',
            price: typeof z.price === 'number' ? z.price : null,
            remainingSeat: typeof z.remainingSeat === 'number' ? z.remainingSeat : null,
        }))
        : [];

    return {
        id: item.roundId ?? id,
        roundName: item.roundName || `Round ${id}`,
        startDate: item.startDate || '',
        endDate: item.endDate || '',
        isSoldOut: !!item.isSoldOut,
        seatMapUrl: proxyUrl(item.seatMapUrl || ''),
        zones,
    };
}

// Round ids aren't contiguous (cancelled/removed rounds leave gaps), and there's no
// "list all rounds" endpoint to know the true upper bound. Any heuristic that tries
// to guess where rounds "end" (binary search, stop-after-N-misses) can under-count
// if a gap is wider than expected. So this just walks straight up from id 1,
// batching requests, stopping once it's collected `take` results or hit the hard
// ceiling. This is only the *fallback* path now — used when the DB cache doesn't
// have enough rows yet; the fast path in the GET handler reads straight from cdn_assets.
async function fetchRoundPage(
    headers: Record<string, string>,
    skip: number,
    take: number,
): Promise<{ pairs: { item: any; id: number }[]; hasMore: boolean }> {
    const pairs: { item: any; id: number }[] = [];
    let validSeen = 0;
    let id = ROUND_SEARCH_CEILING;

    while (id >= 1 && pairs.length < take) {
        const batchIds: number[] = [];
        for (let i = 0; i < ROUND_FETCH_BATCH && id >= 1; i--, id--) batchIds.push(id);

        const batchResults = await Promise.all(
            batchIds.map(async (bid) => ({ id: bid, item: await fetchRound(bid, headers) }))
        );

        for (const { id: bid, item } of batchResults) {
            if (!item) continue;
            validSeen++;
            if (validSeen <= skip) continue;
            if (pairs.length < take) pairs.push({ id: bid, item });
        }
    }

    return { pairs, hasMore: pairs.length === take && id >= 1 };
}

// Full background walk — upserts every discoverable round into cdn_assets (type='round')
// so future requests can be served entirely from the DB instead of live-walking.
async function refreshRoundCache(headers: Record<string, string>) {
    let id = 1;

    while (id <= ROUND_SEARCH_CEILING) {
        const batchIds: number[] = [];
        for (let i = 0; i < ROUND_FETCH_BATCH && id <= ROUND_SEARCH_CEILING; i++, id++) batchIds.push(id);

        const batchResults = await Promise.all(
            batchIds.map(async (bid) => ({ id: bid, item: await fetchRound(bid, headers) }))
        );

        const rows = [];
        const now = new Date().toISOString();
        for (const { id: bid, item } of batchResults) {
            if (!item) continue;
            const flat = flattenRound(bid, item);
            rows.push({
                id: flat.id,
                type: 'round' as const,
                url: flat.seatMapUrl,
                title: flat.roundName,
                description: '',
                extra_data: { startDate: flat.startDate, endDate: flat.endDate, isSoldOut: flat.isSoldOut, zones: flat.zones },
                skus: [1],
                discovered_at: now,
                last_seen: now,
            });
        }

        if (rows.length > 0) {
            await supabaseAdmin.from('cdn_assets').upsert(rows, { onConflict: 'id,type' });
        }
    }

    await touchCacheLastScanned('round');
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

// ── Product scan (unchanged) — CDN URL-guessing for legacy variant image ids ────
async function runProductCdnScan(startId: number, endId: number, logId: number) {
    const ids: number[] = [];
    for (let i = startId; i <= endId; i++) ids.push(i);

    let scannedCount = 0;
    let foundCount = 0;

    try {
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
            const batch = ids.slice(i, i + BATCH_SIZE);

            const results = await Promise.all(
                batch.map(async (id) => {
                    const foundUrl = await checkAnyExists(getCDNDiscoveryUrls('product', id));
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
                    type: 'product',
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

// ── Group scan — Shop API detail fetch, also discovers variants as type='product' ──
async function runShopGroupScan(startId: number, endId: number, logId: number) {
    const ids: number[] = [];
    for (let i = startId; i <= endId; i++) ids.push(i);

    let scannedCount = 0;
    let foundCount = 0;
    const tokenRef = { current: await getValidToken() };

    try {
        for (let i = 0; i < ids.length; i += SHOP_BATCH_SIZE) {
            const batch = ids.slice(i, i + SHOP_BATCH_SIZE);
            const results: ShopGroupScanResult[] = [];

            // Sequential with a small delay — these are authenticated JSON API calls,
            // not cheap CDN HEAD probes, so we're gentler on the upstream service.
            for (const id of batch) {
                results.push(await scanShopGroup(id, tokenRef));
                await sleep(SHOP_REQUEST_DELAY_MS);
            }

            scannedCount += batch.length;

            const groupRows = results
                .map((r) => r.groupRow)
                .filter((g): g is ShopAssetRow => g !== null);
            foundCount += groupRows.length;

            if (groupRows.length > 0) {
                const rows = groupRows.map((g) => ({
                    id: g.id,
                    type: 'group',
                    url: g.url,
                    title: g.title,
                    description: g.description,
                    skus: [1],
                    discovered_at: new Date().toISOString(),
                    last_seen: new Date().toISOString(),
                }));

                await supabaseAdmin
                    .from('cdn_assets')
                    .upsert(rows, { onConflict: 'id,type' });
            }

            const variantRows = results.flatMap((r) => r.variantRows);
            if (variantRows.length > 0) {
                const rows = variantRows.map((v) => ({
                    id: v.id,
                    type: 'product',
                    url: v.url,
                    title: v.title,
                    description: v.description,
                    skus: [1],
                    discovered_at: new Date().toISOString(),
                    last_seen: new Date().toISOString(),
                }));

                await supabaseAdmin
                    .from('cdn_assets')
                    .upsert(rows, { onConflict: 'id,type' });
            }

            if (i % (SHOP_BATCH_SIZE * 10) === 0) {
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
        console.error('Shop group scan error:', err);
        await supabaseAdmin
            .from('cdn_scan_log')
            .update({ status: 'error', finished_at: new Date().toISOString() })
            .eq('id', logId);
    }
}

async function runScan(type: string, startId: number, endId: number, logId: number) {
    if (type === 'group') {
        return runShopGroupScan(startId, endId, logId);
    }
    return runProductCdnScan(startId, endId, logId);
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

    // 1.5. Theater Ticket Booking
    if (action === 'theater-ticket') {
        const skip = parseInt(url.searchParams.get('skip') || '0');
        const take = parseInt(url.searchParams.get('take') || '20');

        if (isNaN(skip) || skip < 0) throw error(400, 'Invalid skip parameter');
        if (isNaN(take) || take < 1 || take > 200) throw error(400, 'Invalid take parameter (1–200)');

        try {
            const result = await getTheaterTicketBooking(skip, take);

            return json({
                items: result.items,
                total: result.total,
                skip: result.skip,
                take: result.take
            }, {
                headers: { 'Cache-Control': 'no-store' }
            });
        } catch (e: any) {
            console.error('[TheaterTicket] API error:', e);
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
            const headers = await getPerformanceAuthHeaders();

            // Fast path — serve straight from the DB cache when it already has this page.
            const { data: cachedRows, count: cachedCount } = await supabaseAdmin
                .from('cdn_assets')
                .select('id, url, title, description, extra_data', { count: 'exact' })
                .eq('type', 'archive')
                .order('id', { ascending: false })
                .range(skip, skip + take - 1);

            if (cachedRows && cachedRows.length === take) {
                maybeTriggerBackgroundRefresh('archive', headers);

                const assets = cachedRows.map((row: any) => ({
                    id: String(row.id),
                    url: row.url || '',
                    title: row.title || 'Performance',
                    description: row.description || '',
                    date: row.extra_data?.date || '',
                    time: row.extra_data?.time || '',
                    placeName: row.extra_data?.placeName || '',
                    memberIdList: row.extra_data?.memberIdList || [],
                    memberNames: row.extra_data?.memberNames || [],
                }));

                return json({
                    items: assets,
                    total: cachedCount ?? assets.length,
                    skip,
                    take,
                }, {
                    headers: { 'Cache-Control': 'no-store' }
                });
            }

            // Fallback — cache doesn't cover this page yet, live-walk it (as before).
            const allIds = await getAllPerformanceIds(headers);
            const pageIds = allIds.slice(skip, skip + take);

            if (url.searchParams.get('raw') === '1') {
                return json({ total: allIds.length, ids: pageIds });
            }

            const { pairs: validPairs, total: validTotal } = await fetchPerformanceArchivePage(
                allIds,
                headers,
                skip,
                take,
            );

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

            // Sync full fields to DB (title/description/extra_data) so this page is
            // servable from the fast path next time.
            const syncRows = assets
                .map(a => ({
                    id: parseInt(a.id),
                    type: 'archive' as const,
                    url: a.url,
                    title: a.title,
                    description: a.description,
                    extra_data: { date: a.date, time: a.time, placeName: a.placeName, memberIdList: a.memberIdList, memberNames: a.memberNames },
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

            maybeTriggerBackgroundRefresh('archive', headers);

            return json({
                items: assets,
                total: validTotal,
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

    // 2.5. Theater Rounds (ticket zones/prices/seats) — separate from Performance
    if (action === 'theater-rounds') {
        const skip = parseInt(url.searchParams.get('skip') || '0');
        const take = parseInt(url.searchParams.get('take') || '20');

        if (isNaN(skip) || skip < 0) throw error(400, 'Invalid skip parameter');
        if (isNaN(take) || take < 1 || take > 200) throw error(400, 'Invalid take parameter (1–200)');

        try {
            const headers = await getPerformanceAuthHeaders();

            // Fast path — serve straight from the DB cache when it already has this page.
            const { data: cachedRows } = await supabaseAdmin
                .from('cdn_assets')
                .select('id, url, title, extra_data')
                .eq('type', 'round')
                .order('id', { ascending: false })
                .range(skip, skip + take - 1);

            if (cachedRows && cachedRows.length === take) {
                maybeTriggerBackgroundRefresh('round', headers);

                const items = cachedRows.map((row: any) => ({
                    id: String(row.id),
                    roundName: row.title || `Round ${row.id}`,
                    startDate: row.extra_data?.startDate || '',
                    endDate: row.extra_data?.endDate || '',
                    isSoldOut: !!row.extra_data?.isSoldOut,
                    seatMapUrl: row.url || '',
                    zones: row.extra_data?.zones || [],
                }));

                return json({ items, skip, take, hasMore: true }, {
                    headers: { 'Cache-Control': 'no-store' }
                });
            }

            // Fallback — cache doesn't cover this page yet, live-walk it (as before).
            const { pairs, hasMore } = await fetchRoundPage(headers, skip, take);

            const items = pairs.map(({ id, item }) => flattenRound(id, item));

            // Sync to DB so this page is servable from the fast path next time.
            const now = new Date().toISOString();
            const syncRows = items.map((flat) => ({
                id: flat.id,
                type: 'round' as const,
                url: flat.seatMapUrl,
                title: flat.roundName,
                description: '',
                extra_data: { startDate: flat.startDate, endDate: flat.endDate, isSoldOut: flat.isSoldOut, zones: flat.zones },
                skus: [1],
                discovered_at: now,
                last_seen: now,
            }));
            if (syncRows.length > 0) {
                supabaseAdmin
                    .from('cdn_assets')
                    .upsert(syncRows, { onConflict: 'id,type' })
                    .then(({ error: dbErr }) => {
                        if (dbErr) console.error('[TheaterRoundsSync] Error:', dbErr.message);
                    });
            }

            maybeTriggerBackgroundRefresh('round', headers);

            return json({
                items: items.map((flat) => ({ ...flat, id: String(flat.id) })),
                skip,
                take,
                hasMore,
            }, {
                headers: { 'Cache-Control': 'no-store' }
            });
        } catch (e: any) {
            console.error('[TheaterRounds] API error:', e);
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