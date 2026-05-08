import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/supabase';

const TIMEOUT_MS = 2000;
const MAX_SKU = 5;

async function headExists(url: string): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const resp = await fetch(url, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeout);
        return resp.ok;
    } catch {
        clearTimeout(timeout);
        return false;
    }
}

export const GET: RequestHandler = async ({ url }) => {
    const idParam = url.searchParams.get('id');
    const type = url.searchParams.get('type') || 'product';

    if (!idParam) throw error(400, 'Missing id');
    const id = parseInt(idParam);
    if (isNaN(id)) throw error(400, 'Invalid id');

    // เช็ค DB ก่อนว่า sku ถูก expand แล้วยัง
    const { data: existing } = await supabaseAdmin
        .from('cdn_assets')
        .select('skus')
        .eq('id', id)
        .eq('type', type)
        .maybeSingle();

    // ถ้ามีมากกว่า 1 sku แล้ว → return จาก DB เลย ไม่ต้อง HEAD
    if (existing && existing.skus.length > 1) {
        return json({ skus: existing.skus });
    }

    // ยังไม่เคย expand → HEAD sku 2-5 พร้อมกัน
    const padded = id.toString().padStart(4, '0');
    const skuChecks = await Promise.all(
        Array.from({ length: MAX_SKU - 1 }, (_, i) => {
            const sku = i + 2;
            const skuUrl = `https://img.bnk48cdn.net/shop/product/${padded}/sku-${sku}.jpg`;
            return headExists(skuUrl).then((exists) => (exists ? sku : null));
        })
    );

    const foundSkus = [1, ...skuChecks.filter((s): s is number => s !== null)];

    // อัพเดท DB
    await supabaseAdmin
        .from('cdn_assets')
        .update({ skus: foundSkus, last_seen: new Date().toISOString() })
        .eq('id', id)
        .eq('type', type);

    return json({ skus: foundSkus });
};