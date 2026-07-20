// src/routes/api/[...path]/+server.ts
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getToken } from '$lib/bnk48.server';
import { DEFAULT_HEADERS } from '$lib/bnk48';

// ✅ Whitelist domain — ป้องกัน SSRF (เหมือนเดิม ดีแล้ว)
const DOMAIN_MAP: Record<string, string> = {
	'img': 'https://img.bnk48cdn.net',
	'pub': 'https://public.bnk48.io',
	'usr': 'https://user.bnk48.io',
	'app': 'https://app.bnk48.com',
	'api': 'https://api.bnk48.com'
};

// prefix ที่เป็น static CDN — ไม่ต้องการ Bearer token
const CDN_PREFIXES = new Set(['img']);

// ✅ อนุญาต content type ที่ควรผ่าน proxy เท่านั้น
const ALLOWED_CONTENT_TYPES = [
	'image/',
	'video/',
	'audio/',
	'application/vnd.apple.mpegurl',  // m3u8
	'application/x-mpegurl',
	'application/octet-stream',
];

function isAllowedContentType(contentType: string | null): boolean {
	if (!contentType) return true;
	return ALLOWED_CONTENT_TYPES.some(t => contentType.startsWith(t));
}

export const GET: RequestHandler = async ({ params, url, fetch }) => {

	const fullPath = params.path;
	if (!fullPath) throw error(400, 'Missing path');

	const parts = fullPath.split('/');
	const prefix = parts[0];
	const remainingPath = parts.slice(1).join('/');

	const baseDomain = DOMAIN_MAP[prefix];
	if (!baseDomain) throw error(404, 'Invalid proxy prefix');

	// Reconstruct URL อย่างปลอดภัย
	const targetUrl = new URL(`${baseDomain}/${remainingPath}`);
	url.searchParams.forEach((value, key) => {
		targetUrl.searchParams.set(key, value);
	});

	// ✅ ใส่ Bearer token และ Headers จริงเฉพาะ BNK48 API endpoints (ไม่ใช่ static CDN img)
	const requestHeaders: Record<string, string> = { 'Accept': '*/*' };

	if (!CDN_PREFIXES.has(prefix)) {
		const token = await getToken();
		Object.assign(requestHeaders, DEFAULT_HEADERS, {
			'Authorization': `Bearer ${token}`
		});
	}

	try {
		const response = await fetch(targetUrl.toString(), { headers: requestHeaders });

		if (!response.ok) {
			return new Response(null, {
				status: response.status,
				headers: { 'Cache-Control': 'no-store' }
			});
		}

		const contentType = response.headers.get('content-type');

		// ✅ กรอง content type ที่ไม่ควรผ่าน proxy (เช่น text/html, application/json)
		if (!isAllowedContentType(contentType)) {
			throw error(403, 'Content type not allowed');
		}

		const blob = await response.blob();

		// ✅ origin เฉพาะ domain ของแอปเอง แทนที่จะเป็น *
		const allowedOrigin = url.origin;

		return new Response(blob, {
			status: response.status,
			headers: {
				'Content-Type': contentType || 'application/octet-stream',
				'Cache-Control': 'public, max-age=3600',
				'Access-Control-Allow-Origin': allowedOrigin,  // ✅ จำกัด origin
				'Vary': 'Origin'
			}
		});
	} catch (e) {
		if (e instanceof Response) throw e; // re-throw error() ที่เรา throw เอง
		// ✅ ไม่ log error detail ที่อาจมีข้อมูลภายใน
		throw error(500, 'Proxy failed');
	}
};