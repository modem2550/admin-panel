import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/supabase.server';
import { getDefaultAssetUrl } from '$lib/bnk48';

const MAX_COUNT = 250;
const ALLOWED_TYPES = new Set(['product', 'group', 'theater']);

function proxyCdnUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('https://img.bnk48cdn.net/')) {
        return url.replace('https://img.bnk48cdn.net/', '/p/img/');
    }
    return url;
}

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

        const thumb = proxyCdnUrl(typeof p.thumbnailImageUrl === 'string' ? p.thumbnailImageUrl : '');
        const rawList = Array.isArray(p.imageFileUrlList) ? p.imageFileUrlList : [];
        const images = rawList
            .filter((u: unknown): u is string => typeof u === 'string')
            .map((u: string) => proxyCdnUrl(u))
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

type TheaterAsset = {
    id: string;
    url: string;
    title: string;
    description: string;
    date: string;
    time: string;
    placeName: string;
    memberIdList: number[];
    memberNames: string[];
    extra_skus: string[];
};

const memberNameCache = new Map<number, string>();

async function getMemberName(memberId: number): Promise<string> {
    const cached = memberNameCache.get(memberId);
    if (cached) return cached;

    try {
        const memberResp = await fetch(`https://public.bnk48.io/member/${memberId}/profile`);
        if (!memberResp.ok) return `#${memberId}`;
        const member = await memberResp.json();
        const name = member.codeName || member.nickname || member.name || `#${memberId}`;
        memberNameCache.set(memberId, name);
        return name;
    } catch {
        return `#${memberId}`;
    }
}

async function getTheaterAsset(id: number): Promise<TheaterAsset | null> {
    const perfResp = await fetch(`https://public.bnk48.io/performance/${id}`);
    if (!perfResp.ok) return null;
    const perf = await perfResp.json();
    if (!perf || perf.type !== 'theater') return null;

    const memberIds: number[] = Array.isArray(perf.memberIdList) ? perf.memberIdList : [];
    const memberNames = await Promise.all(memberIds.map((memberId) => getMemberName(memberId)));

    return {
        id: String(perf.eventId ?? id),
        url: (perf.imageFileUrl ?? '').replace('https://img.bnk48cdn.net/', '/p/img/'),
        title: perf.title ?? `Theater ${id}`,
        description: perf.description ?? '',
        date: perf.date ?? '',
        time: perf.time ?? '',
        placeName: perf.placeName ?? '',
        memberIdList: memberIds,
        memberNames,
        extra_skus: []
    };
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

    const count = Math.min(countRaw, type === 'theater' ? 60 : MAX_COUNT);
    const rangeStart = order === 'asc' ? Math.max(1, startRaw) : Math.max(1, startRaw - count + 1);
    const rangeEnd = order === 'asc' ? rangeStart + count - 1 : Math.max(1, startRaw);

    if (type === 'theater') {
        const ids: number[] = [];
        if (order === 'asc') {
            for (let id = rangeStart; id <= rangeEnd; id++) ids.push(id);
        } else {
            for (let id = rangeEnd; id >= rangeStart; id--) ids.push(id);
        }

        const assetResults = await Promise.all(ids.map((id) => getTheaterAsset(id)));
        const assets = assetResults.filter((item): item is TheaterAsset => item !== null);
        return json(assets, {
            headers: { 'Cache-Control': 'public, max-age=60' }
        });
    }

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
                    actualUrl = getDefaultAssetUrl(type as 'product' | 'group' | 'theater', row.id);
                }
                
                // Make sure url is proxied
                if (actualUrl.startsWith('https://img.bnk48cdn.net/')) {
                    actualUrl = actualUrl.replace('https://img.bnk48cdn.net/', '/p/img/');
                }

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
                url: getDefaultAssetUrl(type as 'product' | 'group' | 'theater', id),
                extra_skus: []
            });
        }
    } else {
        for (let id = rangeEnd; id >= rangeStart && assets.length < count; id--) {
            assets.push({
                id: id.toString(),
                url: getDefaultAssetUrl(type as 'product' | 'group' | 'theater', id),
                extra_skus: []
            });
        }
    }

    return json(assets, {
        headers: { 'Cache-Control': 'public, max-age=60' }
    });
};