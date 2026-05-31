// build/server/chunks/rate-limit.server-Btm_w4TP.js
var buckets = /* @__PURE__ */ new Map();
var MAX_KEYS = 5e3;
function pruneBuckets() {
  if (buckets.size <= MAX_KEYS) return;
  const cutoff = Math.floor(buckets.size / 2);
  let i = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    if (++i >= cutoff) break;
  }
}
function isRateLimited(key, max, windowMs) {
  const now = Date.now();
  let stamps = buckets.get(key);
  if (!stamps) {
    if (buckets.size >= MAX_KEYS) pruneBuckets();
    stamps = [];
    buckets.set(key, stamps);
  }
  const windowStart = now - windowMs;
  while (stamps.length && stamps[0] < windowStart) stamps.shift();
  stamps.push(now);
  return stamps.length > max;
}
export {
  isRateLimited as i
};
