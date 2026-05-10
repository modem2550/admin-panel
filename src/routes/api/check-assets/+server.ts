import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/supabase.server';

const MAX_COUNT = 250;
const ALLOWED_TYPES = new Set(['product', 'group']);
const ALLOWED_ORDERS = new Set(['asc', 'desc']);

function buildDefaultUrl(type: string, id: number): string {
    const idStr = id.toString();
    return type === 'product'
        ? `/p/img/shop/product/${idStr}/sku-1.jpg`
        : `/p/img/shop/product-group/${idStr}.jpg`;
}

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
    const rangeStart = order === 'asc' ? startRaw : Math.max(0, startRaw - count + 1);
    const rangeEnd = order === 'asc' ? startRaw + count - 1 : startRaw;

    // Strategy 1: ลองดึงจาก DB ก่อน
    try {
        const { data: rows, error: dbErr } = await supabaseAdmin
            .from('cdn_assets')
            .select('id, url, skus')
            .eq('type', type)
            .gte('id', rangeStart)
            .lte('id', rangeEnd)
            .order('id', { ascending: order === 'asc' })
            .limit(count);

        if (!dbErr && rows && rows.length > 0) {
            const assets = rows.map((row: any) => {
                const idStr = row.id.toString();
                return {
                    id: idStr,
                    url: row.url || buildDefaultUrl(type, row.id),
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
                url: buildDefaultUrl(type, id),
                extra_skus: []
            });
        }
    } else {
        for (let id = rangeEnd; id >= rangeStart && assets.length < count; id--) {
            assets.push({
                id: id.toString(),
                url: buildDefaultUrl(type, id),
                extra_skus: []
            });
        }
    }

    return json(assets, {
        headers: { 'Cache-Control': 'public, max-age=60' }
    });
};