// src/routes/api/check-assets/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const MAX_COUNT = 250; // Hard cap — prevents abuse via huge batch requests
const ALLOWED_TYPES = new Set(['product', 'group']);
const ALLOWED_ORDERS = new Set(['asc', 'desc']);

async function checkUrl(targetUrl: string): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
        const resp = await fetch(targetUrl, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeout);
        return resp.ok;
    } catch {
        clearTimeout(timeout);
        return false;
    }
}

export const GET: RequestHandler = async ({ url }) => {
    const startRaw = parseInt(url.searchParams.get('start') || '0');
    const countRaw = parseInt(url.searchParams.get('count') || '50');
    const type = url.searchParams.get('type') || 'product';
    const order = url.searchParams.get('order') || 'asc';
    const includeSkus = url.searchParams.get('includeSkus') === 'true';

    // Validate inputs
    if (!ALLOWED_TYPES.has(type)) throw error(400, 'Invalid type parameter');
    if (!ALLOWED_ORDERS.has(order)) throw error(400, 'Invalid order parameter');
    if (isNaN(startRaw) || startRaw < 0) throw error(400, 'Invalid start parameter');
    if (isNaN(countRaw) || countRaw < 1) throw error(400, 'Invalid count parameter');

    const start = startRaw;
    const count = Math.min(countRaw, MAX_COUNT); // Enforce hard cap

    let ids: number[] = [];
    if (order === 'asc') {
        for (let i = start; i < start + count; i++) ids.push(i);
    } else {
        for (let i = start; i > start - count && i >= 0; i--) ids.push(i);
    }

    const batchSize = 20;
    const validAssets: { id: string; url: string; extra_skus?: string[] }[] = [];

    for (let i = 0; i < ids.length; i += batchSize) {
        const batchIds = ids.slice(i, i + batchSize);

        const batchResults = await Promise.all(
            batchIds.map(async (idNum) => {
                const id = idNum.toString().padStart(4, '0');
                const baseUrl = type === 'product'
                    ? `https://img.bnk48cdn.net/shop/product/${id}/sku-1.jpg`
                    : `https://img.bnk48cdn.net/shop/product-group/${id}.jpg`;

                if (!(await checkUrl(baseUrl))) return [];

                const mainAsset: { id: string; url: string; extra_skus: string[] } = {
                    id: idNum.toString(),
                    url: type === 'product'
                        ? `/p/img/shop/product/${id}/sku-1.jpg`
                        : `/p/img/shop/product-group/${id}.jpg`,
                    extra_skus: []
                };

                if (type === 'product' && includeSkus) {
                    const skuUrls = Array.from({ length: 7 }, (_, i) => {
                        const sku = i + 2;
                        return `https://img.bnk48cdn.net/shop/product/${id}/sku-${sku}.jpg`;
                    });

                    const skuResults = await Promise.all(
                        skuUrls.map(async (skuUrl, idx) => {
                            const exists = await checkUrl(skuUrl);
                            return exists ? `/p/img/shop/product/${id}/sku-${idx + 2}.jpg` : null;
                        })
                    );

                    mainAsset.extra_skus = skuResults.filter((r): r is string => r !== null);
                }

                return [mainAsset];
            })
        );

        validAssets.push(...batchResults.flat());
    }

    return json(validAssets, {
        headers: { 'Cache-Control': 'public, max-age=300' } // Cache 5 min
    });
};
