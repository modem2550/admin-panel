import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
	console.error(
		'[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — add them to .env and restart the dev server.'
	);
}

// Safe dummy client สำหรับ build-time เมื่อไม่มี env vars
const dummy: any = new Proxy({}, {
	get: (_target, prop) => {
		if (prop === 'then') return undefined;
		return dummy;
	},
	apply: () => dummy
});

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
	if (!supabaseUrl || !supabaseAnonKey) {
		return dummy as SupabaseClient;
	}
	if (!_client) {
		_client = createClient(supabaseUrl, supabaseAnonKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false,
				detectSessionInUrl: false
			}
		});

	}
	return _client;
}

// Client-side client (anon key เท่านั้น — ปลอดภัยที่จะ expose)
export const supabase: SupabaseClient = getClient();

// ⚠️  supabaseAdmin อยู่ใน supabase.server.ts เท่านั้น
// ห้าม import ไฟล์นี้ใน .svelte หรือไฟล์ client-side
