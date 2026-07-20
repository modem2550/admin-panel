import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/supabase.server';
import { getDefaultAssetUrl, proxyUrl, DEFAULT_HEADERS } from '$lib/bnk48';
import { getToken } from '$lib/bnk48.server';
import https from 'node:https';

const MAX_COUNT = 250;
const ALLOWED_TYPES = new Set(['product', 'group', 'campaign']);
const ALLOWED_ORDERS = new Set(['asc', 'desc']);

// Helper for 'latest' probing
async function checkExists(urlStr: string): Promise<boolean> {
    return new Promise((resolve) => {
        const req = https.request(urlStr, {
            method: 'GET',
            timeout: 3000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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

// Simple in-memory cache to prevent expensive searches on every request
const latestCache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

async function shopProductExists(id: number, token: string): Promise<boolean> {
    try {
        const url = `https://public.bnk48.io/shop/product/${id}`;
        const resp = await fetch(url, {
            headers: { ...DEFAULT_HEADERS, 'Authorization': `Bearer ${token}` }
        });
        console.log(`[checkExists] ID: ${id}, Status: ${resp.status}`);
        if (!resp.ok) {
            const errText = await resp.text();
            console.log(`[checkExists] Error body for ID ${id}: ${errText.substring(0, 200)}`);
            return false;
        }
        const p = await resp.json();
        return typeof p?.id === 'number';
    } catch (e: any) {
        console.error(`[checkExists] Exception for ID ${id}:`, e.message);
        return false;
    }
}

type ShopProductAsset = {
    id: string;
    url: string;
    title: string;
    description: string;
    imageFileUrlList: string[];
    extra_skus: string[];
};

async function fetchShopProduct(id: number, token: string): Promise<ShopProductAsset | null> {
    try {
        const url = `https://public.bnk48.io/shop/product/${id}`;
        const resp = await fetch(url, {
            headers: { ...DEFAULT_HEADERS, 'Authorization': `Bearer ${token}` }
        });
        console.log(`[fetchProduct] ID: ${id}, Status: ${resp.status}`);
        if (!resp.ok) {
            const errText = await resp.text();
            console.log(`[fetchProduct] Error body for ID ${id}: ${errText.substring(0, 200)}`);
            return null;
        }
        const p = await resp.json();
        console.log(`[fetchProduct] Success parsed JSON for ID ${id}:`, p.title);
        if (!p || typeof p.id !== 'number') return null;

        const thumb = proxyUrl(typeof p.thumbnailImageUrl === 'string' ? p.thumbnailImageUrl : '');
        const rawList = Array.isArray(p.imageFileUrlList) ? p.imageFileUrlList : [];
        const images = rawList
            .filter((u: unknown): u is string => typeof u === 'string')
            .map((u: string) => proxyUrl(u))
            .filter(Boolean);

        const primary = thumb || images[0] || '';
        if (!primary) return null;

        const imageFileUrlList = images.length > 0 ? images : [primary];

        return {
            id: String(p.id),
            url: primary,
            title: typeof p.title === 'string' ? p.title : '',
            description: typeof p.description === 'string' ? p.description : '',
            imageFileUrlList,
            extra_skus: []
        };
    } catch (e: any) {
        console.error(`[fetchProduct] Exception for ID ${id}:`, e.message);
        return null;
    }
}

type CampaignAsset = {
    id: string;
    displayTextLine1: string;
    displayTextLine2: string;
    title: string;
    description: string;
    url: string; // mapping to imageUrl
    progressPercentage: number;
};

async function fetchCampaign(id: number, token: string): Promise<CampaignAsset | null> {
    try {
        const url = `https://public.bnk48.io/campaign/${id}`;
        const resp = await fetch(url, {
            headers: { ...DEFAULT_HEADERS, 'Authorization': `Bearer ${token}` }
        });
        console.log(`[fetchCampaign] ID: ${id}, Status: ${resp.status}`);
        if (!resp.ok) return null;
        const c = await resp.json();
        if (!c || typeof c.id !== 'number') return null;

        return {
            id: String(c.id),
            displayTextLine1: typeof c.displayTextLine1 === 'string' ? c.displayTextLine1 : '',
            displayTextLine2: typeof c.displayTextLine2 === 'string' ? c.displayTextLine2 : '',
            title: typeof c.title === 'string' ? c.title : '',
            description: typeof c.description === 'string' ? c.description : '',
            url: proxyUrl(typeof c.imageUrl === 'string' ? c.imageUrl : ''),
            progressPercentage: typeof c.progressPercentage === 'number' ? c.progressPercentage : 0
        };
    } catch (e: any) {
        console.error(`[fetchCampaign] Exception for ID ${id}:`, e.message);
        return null;
    }
}

async function campaignExists(id: number, token: string): Promise<boolean> {
    try {
        const url = `https://public.bnk48.io/campaign/${id}`;
        const resp = await fetch(url, {
            headers: { ...DEFAULT_HEADERS, 'Authorization': `Bearer ${token}` }
        });
        console.log(`[campaignExists] ID: ${id}, Status: ${resp.status}`);
        if (!resp.ok) return false;
        const c = await resp.json();
        return typeof c?.id === 'number';
    } catch (e: any) {
        console.error(`[campaignExists] Exception for ID ${id}:`, e.message);
        return false;
    }
}

export const GET: RequestHandler = async ({ url, params }) => {
    const type = url.searchParams.get('type') || 'product';

    if (params.mode === 'latest') {
        // ── Case 1: LATEST ASSET PROBING ───────────────────────────────────────
        if (type === 'product') {
            const cached = latestCache.get(type);
            if (cached && cached.expires > Date.now()) {
                return json(cached.data);
            }

            const token = await getToken();

            let low = 0;
            let high = 15000;
            let lastFoundId = 0;

            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                const exists = await shopProductExists(mid, token);
                if (exists) {
                    lastFoundId = mid;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }

            let checkId = lastFoundId + 1;
            let gapLimit = 3;
            while (gapLimit > 0 && checkId <= 16000) {
                if (await shopProductExists(checkId, token)) {
                    lastFoundId = checkId;
                    gapLimit = 3;
                } else {
                    gapLimit--;
                }
                checkId++;
            }

            if (lastFoundId > 0) {
                let thumbUrl = '';
                try {
                    const r = await fetch(`https://public.bnk48.io/shop/product/${lastFoundId}`, {
                        headers: { ...DEFAULT_HEADERS, 'Authorization': `Bearer ${token}` }
                    });
                    console.log(`[latestProductFetch] ID: ${lastFoundId}, Status: ${r.status}`);
                    if (r.ok) {
                        const p = await r.json();
                        if (typeof p.thumbnailImageUrl === 'string') {
                            thumbUrl = p.thumbnailImageUrl.startsWith('https://img.bnk48cdn.net/')
                                ? p.thumbnailImageUrl.replace('https://img.bnk48cdn.net/', '/api/img/')
                                : p.thumbnailImageUrl;
                        }
                    } else {
                        const errText = await r.text();
                        console.log(`[latestProductFetch] Error body: ${errText.substring(0, 200)}`);
                    }
                } catch (e: any) {
                    console.error(`[latestProductFetch] Exception:`, e.message);
                }

                const result = {
                    id: lastFoundId.toString(),
                    url: thumbUrl
                };

                latestCache.set(type, { data: result, expires: Date.now() + CACHE_TTL });
                return json(result);
            }

            return json({ id: '0', url: '' });
        }

        if (type === 'campaign') {
            const cached = latestCache.get(type);
            if (cached && cached.expires > Date.now()) {
                return json(cached.data);
            }

            const token = await getToken();

            let low = 0;
            let high = 1500; // Campaign มักมีจำนวนหลักร้อย (เช่น 497) ตั้งไว้ 1500 กำลังดี
            let lastFoundId = 0;

            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                const exists = await campaignExists(mid, token);
                if (exists) {
                    lastFoundId = mid;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }

            let checkId = lastFoundId + 1;
            let gapLimit = 3;
            while (gapLimit > 0 && checkId <= 2000) {
                if (await campaignExists(checkId, token)) {
                    lastFoundId = checkId;
                    gapLimit = 3;
                } else {
                    gapLimit--;
                }
                checkId++;
            }

            if (lastFoundId > 0) {
                let thumbUrl = '';
                try {
                    const r = await fetch(`https://public.bnk48.io/campaign/${lastFoundId}`, {
                        headers: { ...DEFAULT_HEADERS, 'Authorization': `Bearer ${token}` }
                    });
                    console.log(`[latestCampaignFetch] ID: ${lastFoundId}, Status: ${r.status}`);
                    if (r.ok) {
                        const c = await r.json();
                        if (typeof c.imageUrl === 'string') {
                            thumbUrl = proxyUrl(c.imageUrl);
                        }
                    }
                } catch (e: any) {
                    console.error(`[latestCampaignFetch] Exception:`, e.message);
                }

                const result = {
                    id: lastFoundId.toString(),
                    url: thumbUrl
                };

                latestCache.set(type, { data: result, expires: Date.now() + CACHE_TTL });
                return json(result);
            }

            return json({ id: '0', url: '' });
        }

        // Cache lookup for other types (group)
        const cached = latestCache.get(type);
        if (cached && cached.expires > Date.now()) {
            return json(cached.data);
        }

        // Strategy 1: DB max(id)
        const { data: maxRow, error: dbErr } = await supabaseAdmin
            .from('cdn_assets')
            .select('id, url')
            .eq('type', type)
            .lt('id', 10000)
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!dbErr && maxRow) {
            const result = {
                id: maxRow.id.toString(),
                url: maxRow.url || getDefaultAssetUrl(type as 'product' | 'group', maxRow.id)
            };

            latestCache.set(type, { data: result, expires: Date.now() + CACHE_TTL });
            return json(result);
        }

        // Strategy 2: Probe binary search
        async function quickProbe(id: number): Promise<boolean> {
            const idStr = id.toString();
            let quickUrls: string[];

            if (type === 'group') {
                quickUrls = [
                    `https://img.bnk48cdn.net/shop/product-group/${idStr}.jpg`,
                    `https://img.bnk48cdn.net/shop/product-group/${idStr}.png`
                ];
            } else {
                quickUrls = [
                    `https://img.bnk48cdn.net/shop/product/${idStr}/sku-1.jpg`,
                    `https://img.bnk48cdn.net/shop/product/${idStr}/sku-1.png`
                ];

                const fallbackPath = getDefaultAssetUrl('product', id).replace('/api/image/', '');
                const fallbackUrl = `https://img.bnk48cdn.net/shop/${fallbackPath}`;
                if (!quickUrls.includes(fallbackUrl)) {
                    quickUrls.push(fallbackUrl);
                }
            }

            const results = await Promise.all(quickUrls.map(u => checkExists(u)));
            return results.some(r => r === true);
        }

        let low = 0;
        let high = type === 'product' ? 10000 : 3000;
        let lastFoundId = 0;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const exists = await quickProbe(mid);

            if (exists) {
                lastFoundId = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        let checkId = lastFoundId + 1;
        let gapLimit = 3;
        while (gapLimit > 0 && checkId <= (type === 'product' ? 10000 : 3000)) {
            if (await quickProbe(checkId)) {
                lastFoundId = checkId;
                gapLimit = 3;
            } else {
                gapLimit--;
            }
            checkId++;
        }

        if (lastFoundId > 0) {
            const result = {
                id: lastFoundId.toString(),
                url: getDefaultAssetUrl(type as 'product' | 'group', lastFoundId)
            };

            latestCache.set(type, { data: result, expires: Date.now() + CACHE_TTL });
            return json(result);
        }

        return json({ id: '0', url: '' });
    }

    // ── Case 2: GENERAL RANGE ASSET CHECK ──────────────────────────────────────
    const startRaw = parseInt(url.searchParams.get('start') || '0');
    const countRaw = parseInt(url.searchParams.get('count') || '50');
    const order = url.searchParams.get('order') || 'asc';

    if (!ALLOWED_TYPES.has(type)) throw error(400, 'Invalid type parameter');
    if (!ALLOWED_ORDERS.has(order)) throw error(400, 'Invalid order parameter');
    if (isNaN(startRaw) || startRaw < 0) throw error(400, 'Invalid start parameter');
    if (isNaN(countRaw) || countRaw < 1) throw error(400, 'Invalid count parameter');

    const count = Math.min(countRaw, MAX_COUNT);
    const rangeStart = order === 'asc' ? Math.max(1, startRaw) : Math.max(1, startRaw - count + 1);
    const rangeEnd = order === 'asc' ? rangeStart + count - 1 : Math.max(1, startRaw);

    if (type === 'product') {
        const token = await getToken();
        const ids: number[] = [];
        if (order === 'asc') {
            for (let id = rangeStart; id <= rangeEnd; id++) ids.push(id);
        } else {
            for (let id = rangeEnd; id >= rangeStart; id--) ids.push(id);
        }

        const assetResults = await Promise.all(ids.map((id) => fetchShopProduct(id, token)));
        const assets = assetResults.filter((item): item is ShopProductAsset => item !== null);
        return json(assets, {
            headers: { 'Cache-Control': 'public, max-age=60' }
        });
    }

    if (type === 'campaign') {
        const token = await getToken();
        const ids: number[] = [];
        if (order === 'asc') {
            for (let id = rangeStart; id <= rangeEnd; id++) ids.push(id);
        } else {
            for (let id = rangeEnd; id >= rangeStart; id--) ids.push(id);
        }

        const assetResults = await Promise.all(ids.map((id) => fetchCampaign(id, token)));
        const assets = assetResults.filter((item): item is CampaignAsset => item !== null);
        return json(assets, {
            headers: { 'Cache-Control': 'public, max-age=60' }
        });
    }

    // DB strategy for non-product types
    try {
        const { data: rows, error: dbErr } = await supabaseAdmin
            .from('cdn_assets')
            .select('id, url, skus, extra_urls')
            .eq('type', type)
            .gte('id', rangeStart)
            .lte('id', rangeEnd)
            .order('id', { ascending: order === 'asc' })
            .limit(count);

        if (!dbErr && rows && rows.length > 0) {
            const assets = rows.map((row: any) => {
                const idStr = row.id.toString();
                let actualUrl = row.extra_urls?.[0] || row.url;
                if (!actualUrl || actualUrl === '') {
                    actualUrl = getDefaultAssetUrl(type as 'product' | 'group', row.id);
                }
                actualUrl = proxyUrl(actualUrl);

                return {
                    id: idStr,
                    url: actualUrl,
                    extra_skus: [] as string[]
                };
            });
            return json(assets, {
                headers: { 'Cache-Control': 'public, max-age=60' }
            });
        }
    } catch {
        // Fallthrough
    }

    const assets: { id: string; url: string; extra_skus: string[] }[] = [];

    if (order === 'asc') {
        for (let id = rangeStart; id <= rangeEnd && assets.length < count; id++) {
            assets.push({
                id: id.toString(),
                url: getDefaultAssetUrl(type as 'product' | 'group', id),
                extra_skus: []
            });
        }
    } else {
        for (let id = rangeEnd; id >= rangeStart && assets.length < count; id--) {
            assets.push({
                id: id.toString(),
                url: getDefaultAssetUrl(type as 'product' | 'group', id),
                extra_skus: []
            });
        }
    }

    return json(assets, {
        headers: { 'Cache-Control': 'public, max-age=60' }
    });
};
