import type { Cookies } from '@sveltejs/kit';

/** บน HTTPS ใช้ prefix __Host- (ไม่มี Domain, Path=/, Secure) — ลดความเสี่ยงจาก subdomain takeover */
export function sessionCookieNames(secure: boolean) {
	if (secure) {
		return {
			access: '__Host-sb-access-token',
			refresh: '__Host-sb-refresh-token'
		} as const;
	}
	return {
		access: 'sb-access-token',
		refresh: 'sb-refresh-token'
	} as const;
}

/** อ่าน token — บน HTTPS รองรับ cookie ชุดเก่าระหว่าง migrate */
export function readSessionTokens(cookies: Cookies, secure: boolean) {
	const n = sessionCookieNames(secure);
	let access = cookies.get(n.access) ?? undefined;
	let refresh = cookies.get(n.refresh) ?? undefined;
	if (secure && (!access || !refresh)) {
		if (!access) access = cookies.get('sb-access-token') ?? undefined;
		if (!refresh) refresh = cookies.get('sb-refresh-token') ?? undefined;
	}
	return { access, refresh, names: n };
}

export function sessionCookieOpts(secure: boolean) {
	return {
		path: '/' as const,
		httpOnly: true as const,
		secure,
		sameSite: 'lax' as const
	};
}

/** ลบทั้งชุดใหม่และชุดเก่า (HTTPS) */
export function clearSessionCookies(cookies: Cookies, secure: boolean) {
	const n = sessionCookieNames(secure);
	cookies.delete(n.access, { path: '/' });
	cookies.delete(n.refresh, { path: '/' });
	if (secure) {
		cookies.delete('sb-access-token', { path: '/' });
		cookies.delete('sb-refresh-token', { path: '/' });
	}
}
