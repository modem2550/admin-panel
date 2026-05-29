import { createClient } from "@supabase/supabase-js";
//#region src/lib/api.ts
/**
* Tauri Desktop API Helper
*
* When the desktop app runs the embedded local server (production build),
* `/api/...` requests stay on the same origin and need no rewriting.
*
* For static-only Tauri builds, relative `/api/...` fetches can be rewritten
* to a remote backend (Netlify) via `VITE_TAURI_API_BASE_URL` or localStorage.
*/
var STORAGE_KEY = "tauri-api-base-url";
/** Compile-time remote API base (optional fallback for static desktop builds). */
var DEFAULT_API_BASE_URL = (void 0)?.replace(/\/+$/, "") ?? "";
var _isTauri = null;
/** True when built for Tauri desktop (`VITE_TAURI` set during `tauri build`). */
function isTauriBuild() {
	return false;
}
/** Returns true when the app is running inside a Tauri webview. */
function isTauri() {
	if (_isTauri !== null) return _isTauri;
	if (isTauriBuild()) {
		_isTauri = true;
		return true;
	}
	if (typeof window === "undefined") {
		_isTauri = false;
		return false;
	}
	_isTauri = !!(window.__TAURI_INTERNALS__ || window.__TAURI__);
	return _isTauri;
}
/** Embedded Node server in production Tauri — API calls stay same-origin. */
function usesEmbeddedServer() {
	if (typeof window === "undefined") return false;
	const host = window.location.hostname;
	return host === "127.0.0.1" || host === "localhost";
}
/** Read the configured API base URL (from localStorage, or the compile-time default). */
function getApiBaseUrl() {
	if (typeof window !== "undefined") {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) return stored.replace(/\/+$/, "");
	}
	return DEFAULT_API_BASE_URL;
}
var _fetchPatched = false;
/**
* Monkey-patch `window.fetch` so that any relative `/api/...` request is
* transparently redirected to the Netlify backend when running in Tauri.
*
* Safe to call multiple times — the patch is applied only once.
*/
function installFetchOverride() {
	if (_fetchPatched) return;
	if (typeof window === "undefined") return;
	if (!isTauri()) return;
	if (usesEmbeddedServer()) return;
	const originalFetch = window.fetch.bind(window);
	window.fetch = function patchedFetch(input, init) {
		if (typeof input === "string" && input.startsWith("/api/")) {
			const base = getApiBaseUrl();
			if (base) input = `${base}${input}`;
		} else if (input instanceof Request && input.url) try {
			const u = new URL(input.url);
			if (u.pathname.startsWith("/api/")) {
				const base = getApiBaseUrl();
				if (base) {
					const newUrl = `${base}${u.pathname}${u.search}`;
					input = new Request(newUrl, input);
				}
			}
		} catch {}
		return originalFetch(input, init);
	};
	_fetchPatched = true;
}
//#endregion
//#region src/lib/supabase.ts
installFetchOverride();
var supabaseUrl = "https://kqfnhyaktxgulhitdvqq.supabase.co";
var supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZm5oeWFrdHhndWxoaXRkdnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NTIxMzQsImV4cCI6MjA4MzIyODEzNH0.pwtVfQJ2vmJCTLOYW8p8FH9M56qXBJL_rDCvfNWvvmA";
var dummy = new Proxy({}, {
	get: (_target, prop) => {
		if (prop === "then") return void 0;
		return dummy;
	},
	apply: () => dummy
});
var _client = null;
function getClient() {
	if (!_client) {
		const runningInTauri = isTauri();
		_client = createClient(supabaseUrl, supabaseAnonKey, { auth: {
			persistSession: runningInTauri,
			autoRefreshToken: runningInTauri,
			detectSessionInUrl: false
		} });
		if (typeof window !== "undefined") _client.auth.onAuthStateChange((event, session) => {
			if (event === "SIGNED_IN") {} else if (event === "SIGNED_OUT") {
				if (!runningInTauri) fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
			}
		});
	}
	return _client;
}
var supabase = getClient();
//#endregion
export { isTauri as n, supabase as t };
