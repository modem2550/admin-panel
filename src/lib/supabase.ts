import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Lazily validates env vars and returns a Supabase client.
 * Deferring validation to call-time (rather than module load) prevents
 * SvelteKit's build-time SSR analysis from crashing when .env is absent.
 */
function getClient(): SupabaseClient {
	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error(
			'Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.'
		);
	}
	return _client!;
}

// Only instantiate when env vars are present (i.e. at runtime, not build-time analysis)
let _client: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
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

// Client-side client (anon key, safe to expose)
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
	get(_target, prop) {
		return getClient()[prop as keyof SupabaseClient];
	}
});

// Server-side admin client (service role key — NEVER import in .svelte or client-side files)
// Only used in +server.ts / +page.server.ts files
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
let _adminClient: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey && supabaseServiceKey) {
	_adminClient = createClient(supabaseUrl, supabaseServiceKey, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
	get(_target, prop) {
		const client = _adminClient ?? _client;
		if (!client) {
			throw new Error(
				'Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.'
			);
		}
		return client[prop as keyof SupabaseClient];
	}
});
