import { i as sessionCookieOpts, n as readSessionTokens, r as sessionCookieNames, t as clearSessionCookies } from "../chunks/session-cookies.server.js";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import dns from "node:dns";
//#region src/lib/csp.server.ts
/** CSP ชุดเดียวผ่าน HTTP header — ลดความเสี่ยงจาก meta tag ถูก bypass ในบางบริบท */
function buildContentSecurityPolicy(isHttps) {
	let supabaseHosts = "https://*.supabase.co wss://*.supabase.co";
	try {
		const raw = "https://kqfnhyaktxgulhitdvqq.supabase.co";
		{
			const u = new URL(raw);
			supabaseHosts = `https://${u.host} wss://${u.host}`;
		}
	} catch {}
	const parts = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline'",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com",
		"img-src 'self' data: https: blob:",
		`connect-src 'self' ${supabaseHosts}`,
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"object-src 'none'"
	];
	if (isHttps) parts.push("upgrade-insecure-requests");
	return parts.join("; ");
}
//#endregion
//#region src/lib/validate-env.server.ts
/** แจ้งเตือนตอน boot เมื่อขาดค่าที่จำเป็นใน production */
function validatePublicEnvOnce() {
	const missing = [];
	if (missing.length) console.warn(`[security] Missing env for production: ${missing.join(", ")}`);
}
//#endregion
//#region src/hooks.server.ts
dns.setDefaultResultOrder("ipv4first");
var supabaseUrl = "https://kqfnhyaktxgulhitdvqq.supabase.co";
var supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZm5oeWFrdHhndWxoaXRkdnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NTIxMzQsImV4cCI6MjA4MzIyODEzNH0.pwtVfQJ2vmJCTLOYW8p8FH9M56qXBJL_rDCvfNWvvmA";
var supabaseClient = createClient(supabaseUrl, supabaseAnonKey, { auth: {
	persistSession: false,
	autoRefreshToken: false
} });
var didValidateEnv = false;
function applySecurityHeaders(response, isHttps) {
	response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(isHttps));
	if (isHttps) response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set("Permissions-Policy", "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), browsing-topics=()");
	response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
	response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
}
var handle = async ({ event, resolve }) => {
	if (!didValidateEnv) {
		didValidateEnv = true;
		validatePublicEnvOnce();
	}
	const cookieSecure = event.url.protocol === "https:";
	const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: {
		persistSession: false,
		autoRefreshToken: false
	} });
	event.locals.supabase = supabaseClient;
	const { access, refresh, names } = readSessionTokens(event.cookies, cookieSecure);
	if (access && !refresh || !access && refresh) {
		clearSessionCookies(event.cookies, cookieSecure);
		event.locals.session = null;
		const response = await resolve(event);
		applySecurityHeaders(response, cookieSecure);
		return response;
	}
	if (access && refresh) try {
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
				const legacyPresent = event.cookies.get("sb-access-token") || event.cookies.get("sb-refresh-token");
				const hostMissing = !event.cookies.get(names.access) || !event.cookies.get(names.refresh);
				if (legacyPresent || hostMissing) {
					const o = sessionCookieOpts(true);
					event.cookies.set(names.access, data.session.access_token, {
						...o,
						maxAge: 3600 * 24 * 7
					});
					event.cookies.set(names.refresh, data.session.refresh_token, {
						...o,
						maxAge: 3600 * 24 * 30
					});
					event.cookies.delete("sb-access-token", { path: "/" });
					event.cookies.delete("sb-refresh-token", { path: "/" });
				}
			}
			if (data.session.access_token !== access) {
				const o = sessionCookieOpts(cookieSecure);
				const n = sessionCookieNames(cookieSecure);
				event.cookies.set(n.access, data.session.access_token, {
					...o,
					maxAge: 3600 * 24 * 7
				});
				event.cookies.set(n.refresh, data.session.refresh_token, {
					...o,
					maxAge: 3600 * 24 * 30
				});
				if (cookieSecure) {
					event.cookies.delete("sb-access-token", { path: "/" });
					event.cookies.delete("sb-refresh-token", { path: "/" });
				}
			}
		}
	} catch {
		clearSessionCookies(event.cookies, cookieSecure);
		event.locals.session = null;
	}
	else event.locals.session = null;
	const response = await resolve(event);
	applySecurityHeaders(response, cookieSecure);
	return response;
};
var handleError = ({ error, event }) => {
	const errorId = randomUUID();
	console.error(JSON.stringify({
		errorId,
		path: event.url.pathname,
		name: error instanceof Error ? error.name : typeof error
	}));
	return { message: `Something went wrong. Reference: ${errorId}` };
};
//#endregion
export { handle, handleError };
