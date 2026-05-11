import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/supabase.server';
import { getCDNDiscoveryUrls } from '$lib/bnk48';
import https from 'node:https';
const TIMEOUT_MS = 3000;

async function headExists(urlStr: string): Promise<boolean> {
    return new Promise((resolve) => {
        const req = https.request(urlStr, {
            method: 'GET',
            timeout: TIMEOUT_MS,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*'
            }
        }, (res) => {
            // GET + early destroy: many CDNs mishandle HEAD; we only need status 200
            res.destroy();
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
        .select('skus, extra_urls')
        .eq('id', id)
        .eq('type', type)
        .maybeSingle();

    if (dbErr) throw error(500, 'DB error');

    // ถ้ามี extra_urls แล้ว (ระบบใหม่) คืนค่า urls ไปเลย ไม่ต้อง HEAD
    if (existing?.extra_urls && existing.extra_urls.length > 0) {
        return json({ urls: existing.extra_urls, skus: existing.skus || [] });
    }
    // ถ้าข้อมูลเก่ามีแค่ skus ให้ทำงาน scan ใหม่เพื่ออัพเดต extra_urls ให้ครบถ้วน

    // ยังไม่เคย expand → HEAD ทุก candidate URL สำหรับ ID นี้ (เรา optimize getCDNDiscoveryUrls ไว้แล้วให้คืนแค่ format ที่เกี่ยวข้อง)
    const candidates = getCDNDiscoveryUrls(type as 'product' | 'group', id);
    const validUrls: string[] = [];
    const validSkus: number[] = [1]; // For backward compatibility with integer array
    
    // HEAD candidates แบบขนาน (ไม่เกิน 20-30 requests อยู่แล้ว)
    const checkResults = await Promise.all(
        candidates.map(async (url) => {
            if (await headExists(url)) {
                return url;
            }
            return null;
        })
    );

    // สร้าง proxy URLs ที่ใช้ได้
    for (const url of checkResults) {
        if (url) {
            const proxyUrl = url.replace('https://img.bnk48cdn.net/shop/', '/api/image/');
            validUrls.push(proxyUrl);
            
            // Extract a number for the legacy `skus` array just in case
            const match = url.match(/(\d+)\.\w+$/);
            if (match) {
                const num = parseInt(match[1]);
                if (!validSkus.includes(num)) validSkus.push(num);
            }
        }
    }

    const foundSkus = validSkus.sort((a, b) => a - b);

    // อัพเดท DB (ไม่ block response ถ้า update ล้มเหลว)
    supabaseAdmin
        .from('cdn_assets')
        .update({ skus: foundSkus, extra_urls: validUrls, last_seen: new Date().toISOString() })
        .eq('id', id)
        .eq('type', type)
        .then(() => { });

    return json({ skus: foundSkus, urls: validUrls });
};