import { createClient } from "@supabase/supabase-js";
//#region src/lib/supabase.ts
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
		_client = createClient(supabaseUrl, supabaseAnonKey, { auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false
		} });
		if (typeof window !== "undefined") _client.auth.onAuthStateChange((event, session) => {
			if (event === "SIGNED_IN") {} else if (event === "SIGNED_OUT") fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
		});
	}
	return _client;
}
var supabase = getClient();
//#endregion
export { supabase as t };
