import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/supabase';

const SCAN_SECRET = import.meta.env.SCAN_SECRET;
const UPPER_BOUND = { product: 6000, group: 1200 };
const BATCH_SIZE = 50;
const TIMEOUT_MS = 2000;

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

function makeUrl(type: string, id: number): string {
    const padded = id.toString().padStart(4, '0');
    return type === 'product'
        ? `https://img.bnk48cdn.net/shop/product/${padded}/sku-1.jpg`
        : `https://img.bnk48cdn.net/shop/product-group/${padded}.jpg`;
}

export const POST: RequestHandler = async ({ request }) => {
    // Auth
    const secret = request.headers.get('x-scan-secret');
    if (secret !== SCAN_SECRET) throw error(401, 'Unauthorized');

    const body = await request.json().catch(() => ({}));
    const type = body.type === 'group' ? 'group' : 'product';

    // หา start point จาก max id ที่มีใน DB แล้ว
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

    // สร้าง scan log
    const { data: logRow } = await supabaseAdmin
        .from('cdn_scan_log')
        .insert({ type, status: 'running' })
        .select('id')
        .single();

    const logId = logRow!.id;

    // รัน scan แบบ background (ไม่รอจบ)
    runScan(type, startId, endId, logId);

    return json({ scan_log_id: logId, startId, endId });
};

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
                    const exists = await headExists(makeUrl(type, id));
                    return exists ? id : null;
                })
            );

            const found = results.filter((id): id is number => id !== null);
            scannedCount += batch.length;
            foundCount += found.length;

            if (found.length > 0) {
                const rows = found.map((id) => ({
                    id,
                    type,
                    skus: [1],
                    discovered_at: new Date().toISOString(),
                    last_seen: new Date().toISOString(),
                }));

                await supabaseAdmin
                    .from('cdn_assets')
                    .upsert(rows, { onConflict: 'id,type' });
            }

            // อัพเดท progress ทุก 10 batch
            if (i % (BATCH_SIZE * 10) === 0) {
                await supabaseAdmin
                    .from('cdn_scan_log')
                    .update({ scanned_count: scannedCount, found_count: foundCount })
                    .eq('id', logId);
            }
        }

        // จบ scan
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