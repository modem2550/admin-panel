// See https://svelte.dev/docs/kit/types#app.d.ts
import type { SupabaseClient, Session } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			session: Session | null;
		}
		// interface PageData {}
		// interface Error {}
		// interface Platform {}
	}
}

export {};
