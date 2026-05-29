import { dev } from '$app/environment';

/** แจ้งเตือนตอน boot เมื่อขาดค่าที่จำเป็นใน production */
export function validatePublicEnvOnce(): void {
	if (dev) return;
	const missing: string[] = [];
	if (!import.meta.env.VITE_SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
	if (!import.meta.env.VITE_SUPABASE_ANON_KEY) missing.push('VITE_SUPABASE_ANON_KEY');
	if (missing.length) {
		const msg = `[security] Missing env for production: ${missing.join(', ')}`;
		console.error(msg);
		if (process.env.TAURI_DESKTOP === '1') {
			throw new Error(msg);
		}
	}
}
