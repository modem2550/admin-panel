import { error } from '@sveltejs/kit';

/**
 * ป้องกัน mutation จาก origin อื่น + cross-site fetch จากเว็บภายนอก
 * (ร่วมกับ SameSite=Lax) — ไม่บล็อก request ที่ไม่มี Sec-Fetch-* เช่น cron / เครื่องมือ CLI
 */
export function assertBrowserMutation(request: Request, url: URL): void {
	const origin = request.headers.get('origin');
	if (origin && origin !== url.origin) {
		throw error(403, 'Forbidden');
	}
	const site = request.headers.get('sec-fetch-site');
	if (site === 'cross-site') {
		throw error(403, 'Forbidden');
	}
}
