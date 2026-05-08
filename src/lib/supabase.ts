import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error(
		'Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.'
	);
}

// Client-side client (anon key, safe to expose)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Debug: Global auth state listener
if (typeof window !== 'undefined') {
	supabase.auth.onAuthStateChange((event, session) => {
		console.log(`[Supabase Auth] Event: ${event}`, {
			user: session?.user?.email,
			expires_at: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : null
		});

		// Sync session to cookie for server-side access
		if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
			if (session) {
				// Set cookie (valid for the duration of the session)
				document.cookie = `sb-session=${JSON.stringify(session)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax;`;
			}
		} else if (event === 'SIGNED_OUT') {
			// Clear cookie
			document.cookie = 'sb-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;';
		}
	});
}

// Server-side admin client (service role key — NEVER import in .svelte or client-side files)
// Only used in +server.ts / +page.server.ts files
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
export const supabaseAdmin = supabaseServiceKey
	? createClient(supabaseUrl, supabaseServiceKey, {
			auth: { persistSession: false, autoRefreshToken: false }
	  })
	: supabase; // Fallback to anon in dev if key not set
