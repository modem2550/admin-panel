import { env } from '$env/dynamic/private';

/** Structured audit — เปิดด้วย SECURITY_AUDIT_LOG=1 ใน Netlify / runtime */
export function securityAudit(event: string, fields: Record<string, unknown> = {}) {
	const on = env.SECURITY_AUDIT_LOG === '1' || env.SECURITY_AUDIT_LOG === 'true';
	if (!on) return;
	console.info(
		JSON.stringify({
			ts: new Date().toISOString(),
			event,
			...fields
		})
	);
}
