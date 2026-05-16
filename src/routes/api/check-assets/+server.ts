import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/supabase.server';
import { getDefaultAssetUrl } from '$lib/bnk48';

const MAX_COUNT = 250;
const ALLOWED_TYPES = new Set(['product', 'group']);

import { proxyUrl } from '$lib/bnk48';

type ShopProductAsset = {
    id: string;
    url: string;
    title: string;
    description: string;
    imageFileUrlList: string[];
    extra_skus: string[];
};

async function fetchShopProduct(id: number): Promise<ShopProductAsset | null> {
    try {
        const resp = await fetch(`https://public.bnk48.io/shop/product/${id}`);
        if (!resp.ok) return null;
        const p = await resp.json();
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
    } catch {
        return null;
    }
}


const ALLOWED_ORDERS = new Set(['asc', 'desc']);

export const GET: RequestHandler = async ({ url }) => {
    const startRaw = parseInt(url.searchParams.get('start') || '0');
    const countRaw = parseInt(url.searchParams.get('count') || '50');
    const type = url.searchParams.get('type') || 'product';
    const order = url.searchParams.get('order') || 'asc';

    if (!ALLOWED_TYPES.has(type)) throw error(400, 'Invalid type parameter');
    if (!ALLOWED_ORDERS.has(order)) throw error(400, 'Invalid order parameter');
    if (isNaN(startRaw) || startRaw < 0) throw error(400, 'Invalid start parameter');
    if (isNaN(countRaw) || countRaw < 1) throw error(400, 'Invalid count parameter');

    const count = Math.min(countRaw, MAX_COUNT);
    const rangeStart = order === 'asc' ? Math.max(1, startRaw) : Math.max(1, startRaw - count + 1);
    const rangeEnd = order === 'asc' ? rangeStart + count - 1 : Math.max(1, startRaw);



    if (type === 'product') {
        const ids: number[] = [];
        if (order === 'asc') {
            for (let id = rangeStart; id <= rangeEnd; id++) ids.push(id);
        } else {
            for (let id = rangeEnd; id >= rangeStart; id--) ids.push(id);
        }

        const assetResults = await Promise.all(ids.map((id) => fetchShopProduct(id)));
        const assets = assetResults.filter((item): item is ShopProductAsset => item !== null);
        return json(assets, {
            headers: { 'Cache-Control': 'public, max-age=60' }
        });
    }

    // Strategy 1: ลองดึงจาก DB ก่อน
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
                // Use validated extra_urls[0] if available, otherwise row.url, otherwise fallback to generator
                let actualUrl = row.extra_urls?.[0] || row.url;
                if (!actualUrl || actualUrl === '') {
                    actualUrl = getDefaultAssetUrl(type as 'product' | 'group', row.id);
                }
                
                // Make sure url is proxied
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
        // DB ไม่พร้อม — fallthrough to generated IDs
    }

    // Strategy 2: ถ้า DB ว่าง หรือ RLS บล็อก → สร้าง URL จาก ID range โดยตรง
    // ไม่ verify ว่ามีจริง แต่ frontend มี onerror handler สำหรับรูปที่โหลดไม่ได้
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