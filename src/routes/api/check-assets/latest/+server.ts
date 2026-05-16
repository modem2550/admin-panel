import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/supabase.server';
import { getDefaultAssetUrl } from '$lib/bnk48';
import https from 'node:https';

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
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes



async function shopProductExists(id: number): Promise<boolean> {
    try {
        const resp = await fetch(`https://public.bnk48.io/shop/product/${id}`);
        if (!resp.ok) return false;
        const p = await resp.json();
        return typeof p?.id === 'number';
    } catch {
        return false;
    }
}

export const GET: RequestHandler = async ({ url }) => {
    const type = url.searchParams.get('type') || 'product';



    if (type === 'product') {
        const cached = cache.get(type);
        if (cached && cached.expires > Date.now()) {
            return json(cached.data);
        }


        const startTime = Date.now();

        let low = 0;
        let high = 15000;
        let lastFoundId = 0;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const exists = await shopProductExists(mid);
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
            if (await shopProductExists(checkId)) {
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
                const r = await fetch(`https://public.bnk48.io/shop/product/${lastFoundId}`);
                if (r.ok) {
                    const p = await r.json();
                    if (typeof p.thumbnailImageUrl === 'string') {
                        thumbUrl = p.thumbnailImageUrl.startsWith('https://img.bnk48cdn.net/')
                            ? p.thumbnailImageUrl.replace('https://img.bnk48cdn.net/', '/api/img/')
                            : p.thumbnailImageUrl;
                    }
                }
            } catch {
                /* ignore */
            }



            const result = {
                id: lastFoundId.toString(),
                url: thumbUrl
            };

            cache.set(type, { data: result, expires: Date.now() + CACHE_TTL });
            return json(result);
        }

        return json({ id: '0', url: '' });
    }

    // Check cache
    const cached = cache.get(type);
    if (cached && cached.expires > Date.now()) {
        return json(cached.data);
    }


    const startTime = Date.now();

    // ── Strategy 1: ดึง MAX(id) จาก DB (เร็วมาก ~50ms) ──────────────────────
    const { data: maxRow, error: dbErr } = await supabaseAdmin
        .from('cdn_assets')
        .select('id, url')
        .eq('type', type)
        .lt('id', 10000) // SAFETY
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!dbErr && maxRow) {


        const result = {
            id: maxRow.id.toString(),
            url: maxRow.url || getDefaultAssetUrl(type as 'product' | 'group', maxRow.id)
        };

        cache.set(type, { data: result, expires: Date.now() + CACHE_TTL });
        return json(result);
    }

    // ── Strategy 2: DB ว่าง → ใช้ binary search (เฉพาะครั้งแรกที่ยังไม่เคย scan) ──


    // ใช้ probe แบบเร็ว — ลองแค่ sku-1.jpg/png และ format เฉพาะของ ID นั้นๆ
    // ไม่ต้องลองทุก candidate URL (เร็วกว่าหลายร้อยเท่า)
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

            // Add the specific fallback format for this ID range
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

    // Trailing check — ดูเพิ่มอีก 3 ID
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

        cache.set(type, { data: result, expires: Date.now() + CACHE_TTL });
        return json(result);
    }


    return json({ id: '0', url: '' });
};