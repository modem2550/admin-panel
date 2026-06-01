import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

import { dev } from '$app/environment';
import { isHttpError } from '@sveltejs/kit';
import { buildContentSecurityPolicy } from '$lib/csp.server';
import {
	clearSessionCookies,
	readSessionTokens,
	sessionCookieNames,
	sessionCookieOpts
} from '$lib/session-cookies.server';
import { validatePublicEnvOnce } from '$lib/validate-env.server';
import type { Handle, HandleServerError } from '@sveltejs/kit';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
	if (!supabaseUrl || !supabaseAnonKey) return null;
	if (!supabaseClient) {
		supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
			auth: { persistSession: false, autoRefreshToken: false }
		});
	}
	return supabaseClient;
}

let didValidateEnv = false;

/** macOS WebView probes these paths automatically — not app routes. */
const WEBVIEW_ICON_PATHS = new Set([
	'/apple-touch-icon.png',
	'/apple-touch-icon-precomposed.png'
]);

function replyWebviewIconProbe(pathname: string): Response | null {
	if (!WEBVIEW_ICON_PATHS.has(pathname)) return null;
	return new Response(null, {
		status: 302,
		headers: { Location: '/favicon.ico', 'Cache-Control': 'no-store' }
	});
}

function applySecurityHeaders(response: Response, isHttps: boolean) {
	response.headers.set('Content-Security-Policy', buildContentSecurityPolicy(isHttps));

	const contentType = response.headers.get('content-type') ?? '';
	if (process.env.TAURI_DESKTOP === '1' && contentType.includes('text/html')) {
		response.headers.set('Cache-Control', 'no-store');
	}

	if (!dev && isHttps) {
		response.headers.set(
			'Strict-Transport-Security',
			'max-age=63072000; includeSubDomains; preload'
		);
	}

	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set(
		'Permissions-Policy',
		'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), browsing-topics=()'
	);
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
}

export const handle: Handle = async ({ event, resolve }) => {
	const iconProbe = replyWebviewIconProbe(event.url.pathname);
	if (iconProbe) return iconProbe;

	if (!didValidateEnv) {
		didValidateEnv = true;
		validatePublicEnvOnce();
	}

	const cookieSecure = event.url.protocol === 'https:';
	const supabase = getSupabaseClient();
	event.locals.supabase = supabase;

	const { access, refresh, names } = readSessionTokens(event.cookies, cookieSecure);

	if ((access && !refresh) || (!access && refresh)) {
		clearSessionCookies(event.cookies, cookieSecure);
		event.locals.session = null;
		const response = await resolve(event);
		applySecurityHeaders(response, cookieSecure);
		return response;
	}

	if (access && refresh && supabase) {
		try {
			const { data, error } = await supabase.auth.setSession({
				access_token: access,
				refresh_token: refresh
			});

			if (error || !data.session) {
				clearSessionCookies(event.cookies, cookieSecure);
				event.locals.session = null;
			} else {
				event.locals.session = data.session;

				if (cookieSecure && data.session) {
					const legacyPresent =
						event.cookies.get('sb-access-token') || event.cookies.get('sb-refresh-token');
					const hostMissing =
						!event.cookies.get(names.access) || !event.cookies.get(names.refresh);
					if (legacyPresent || hostMissing) {
						const o = sessionCookieOpts(true);
						event.cookies.set(names.access, data.session.access_token, {
							...o,
							maxAge: 60 * 60 * 24 * 7
						});
						event.cookies.set(names.refresh, data.session.refresh_token!, {
							...o,
							maxAge: 60 * 60 * 24 * 30
						});
						event.cookies.delete('sb-access-token', { path: '/' });
						event.cookies.delete('sb-refresh-token', { path: '/' });
					}
				}

				if (data.session.access_token !== access) {
					const o = sessionCookieOpts(cookieSecure);
					const n = sessionCookieNames(cookieSecure);
					event.cookies.set(n.access, data.session.access_token, {
						...o,
						maxAge: 60 * 60 * 24 * 7
					});
					event.cookies.set(n.refresh, data.session.refresh_token!, {
						...o,
						maxAge: 60 * 60 * 24 * 30
					});
					if (cookieSecure) {
						event.cookies.delete('sb-access-token', { path: '/' });
						event.cookies.delete('sb-refresh-token', { path: '/' });
					}
				}
			}
		} catch {
			clearSessionCookies(event.cookies, cookieSecure);
			event.locals.session = null;
		}
	} else {
		event.locals.session = null;
	}

	const response = await resolve(event);
	applySecurityHeaders(response, cookieSecure);
	return response;
};

const isDesktopBundle = process.env.TAURI_DESKTOP === '1';

export const handleError: HandleServerError = ({ error, event }) => {
	if (isHttpError(error) && error.status === 404 && WEBVIEW_ICON_PATHS.has(event.url.pathname)) {
		return { message: 'Not Found' };
	}

	const errorId = randomUUID();
	const message = error instanceof Error ? error.message : 'Unknown error';

	if (!dev && !isDesktopBundle) {
		console.error(
			JSON.stringify({
				errorId,
				path: event.url.pathname,
				name: error instanceof Error ? error.name : typeof error,
				message
			})
		);
		return {
			message: `Something went wrong. Reference: ${errorId}`
		};
	}

	console.error(`[${errorId}] ${event.url.pathname}:`, error);
	return {
		message: `${message} (ref: ${errorId})`
	};
};
