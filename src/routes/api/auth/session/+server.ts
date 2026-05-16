// Endpoint สำหรับรับ token จาก client แล้วเซ็ต HttpOnly cookie บน server

import { json, error } from '@sveltejs/kit';
import { isRateLimited } from '$lib/rate-limit.server';
import { assertBrowserMutation } from '$lib/security-guards.server';
import { securityAudit } from '$lib/security-audit.server';
import {
	clearSessionCookies,
	sessionCookieNames,
	sessionCookieOpts
} from '$lib/session-cookies.server';
import type { RequestHandler } from './$types';

const SESSION_POST_LIMIT = 40;
const SESSION_POST_WINDOW_MS = 60_000;
const MAX_BODY_CHARS = 24_000;

function guardMutation(request: Request, url: URL) {
	try {
		assertBrowserMutation(request, url);
	} catch (e) {
		securityAudit('auth.session.blocked', { path: url.pathname });
		throw e;
	}
}

export const POST: RequestHandler = async (event) => {
	const { request, cookies, url, getClientAddress } = event;
	guardMutation(request, url);

	let clientKey = 'unknown';
	try {
		clientKey = getClientAddress() || request.headers.get('x-forwarded-for') || '127.0.0.1';
	} catch {
		clientKey = request.headers.get('x-forwarded-for') || '127.0.0.1';
	}



	if (isRateLimited(`session:post:${clientKey}`, SESSION_POST_LIMIT, SESSION_POST_WINDOW_MS)) {
		securityAudit('auth.session.rate_limited', {});
		console.warn(`[API/Session] Rate limited: ${clientKey}`);
		throw error(429, 'Too many requests');
	}

	const secure = url.protocol === 'https:';
	const raw = await request.text();
	if (raw.length > MAX_BODY_CHARS) {
		console.warn(`[API/Session] Payload too large from ${clientKey}`);
		throw error(413, 'Payload too large');
	}

	let body: { access_token?: string; refresh_token?: string };
	try {
		body = JSON.parse(raw);
	} catch {
		console.error(`[API/Session] Invalid JSON from ${clientKey}`);
		throw error(400, 'Invalid JSON');
	}

	const { access_token, refresh_token } = body;

	if (!access_token || !refresh_token) {
		console.warn(`[API/Session] Missing tokens in request from ${clientKey}`);
		throw error(400, 'Missing tokens');
	}

	const names = sessionCookieNames(secure);
	const o = sessionCookieOpts(secure);

	cookies.set(names.access, access_token, {
		...o,
		maxAge: 60 * 60 * 24 * 7
	});

	cookies.set(names.refresh, refresh_token, {
		...o,
		maxAge: 60 * 60 * 24 * 30
	});

	if (secure) {
		cookies.delete('sb-access-token', { path: '/' });
		cookies.delete('sb-refresh-token', { path: '/' });
	}

	securityAudit('auth.session.created', {});


	return json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
};

export const DELETE: RequestHandler = async ({ request, cookies, url }) => {
	guardMutation(request, url);
	const secure = url.protocol === 'https:';
	clearSessionCookies(cookies, secure);
	securityAudit('auth.session.deleted', {});
	return json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
};
