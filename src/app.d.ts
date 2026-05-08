// See https://svelte.dev/docs/kit/types#app.d.ts
import type { SupabaseClient, Session } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals { supabase: SupabaseClient; session: Session | null }

		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties
		}

		// interface PageData {}
		// interface Error {}
	}
}

export {};
