import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const IMAGE_CDN_BASE = 'https://img.bnk48cdn.net/shop';

const ALLOWED_CONTENT_TYPES = [
    'image/',
    'video/',
    'audio/',
    'application/vnd.apple.mpegurl',
    'application/x-mpegurl',
    'application/octet-stream',
];

function isAllowedContentType(contentType: string | null): boolean {
    if (!contentType) return true;
    return ALLOWED_CONTENT_TYPES.some(t => contentType.startsWith(t));
}

export const GET: RequestHandler = async ({ params, url, fetch, locals }) => {
    if (!locals.session) {
        return new Response(null, {
            status: 401,
            headers: { 'Cache-Control': 'no-store', 'WWW-Authenticate': 'session' }
        });
    }

    const assetPath = params.path;
    if (!assetPath) throw error(400, 'Missing image path');

    // ✅ validate path — ป้องกัน path traversal
    if (!/^[\w\-./]+$/.test(assetPath)) throw error(400, 'Invalid path');

    const targetUrl = new URL(`${IMAGE_CDN_BASE}/${assetPath}`);
    url.searchParams.forEach((value, key) => {
        targetUrl.searchParams.set(key, value);
    });

    try {
        const response = await fetch(targetUrl.toString());

        if (!response.ok) {
            return new Response(null, {
                status: response.status,
                headers: { 'Cache-Control': 'no-store' }
            });
        }

        const contentType = response.headers.get('content-type');
        if (!isAllowedContentType(contentType)) throw error(403, 'Content type not allowed');

        // ✅ stream โดยตรง ไม่โหลดเข้า memory
        return new Response(response.body, {
            status: response.status,
            headers: {
                'Content-Type': contentType || 'application/octet-stream',
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': url.origin,
                'Vary': 'Origin'
            }
        });
    } catch (e) {
        if (e instanceof Response) throw e;
        throw error(500, 'Image proxy failed');
    }
};