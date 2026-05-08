import { createClient } from "@supabase/supabase-js";
var supabase = createClient("https://kqfnhyaktxgulhitdvqq.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZm5oeWFrdHhndWxoaXRkdnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NTIxMzQsImV4cCI6MjA4MzIyODEzNH0.pwtVfQJ2vmJCTLOYW8p8FH9M56qXBJL_rDCvfNWvvmA");
if (typeof window !== "undefined") supabase.auth.onAuthStateChange((event, session) => {
	console.log(`[Supabase Auth] Event: ${event}`, {
		user: session?.user?.email,
		expires_at: session?.expires_at ? (/* @__PURE__ */ new Date(session.expires_at * 1e3)).toLocaleString() : null
	});
	if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
		if (session) document.cookie = `sb-session=${JSON.stringify(session)}; path=/; max-age=${3600 * 24 * 7}; SameSite=Lax;`;
	} else if (event === "SIGNED_OUT") document.cookie = "sb-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;";
});
var supabaseAdmin = supabase;
//#endregion
export { supabaseAdmin as n, supabase as t };
