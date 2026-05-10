import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/supabase.server';
import { timingSafeSecretMatch } from '$lib/secret-verify.server';
import { getCDNDiscoveryUrls } from '$lib/bnk48';
import https from 'node:https';

const SCAN_SECRET = import.meta.env.SCAN_SECRET;
const UPPER_BOUND = { product: 15000, group: 2000 };
const BATCH_SIZE = 50;
const TIMEOUT_MS = 2000;

async function checkAnyExists(urls: string[]): Promise<string | null> {
    // คืน URL จริงที่เจอตัวแรก หรือ null ถ้าไม่เจอ
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

function getDiscoveryUrls(type: string, id: number): string[] {
    return getCDNDiscoveryUrls(type as 'product' | 'group', id);
}


export const POST: RequestHandler = async ({ request }) => {
    const secret = request.headers.get('x-scan-secret');
    if (!timingSafeSecretMatch(secret, SCAN_SECRET)) throw error(401, 'Unauthorized');

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
                    const foundUrl = await checkAnyExists(getDiscoveryUrls(type, id));
                    if (!foundUrl) return null;
                    // แปลง CDN URL → proxied URL สำหรับเก็บใน DB
                    const proxiedUrl = foundUrl.replace('https://img.bnk48cdn.net/', '/p/img/');
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