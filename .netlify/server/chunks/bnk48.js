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
/**
* Proxies a URL through the project's own API to hide the original domain.
* Uses a stealthy path-based approach: /p/{prefix}/{path}
*/
function proxyUrl(url) {
	if (!url) return "";
	if (url.startsWith("/p/")) return url;
	if (!url.startsWith("http")) return url;
	try {
		const parsed = new URL(url);
		let prefix = "";
		if (parsed.hostname === "img.bnk48cdn.net") prefix = "img";
		else if (parsed.hostname === "public.bnk48.io") prefix = "pub";
		else if (parsed.hostname === "user.bnk48.io") prefix = "usr";
		else if (parsed.hostname === "app.bnk48.com") prefix = "app";
		else if (parsed.hostname === "api.bnk48.com") prefix = "api";
		if (prefix) {
			const path = parsed.pathname.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname;
			const search = parsed.search;
			return `/p/${prefix}/${path}${search}`;
		}
	} catch (e) {}
	return url;
}
//#endregion
export { M3U_URL as a, TIMELINE_INFO_URL as c, INFO_URL as i, TIMELINE_VIDEO_URL as l, AUTH_URL as n, MEMBER_URL as o, BATCH_THANKYOU_URL as r, PLAYBACK_URL_HEAD as s, API_V2_BASE as t, proxyUrl as u };
