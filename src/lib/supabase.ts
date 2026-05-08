import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

// Safe dummy client for build-time analysis when env vars are missing.
// Returns itself recursively for any property access or function call.
const dummy: any = new Proxy({}, {
	get: (target, prop) => {
		if (prop === 'then') return undefined; // Support async/await
		return dummy;
	},
	apply: () => dummy
});

let _client: SupabaseClient | null = null;
let _adminClient: SupabaseClient | null = null;

/**
 * Lazily validates env vars and returns a Supabase client.
 * Returning a dummy client instead of throwing during build/analysis
 * prevents SvelteKit's build-time SSR analysis from crashing.
 */
function getClient(): SupabaseClient {
	if (!supabaseUrl || !supabaseAnonKey) {
		return dummy as SupabaseClient;
	}
	if (!_client) {
		_client = createClient(supabaseUrl, supabaseAnonKey);

		// Debug: Global auth state listener (client-side only)
		if (typeof window !== 'undefined') {
			_client.auth.onAuthStateChange((event, session) => {
				console.log(`[Supabase Auth] Event: ${event}`, {
					user: session?.user?.email,
					expires_at: session?.expires_at
						? new Date(session.expires_at * 1000).toLocaleString()
						: null
				});

				// Sync session to cookie for server-side access
				if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
					if (session) {
						document.cookie = `sb-session=${JSON.stringify(session)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax;`;
					}
				} else if (event === 'SIGNED_OUT') {
					document.cookie = 'sb-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;';
				}
			});
		}
	}
	return _client;
}

function getAdminClient(): SupabaseClient {
	if (supabaseUrl && supabaseServiceKey) {
		if (!_adminClient) {
			_adminClient = createClient(supabaseUrl, supabaseServiceKey, {
				auth: { persistSession: false, autoRefreshToken: false }
			});
		}
		return _adminClient;
	}
	return getClient();
}

// Client-side client (anon key, safe to expose)
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
	get(_target, prop) {
		const client = getClient();
		return (client as any)[prop];
	}
});

// Server-side admin client (service role key — NEVER import in .svelte or client-side files)
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
	get(_target, prop) {
		const client = getAdminClient();
		return (client as any)[prop];
	}
});
