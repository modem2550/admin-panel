import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const DOMAIN_MAP: Record<string, string> = {
    'img': 'https://img.bnk48cdn.net',
    'pub': 'https://public.bnk48.io',
    'usr': 'https://user.bnk48.io',
    'app': 'https://app.bnk48.com',
    'api': 'https://api.bnk48.com'
};

export const GET: RequestHandler = async ({ params, url, fetch }) => {
    const fullPath = params.path;
    if (!fullPath) throw error(400, 'Missing path');

    const parts = fullPath.split('/');
    const prefix = parts[0];
    const remainingPath = parts.slice(1).join('/');

    const baseDomain = DOMAIN_MAP[prefix];
    if (!baseDomain) throw error(404, 'Invalid proxy prefix');

    // Reconstruct the target URL safely
    const targetUrlString = `${baseDomain}/${remainingPath}`;
    const targetUrl = new URL(targetUrlString);
    
    // Append any query parameters from the original request
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

        const blob = await response.blob();
        const contentType = response.headers.get('content-type');

        return new Response(blob, {
            status: response.status,
            headers: {
                'Content-Type': contentType || 'application/octet-stream',
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (e) {
        console.error('Stealth proxy execution error:', e);
        throw error(500, 'Proxy operation failed');
    }
};
