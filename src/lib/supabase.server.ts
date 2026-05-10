// ✅ ไฟล์นี้ใช้บน server เท่านั้น — ห้าม import ใน .svelte หรือ client code
// ชื่อไฟล์ลงท้าย .server.ts ทำให้ SvelteKit บล็อกไม่ให้ client bundle ดึงไป

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

const dummy: any = new Proxy({}, {
	get: (_target, prop) => {
		if (prop === 'then') return undefined;
		return dummy;
	},
	apply: () => dummy
});

let _adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
	const supabaseUrl = env.VITE_SUPABASE_URL;
	const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
	// Fallback: ถ้าไม่มี service role key ให้ใช้ anon key แทน (จำกัดสิทธิ์ตาม RLS)
	const anonKey = env.VITE_SUPABASE_ANON_KEY;
	const key = serviceKey || anonKey;

	if (!supabaseUrl || !key) {
		console.warn('[supabase.server] No Supabase URL or key available — using dummy client');
		return dummy as SupabaseClient;
	}
	if (!_adminClient) {
		if (!serviceKey) {
			console.warn('[supabase.server] SUPABASE_SERVICE_ROLE_KEY missing — falling back to anon key (RLS applies)');
		}
		_adminClient = createClient(supabaseUrl, key, {
			auth: { persistSession: false, autoRefreshToken: false }
		});
	}
	return _adminClient;
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
	get(_target, prop) {
		return (getAdminClient() as any)[prop];
	}
});
