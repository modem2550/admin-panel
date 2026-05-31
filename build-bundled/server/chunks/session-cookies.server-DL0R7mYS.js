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
function readSessionTokens(cookies, secure) {
  const n = sessionCookieNames(secure);
  let access = cookies.get(n.access) ?? void 0;
  let refresh = cookies.get(n.refresh) ?? void 0;
  if (secure && (!access || !refresh)) {
    if (!access) access = cookies.get("sb-access-token") ?? void 0;
    if (!refresh) refresh = cookies.get("sb-refresh-token") ?? void 0;
  }
  return {
    access,
    refresh,
    names: n
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
export {
  sessionCookieOpts as a,
  clearSessionCookies as c,
  readSessionTokens as r,
  sessionCookieNames as s
};
