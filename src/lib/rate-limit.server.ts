/** Simple sliding-window rate limiter for server routes (per-process memory). */

type Bucket = number[];

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

function pruneBuckets() {
	if (buckets.size <= MAX_KEYS) return;
	const cutoff = Math.floor(buckets.size / 2);
	let i = 0;
	for (const key of buckets.keys()) {
		buckets.delete(key);
		if (++i >= cutoff) break;
	}
}

/** Returns true if this request should be rejected (limit exceeded). */
export function isRateLimited(key: string, max: number, windowMs: number): boolean {
	const now = Date.now();
	let stamps = buckets.get(key);
	if (!stamps) {
		if (buckets.size >= MAX_KEYS) pruneBuckets();
		stamps = [];
		buckets.set(key, stamps);
	}
	const windowStart = now - windowMs;
	while (stamps.length && stamps[0]! < windowStart) stamps.shift();
	stamps.push(now);
	return stamps.length > max;
}
