import { createClient } from "@supabase/supabase-js";
//#region src/lib/supabase.ts
var supabaseUrl = "https://kqfnhyaktxgulhitdvqq.supabase.co";
var supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZm5oeWFrdHhndWxoaXRkdnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NTIxMzQsImV4cCI6MjA4MzIyODEzNH0.pwtVfQJ2vmJCTLOYW8p8FH9M56qXBJL_rDCvfNWvvmA";
/**
* Lazily validates env vars and returns a Supabase client.
* Deferring validation to call-time (rather than module load) prevents
* SvelteKit's build-time SSR analysis from crashing when .env is absent.
*/
function getClient() {
	return _client;
}
var _client = null;
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
var supabase = new Proxy({}, { get(_target, prop) {
	return getClient()[prop];
} });
var _adminClient = null;
var supabaseAdmin = new Proxy({}, { get(_target, prop) {
	const client = _adminClient ?? _client;
	if (!client) throw new Error("Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.");
	return client[prop];
} });
//#endregion
export { supabaseAdmin as n, supabase as t };
