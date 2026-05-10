import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

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
				// ✅ ไม่เก็บ session ใน localStorage (จัดการผ่าน HttpOnly cookie แทน)
				persistSession: false,
				autoRefreshToken: false,
				detectSessionInUrl: false,
			}
		});

		if (typeof window !== 'undefined') {
			_client.auth.onAuthStateChange((event, session) => {
				// ✅ ลบ console.log ที่เปิดเผย email และ session

				if (event === 'SIGNED_IN') {
					// NOTE: เราจัดการ sync session ในหน้า login หรือผ่าน flow อื่นโดยตรง
					// เพื่อหลีกเลี่ยงการเรียก API ซ้ำซ้อน (Double fetch)
				} else if (event === 'SIGNED_OUT') {
					// ✅ ให้ server ลบ cookie
					fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
				}
			});
		}
	}
	return _client;
}

// Client-side client (anon key เท่านั้น — ปลอดภัยที่จะ expose)
export const supabase: SupabaseClient = getClient();

// ⚠️  supabaseAdmin อยู่ใน supabase.server.ts เท่านั้น
// ห้าม import ไฟล์นี้ใน .svelte หรือไฟล์ client-side
