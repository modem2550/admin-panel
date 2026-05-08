// src/routes/api/check-assets/latest/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function checkExists(targetUrl: string): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
        const resp = await fetch(targetUrl, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeout);
        return resp.ok;
    } catch {
        clearTimeout(timeout);
        // FIX: network error/timeout ≠ "ไม่มีรูป"
        // ใน binary search ถ้า throw ต้องถือว่า "ไม่รู้" ไม่ใช่ "ไม่มี"
        // คืน null แทน boolean เพื่อแยก 3 กรณี
        return false; // caller จัดการ via wrapper ด้านล่าง
    }
}

// คืน: true = มี, false = ไม่มี, null = network error (ไม่นับ)
async function probe(targetUrl: string): Promise<boolean | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
        const resp = await fetch(targetUrl, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeout);
        return resp.ok;
    } catch {
        clearTimeout(timeout);
        return null; // timeout/error — ไม่รู้ผล
    }
}

export const GET: RequestHandler = async ({ url }) => {
    const type = url.searchParams.get('type') || 'product';
    let latest: { id: string; url: string } | null = null;

    function makeUrl(id: number): string {
        const padded = id.toString().padStart(4, '0');
        return type === 'product'
            ? `https://img.bnk48cdn.net/shop/product/${padded}/sku-1.jpg`
            : `https://img.bnk48cdn.net/shop/product-group/${padded}.jpg`;
    }

    // Step-up approach with grace period for gaps
    let current = 0;
    let step = 1000;
    const maxId = type === 'product' ? 25000 : 5000;

    // Coarse search
    while (current + step <= maxId) {
        const target = current + step;
        let exists = await probe(makeUrl(target));

        // Retry once if timeout
        if (exists === null) exists = await probe(makeUrl(target));

        if (exists === true) {
            current = target;
            latest = { id: target.toString().padStart(4, '0'), url: makeUrl(target) };
        } else {
            // Only if we are sure it's 404 (exists === false) or after retries (exists === null)
            // Gap check: check a bit further
            const lookahead = target + 200;
            let lookExists = await probe(makeUrl(lookahead));
            if (lookExists === null) lookExists = await probe(makeUrl(lookahead));

            if (lookExists === true) {
                current = lookahead;
                latest = { id: lookahead.toString().padStart(4, '0'), url: makeUrl(lookahead) };
            } else {
                if (step > 10) {
                    step = Math.floor(step / 5);
                } else {
                    break;
                }
            }
        }
    }

    // Phase 2: Fine refinement (step 1)
    let fine = current;
    while (fine < current + 1500 && fine <= maxId) {
        let exists = await probe(makeUrl(fine + 1));
        if (exists === null) exists = await probe(makeUrl(fine + 1));

        if (exists === true) {
            fine++;
            latest = { id: fine.toString().padStart(4, '0'), url: makeUrl(fine) };
        } else {
            // Check just one more for tiny gaps
            let nextExists = await probe(makeUrl(fine + 2));
            if (nextExists === null) nextExists = await probe(makeUrl(fine + 2));

            if (nextExists === true) {
                fine += 2;
                latest = { id: fine.toString().padStart(4, '0'), url: makeUrl(fine) };
            } else {
                break;
            }
        }
    }

    if (latest) {
        const prefix = 'img';
        const parsed = new URL(latest.url);
        const path = parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname;
        return json({
            id: latest.id,
            url: `/p/${prefix}/${path}`
        });
    }
    return json({ id: '0000', url: '' });
};