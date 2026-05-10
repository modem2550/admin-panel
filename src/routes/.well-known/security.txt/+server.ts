import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

/** RFC 9116 — ตั้ง SECURITY_CONTACT_EMAIL (และถ้ามี PUBLIC_SITE_URL) ใน env production */
export const GET: RequestHandler = async ({ url }) => {
	const contact = env.SECURITY_CONTACT_EMAIL?.trim();
	const base = env.PUBLIC_SITE_URL?.replace(/\/$/, '') ?? url.origin;

	const expires = new Date();
	expires.setFullYear(expires.getFullYear() + 1);

	const lines: string[] = [];
	if (contact) {
		lines.push(`Contact: mailto:${contact}`);
	} else {
		lines.push('# Configure SECURITY_CONTACT_EMAIL for your organization');
	}
	lines.push(`Canonical: ${base}/.well-known/security.txt`);
	lines.push(`Expires: ${expires.toISOString().replace(/\.\d{3}Z$/, 'Z')}`);
	lines.push('Preferred-Languages: en, th');

	const body = lines.join('\n') + '\n';

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
