// build/server/chunks/bnk48-BaJ4cKI_.js
var AUTH_URL = "https://user.bnk48.io/auth/email";
var INFO_URL = "https://public.bnk48.io/content/member-live/video/";
var TIMELINE_VIDEO_URL = "https://user.bnk48.io/timeline-video/";
var TIMELINE_INFO_URL = "https://public.bnk48.io/timeline/";
var BATCH_THANKYOU_URL = "https://public.bnk48.io/timeline/content-member-batch-thankyou/";
var M3U_URL = "https://user.bnk48.io/member-live/";
var MEMBER_URL = "https://public.bnk48.io/member/";
var PLAYBACK_URL_HEAD = "https://app.bnk48.com/member-playback/";
var API_V2_BASE = "https://api.bnk48.com/api/v2";
var THEATER_ARCHIVE_URL = "https://user.bnk48.io/user/";
var HOST_PREFIX_MAP = {
  "img.bnk48cdn.net": "img",
  "public.bnk48.io": "pub",
  "user.bnk48.io": "usr",
  "app.bnk48.com": "app",
  "api.bnk48.com": "api"
};
var proxyCache = /* @__PURE__ */ new Map();
function proxyUrl(url) {
  if (!url) return "";
  if (url.startsWith("/api/")) return url;
  if (!url.startsWith("http")) return url;
  const cached = proxyCache.get(url);
  if (cached !== void 0) return cached;
  let result = url;
  try {
    const parsed = new URL(url);
    if (!(parsed.hostname === "media.bnk48cdn.net" || parsed.hostname.startsWith("media") && parsed.hostname.endsWith(".bnk48cdn.net"))) {
      const prefix = HOST_PREFIX_MAP[parsed.hostname];
      if (prefix) result = `/api/${prefix}/${parsed.pathname.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname}${parsed.search}`;
    }
  } catch {
  }
  proxyCache.set(url, result);
  return result;
}
function unproxyUrl(proxiedUrl) {
  if (!proxiedUrl) return "";
  if (!proxiedUrl.startsWith("/api/")) return proxiedUrl;
  const parts = proxiedUrl.slice(5).split("/");
  const prefix = parts[0];
  const pathWithSearch = parts.slice(1).join("/");
  const host = Object.keys(HOST_PREFIX_MAP).find((key) => HOST_PREFIX_MAP[key] === prefix);
  if (!host) return proxiedUrl;
  return `https://${host}/${pathWithSearch}`;
}
function getDefaultAssetUrl(type, id) {
  const idStr = String(id);
  if (type === "group") return `/api/image/product-group/${idStr}.jpg`;
  return `/api/image/product/${idStr}/sku-1.jpg`;
}
function getCDNDiscoveryUrls(type, id) {
  const idStr = String(id);
  if (type === "group") return [`https://img.bnk48cdn.net/shop/product-group/${idStr}.jpg`, `https://img.bnk48cdn.net/shop/product-group/${idStr}.png`];
  const candidates = [];
  for (let sku = 1; sku <= 8; sku++) candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/sku-${sku}.jpg`, `https://img.bnk48cdn.net/shop/product/${idStr}/sku-${sku}.png`, `https://img.bnk48cdn.net/shop/product/${idStr}/sku${sku}.jpg`, `https://img.bnk48cdn.net/shop/product/${idStr}/sku${sku}.png`);
  const idNum = parseInt(idStr, 10);
  if (!isNaN(idNum)) {
    if (idNum >= 422 && idNum <= 750) for (let r = 1; r <= 6; r++) candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/SAT-Round${r}.png`, `https://img.bnk48cdn.net/shop/product/${idStr}/SAT-Round${r}.jpg`, `https://img.bnk48cdn.net/shop/product/${idStr}/SUN-Round${r}.png`, `https://img.bnk48cdn.net/shop/product/${idStr}/SUN-Round${r}.jpg`);
    if (idNum >= 850 && idNum <= 914) for (let r = 1; r <= 6; r++) candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/Round${r}.png`, `https://img.bnk48cdn.net/shop/product/${idStr}/Round${r}.jpg`);
  }
  return candidates;
}
var DEFAULT_HEADERS = {
  "Accept": "application/json",
  "BNK48-AppVersion": "1.55.1",
  "BNK48-Device-Id": "devi/8BFC4876-FA5B-5EDC-A460-9F6F3610C5A2",
  "BNK48-App-Id": "BNK48_101",
  "Accept-Language": "en-TH;q=1.0, th-TH;q=0.9",
  "Content-Type": "application/json",
  "BNK48-Device-Model": "iPadPro12Inch3",
  "User-Agent": "iAM48/1.55.1 (app.bnk48official; build:697; iOS 26.4.0) Alamofire/4.9.1",
  "Connection": "keep-alive",
  "Environment": "Production"
};
async function fetchTheaterArchive(userId, token, skip = 0, take = 20) {
  const url = `${THEATER_ARCHIVE_URL}${userId}/theater-playback/archive?skip=${skip}&take=${take}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...DEFAULT_HEADERS,
      "Authorization": `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error(`Theater archive fetch failed: ${res.status} ${res.statusText}`);
  return res.json();
}
export {
  API_V2_BASE as A,
  BATCH_THANKYOU_URL as B,
  INFO_URL as I,
  M3U_URL as M,
  PLAYBACK_URL_HEAD as P,
  TIMELINE_INFO_URL as T,
  AUTH_URL as a,
  MEMBER_URL as b,
  TIMELINE_VIDEO_URL as c,
  getDefaultAssetUrl as d,
  fetchTheaterArchive as f,
  getCDNDiscoveryUrls as g,
  proxyUrl as p,
  unproxyUrl as u
};
