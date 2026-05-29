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
var THEATER_ARCHIVE_URL = "https://user.bnk48.io/user/";
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
* Uses a stealthy path-based approach: /api/{prefix}/{path}
* Results are memoized — repeated calls with the same URL are O(1).
*/
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
	} catch {}
	proxyCache.set(url, result);
	return result;
}
/**
* Reverses a proxied URL back to its original domain.
* Example: /api/usr/path -> https://user.bnk48.io/path
*/
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
/**
* Fetch theater-playback archive for a user.
* @param userId  - user ID (e.g. 878951)
* @param token   - Bearer JWT token
* @param skip    - pagination offset (default 0)
* @param take    - page size (default 20)
*/
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
//#endregion
export { M3U_URL as a, TIMELINE_INFO_URL as c, getCDNDiscoveryUrls as d, getDefaultAssetUrl as f, INFO_URL as i, TIMELINE_VIDEO_URL as l, unproxyUrl as m, AUTH_URL as n, MEMBER_URL as o, proxyUrl as p, BATCH_THANKYOU_URL as r, PLAYBACK_URL_HEAD as s, API_V2_BASE as t, fetchTheaterArchive as u };
