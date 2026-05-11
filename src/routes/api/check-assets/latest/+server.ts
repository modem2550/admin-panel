import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/supabase.server';
import { getCDNDiscoveryUrls, getDefaultAssetUrl } from '$lib/bnk48';
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

export const GET: RequestHandler = async ({ url }) => {
    const type = url.searchParams.get('type') || 'product';

    // Check cache
    const cached = cache.get(type);
    if (cached && cached.expires > Date.now()) {
        return json(cached.data);
    }

    console.log(`[API/Latest] Searching latest ${type}...`);
    const startTime = Date.now();

    // ── Strategy 1: ดึง MAX(id) จาก DB (เร็วมาก ~50ms) ──────────────────────
    const { data: maxRow, error: dbErr } = await supabaseAdmin
        .from('cdn_assets')
        .select('id, url')
        .eq('type', type)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!dbErr && maxRow) {
        console.log(`[API/Latest] Found latest ${type}: ${maxRow.id} from DB (Took ${Date.now() - startTime}ms)`);

        const result = {
            id: maxRow.id.toString(),
            url: maxRow.url || getDefaultAssetUrl(type as 'product' | 'group', maxRow.id)
        };

        cache.set(type, { data: result, expires: Date.now() + CACHE_TTL });
        return json(result);
    }

    // ── Strategy 2: DB ว่าง → ใช้ binary search (เฉพาะครั้งแรกที่ยังไม่เคย scan) ──
    console.log(`[API/Latest] DB empty for ${type}, falling back to binary search...`);

    function getCandidateUrls(id: number): string[] {
        return getCDNDiscoveryUrls(type as 'product' | 'group', id);
    }

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
            const fallbackPath = getDefaultAssetUrl('product', id).replace('/p/img/', '');
            const fallbackUrl = `https://img.bnk48cdn.net/${fallbackPath}`;
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
        console.log(`[API/Latest] Found latest ${type}: ${lastFoundId} via binary search (Took ${Date.now() - startTime}ms)`);

        const result = {
            id: lastFoundId.toString(),
            url: getDefaultAssetUrl(type as 'product' | 'group', lastFoundId)
        };

        cache.set(type, { data: result, expires: Date.now() + CACHE_TTL });
        return json(result);
    }

    console.log(`[API/Latest] No ${type} found (Took ${Date.now() - startTime}ms)`);
    return json({ id: '0', url: '' });
};