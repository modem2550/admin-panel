// build/server/chunks/shared-server-BKxUl-5q.js
var private_env = {};

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

// build/server/chunks/session-cookies.server-DL0R7mYS.js
function sessionCookieNames(secure) {
  if (secure) return {
    access: "__Host-sb-access-token",
    refresh: "__Host-sb-refresh-token"
  };
  return {
    access: "sb-access-token",
    refresh: "sb-refresh-token"
  };
}
function sessionCookieOpts(secure) {
  return {
    path: "/",
    httpOnly: true,
    secure,
    sameSite: "lax"
  };
}
function clearSessionCookies(cookies, secure) {
  const n = sessionCookieNames(secure);
  cookies.delete(n.access, { path: "/" });
  cookies.delete(n.refresh, { path: "/" });
  if (secure) {
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });
  }
}

// build/server/chunks/index-DBqjc0Yf.js
var HttpError = class {
  /**
   * @param {number} status
   * @param {{message: string} extends App.Error ? (App.Error | string | undefined) : App.Error} body
   */
  constructor(status, body) {
    this.status = status;
    if (typeof body === "string") {
      this.body = { message: body };
    } else if (body) {
      this.body = body;
    } else {
      this.body = { message: `Error: ${status}` };
    }
  }
  toString() {
    return JSON.stringify(this.body);
  }
};

// build/server/chunks/index-Bd4EiwBH.js
var text_encoder = new TextEncoder();
function error(status, body) {
  if (isNaN(status) || status < 400 || status > 599) {
    throw new Error(`HTTP error status codes must be between 400 and 599 \u2014 ${status} is invalid`);
  }
  throw new HttpError(status, body);
}
function json(data, init) {
  const body = JSON.stringify(data);
  const headers = new Headers(init?.headers);
  if (!headers.has("content-length")) {
    headers.set("content-length", text_encoder.encode(body).byteLength.toString());
  }
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return new Response(body, {
    ...init,
    headers
  });
}

// build/server/chunks/_server.ts-B1km40uf.js
function assertBrowserMutation(request, url, allowedOrigins = []) {
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin && !allowedOrigins.includes(origin)) throw error(403, "Forbidden");
  if (request.headers.get("sec-fetch-site") === "cross-site") throw error(403, "Forbidden");
}
function securityAudit(event, fields = {}) {
  if (!(private_env.SECURITY_AUDIT_LOG === "1" || private_env.SECURITY_AUDIT_LOG === "true")) return;
  console.info(JSON.stringify({
    ts: (/* @__PURE__ */ new Date()).toISOString(),
    event,
    ...fields
  }));
}
var SESSION_POST_LIMIT = 40;
var SESSION_POST_WINDOW_MS = 6e4;
var MAX_BODY_CHARS = 24e3;
var ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:17348",
  "tauri://localhost",
  "https://tauri.localhost"
];
function guardMutation(request, url) {
  try {
    assertBrowserMutation(request, url, ALLOWED_ORIGINS);
  } catch (e) {
    securityAudit("auth.session.blocked", { path: url.pathname });
    throw e;
  }
}
var POST = async (event) => {
  const { request, cookies, url, getClientAddress } = event;
  guardMutation(request, url);
  let clientKey = "unknown";
  try {
    clientKey = getClientAddress() || request.headers.get("x-forwarded-for") || "127.0.0.1";
  } catch {
    clientKey = request.headers.get("x-forwarded-for") || "127.0.0.1";
  }
  if (isRateLimited(`session:post:${clientKey}`, SESSION_POST_LIMIT, SESSION_POST_WINDOW_MS)) {
    securityAudit("auth.session.rate_limited", {});
    console.warn(`[API/Session] Rate limited: ${clientKey}`);
    throw error(429, "Too many requests");
  }
  const secure = url.protocol === "https:";
  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) {
    console.warn(`[API/Session] Payload too large from ${clientKey}`);
    throw error(413, "Payload too large");
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    console.error(`[API/Session] Invalid JSON from ${clientKey}`);
    throw error(400, "Invalid JSON");
  }
  const { access_token, refresh_token } = body;
  if (!access_token || !refresh_token) {
    console.warn(`[API/Session] Missing tokens in request from ${clientKey}`);
    throw error(400, "Missing tokens");
  }
  const names = sessionCookieNames(secure);
  const o = sessionCookieOpts(secure);
  cookies.set(names.access, access_token, {
    ...o,
    maxAge: 3600 * 24 * 7
  });
  cookies.set(names.refresh, refresh_token, {
    ...o,
    maxAge: 3600 * 24 * 30
  });
  if (secure) {
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });
  }
  securityAudit("auth.session.created", {});
  return json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
};
var DELETE = async ({ request, cookies, url }) => {
  guardMutation(request, url);
  clearSessionCookies(cookies, url.protocol === "https:");
  securityAudit("auth.session.deleted", {});
  return json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
};
export {
  DELETE,
  POST
};
