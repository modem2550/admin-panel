import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/supabase.server';
import https from 'node:https';
const TIMEOUT_MS = 3000;
const MAX_SKU = 10;

async function headExists(urlStr: string): Promise<boolean> {
    return new Promise((resolve) => {
        const req = https.request(urlStr, {
            method: 'HEAD',
            timeout: TIMEOUT_MS,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*'
            }
        }, (res) => {
            resolve(res.statusCode === 200);
        });
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.on('error', () => resolve(false));
        req.end();
    });
}

export const GET: RequestHandler = async ({ url }) => {
    const idParam = url.searchParams.get('id');
    const type = url.searchParams.get('type') || 'product';

    if (!idParam) throw error(400, 'Missing id');
    const id = parseInt(idParam);
    if (isNaN(id)) throw error(400, 'Invalid id');

    // เช็ค DB ก่อนว่า sku ถูก expand แล้วยัง
    const { data: existing, error: dbErr } = await supabaseAdmin
        .from('cdn_assets')
        .select('skus')
        .eq('id', id)
        .eq('type', type)
        .maybeSingle();

    if (dbErr) throw error(500, 'DB error');

    // ถ้ามีมากกว่า 1 sku แล้ว → return จาก DB เลย ไม่ต้อง HEAD
    if (existing?.skus && existing.skus.length > 1) {
        return json({ skus: existing.skus });
    }

    // ยังไม่เคย expand → HEAD sku 2-10 พร้อมกัน (ทั้ง .jpg และ .png)
    const idStr = id.toString();
    const skuChecks = await Promise.all(
        Array.from({ length: MAX_SKU - 1 }, async (_, i) => {
            const sku = i + 2;
            const jpgUrl = `https://img.bnk48cdn.net/shop/product/${idStr}/sku-${sku}.jpg`;
            const pngUrl = `https://img.bnk48cdn.net/shop/product/${idStr}/sku-${sku}.png`;
            if (await headExists(jpgUrl)) return sku;
            if (await headExists(pngUrl)) return sku;
            return null;
        })
    );

    const foundSkus = [1, ...skuChecks.filter((s): s is number => s !== null)];

    // อัพเดท DB (ไม่ block response ถ้า update ล้มเหลว)
    supabaseAdmin
        .from('cdn_assets')
        .update({ skus: foundSkus, last_seen: new Date().toISOString() })
        .eq('id', id)
        .eq('type', type)
        .then(() => { });

    return json({ skus: foundSkus });
};