//#region src/lib/bnk48.ts
var AUTH_URL = "https://user.bnk48.io/auth/email";
var INFO_URL = "https://public.bnk48.io/content/member-live/video/";
var TIMELINE_VIDEO_URL = "https://user.bnk48.io/timeline-video/";
var TIMELINE_INFO_URL = "https://public.bnk48.io/timeline/";
var BATCH_THANKYOU_URL = "https://public.bnk48.io/timeline/content-member-batch-thankyou/";
var M3U_URL = "https://user.bnk48.io/member-live/";
var MEMBER_URL = "https://public.bnk48.io/member/";
var PLAYBACK_URL_HEAD = "https://app.bnk48.com/member-playback/";
var API_V2_BASE = "https://api.bnk48.com/api/v2";
/** hostname → proxy prefix mapping (built once at module load) */
var HOST_PREFIX_MAP = {
	"img.bnk48cdn.net": "img",
	"public.bnk48.io": "pub",
	"user.bnk48.io": "usr",
	"app.bnk48.com": "app",
	"api.bnk48.com": "api"
};
var proxyCache = /* @__PURE__ */ new Map();
/**
* Proxies a URL through the project's own API to hide the original domain.
* Uses a stealthy path-based approach: /p/{prefix}/{path}
* Results are memoized — repeated calls with the same URL are O(1).
*/
function proxyUrl(url) {
	if (!url) return "";
	if (url.startsWith("/p/")) return url;
	if (!url.startsWith("http")) return url;
	const cached = proxyCache.get(url);
	if (cached !== void 0) return cached;
	let result = url;
	try {
		const parsed = new URL(url);
		const prefix = HOST_PREFIX_MAP[parsed.hostname];
		if (prefix) result = `/p/${prefix}/${parsed.pathname.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname}${parsed.search}`;
	} catch {}
	proxyCache.set(url, result);
	return result;
}
/**
* Reverses a proxied URL back to its original domain.
* Example: /p/usr/path -> https://user.bnk48.io/path
*/
function unproxyUrl(proxiedUrl) {
	if (!proxiedUrl) return "";
	if (!proxiedUrl.startsWith("/p/")) return proxiedUrl;
	const parts = proxiedUrl.slice(3).split("/");
	const prefix = parts[0];
	const pathWithSearch = parts.slice(1).join("/");
	const host = Object.keys(HOST_PREFIX_MAP).find((key) => HOST_PREFIX_MAP[key] === prefix);
	if (!host) return proxiedUrl;
	return `https://${host}/${pathWithSearch}`;
}
function getDefaultAssetUrl(type, id) {
	const idStr = String(id);
	if (type === "group") return `/api/image/product-group/${idStr}.jpg`;
	if (type === "theater") return "";
	return `/api/image/product/${idStr}/sku-1.jpg`;
}
function getCDNDiscoveryUrls(type, id) {
	+id;
	const idStr = String(id);
	if (type === "group") return [`https://img.bnk48cdn.net/shop/product-group/${idStr}.jpg`, `https://img.bnk48cdn.net/shop/product-group/${idStr}.png`];
	if (type === "theater") return [];
	return [];
}
//#endregion
export { M3U_URL as a, TIMELINE_INFO_URL as c, getDefaultAssetUrl as d, proxyUrl as f, INFO_URL as i, TIMELINE_VIDEO_URL as l, AUTH_URL as n, MEMBER_URL as o, unproxyUrl as p, BATCH_THANKYOU_URL as r, PLAYBACK_URL_HEAD as s, API_V2_BASE as t, getCDNDiscoveryUrls as u };
