/** CSP ชุดเดียวผ่าน HTTP header — ลดความเสี่ยงจาก meta tag ถูก bypass ในบางบริบท */

export function buildContentSecurityPolicy(isHttps: boolean): string {
	let supabaseHosts = 'https://*.supabase.co wss://*.supabase.co';
	try {
		const raw = import.meta.env.VITE_SUPABASE_URL as string | undefined;
		if (raw) {
			const u = new URL(raw);
			supabaseHosts = `https://${u.host} wss://${u.host}`;
		}
	} catch {
		/* fallback wildcard */
	}

	const parts = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline'",
		"style-src 'self' 'unsafe-inline'",
		"font-src 'self'",
		"img-src 'self' data: https: blob:",
		`connect-src 'self' ${supabaseHosts}`,
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"object-src 'none'"
	];

	if (isHttps) {
		parts.push('upgrade-insecure-requests');
	}

	return parts.join('; ');
}
