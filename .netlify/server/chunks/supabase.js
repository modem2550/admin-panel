import { createClient } from "@supabase/supabase-js";
//#region src/lib/supabase.ts
var supabaseUrl = "https://kqfnhyaktxgulhitdvqq.supabase.co";
var supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZm5oeWFrdHhndWxoaXRkdnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NTIxMzQsImV4cCI6MjA4MzIyODEzNH0.pwtVfQJ2vmJCTLOYW8p8FH9M56qXBJL_rDCvfNWvvmA";
var dummy = new Proxy({}, {
	get: (target, prop) => {
		if (prop === "then") return void 0;
		return dummy;
	},
	apply: () => dummy
});
var _client = null;
/**
* Lazily validates env vars and returns a Supabase client.
* Returning a dummy client instead of throwing during build/analysis
* prevents SvelteKit's build-time SSR analysis from crashing.
*/
function getClient() {
	if (!_client) {
		_client = createClient(supabaseUrl, supabaseAnonKey);
		if (typeof window !== "undefined") _client.auth.onAuthStateChange((event, session) => {
			console.log(`[Supabase Auth] Event: ${event}`, {
				user: session?.user?.email,
				expires_at: session?.expires_at ? (/* @__PURE__ */ new Date(session.expires_at * 1e3)).toLocaleString() : null
			});
			if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
				if (session) document.cookie = `sb-session=${JSON.stringify(session)}; path=/; max-age=${3600 * 24 * 7}; SameSite=Lax;`;
			} else if (event === "SIGNED_OUT") document.cookie = "sb-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;";
		});
	}
	return _client;
}
function getAdminClient() {
	return getClient();
}
var supabase = new Proxy({}, { get(_target, prop) {
	return getClient()[prop];
} });
var supabaseAdmin = new Proxy({}, { get(_target, prop) {
	return getAdminClient()[prop];
} });
//#endregion
export { supabaseAdmin as n, supabase as t };
