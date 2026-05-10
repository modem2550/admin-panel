import { createHash, timingSafeEqual } from 'node:crypto';

/** เปรียบเทียบ secret แบบคงที่เวลา (ลดการ leak ผ่าน timing — input ถูก hash เป็นความยาวคงที่) */
export function timingSafeSecretMatch(provided: string | null | undefined, expected: string | undefined): boolean {
	if (!provided || !expected) return false;
	try {
		const a = createHash('sha256').update(provided, 'utf8').digest();
		const b = createHash('sha256').update(expected, 'utf8').digest();
		return timingSafeEqual(a, b);
	} catch {
		return false;
	}
}
