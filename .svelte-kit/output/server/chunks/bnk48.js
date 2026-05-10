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
var CDN_MEMBERS = [
	"berry",
	"cherprang",
	"earn",
	"earth",
	"emmy",
	"eve",
	"fame",
	"fond",
	"grace",
	"gygee",
	"hoop",
	"janry",
	"jaokhem",
	"kaofrang",
	"khamin",
	"l",
	"marine",
	"mean",
	"micha",
	"minmin",
	"miori",
	"monet",
	"myyu",
	"nene",
	"new",
	"niky",
	"nine",
	"paeyah",
	"pakwan",
	"palmmy",
	"pampam",
	"pancake",
	"panda",
	"patt",
	"peak",
	"phukkhom",
	"popper",
	"ratah",
	"satchan",
	"sindy",
	"stang",
	"wawa",
	"wee",
	"yayee",
	"yoghurt"
];
/**
* Generates candidate URLs for BNK48 CDN assets for discovery and scanning.
*/
function getCDNDiscoveryUrls(type, id) {
	const idStr = id.toString();
	if (type === "group") return [`https://img.bnk48cdn.net/shop/product-group/${idStr}.jpg`, `https://img.bnk48cdn.net/shop/product-group/${idStr}.png`];
	const candidates = [];
	for (const m of CDN_MEMBERS) {
		candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/${m}.jpg`);
		candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/${m}.png`);
	}
	for (const pref of [
		{
			p: "sku-",
			max: 10,
			exts: [".jpg", ".png"]
		},
		{
			p: "aroma-",
			max: 5,
			exts: [".png", ".jpg"]
		},
		{
			p: "image-",
			max: 5,
			exts: [".jpg", ".png"]
		},
		{
			p: "bnk48-",
			max: 5,
			exts: [".png", ".jpg"]
		},
		{
			p: "cgm48-",
			max: 5,
			exts: [".png", ".jpg"]
		},
		{
			p: "tshirt-",
			max: 5,
			exts: [".jpg", ".png"]
		}
	]) for (let i = 1; i <= pref.max; i++) for (const ext of pref.exts) candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/${pref.p}${i}${ext}`);
	for (const pref of [
		{
			p: "CGM48-Debut-",
			max: 5,
			exts: [".jpg", ".png"]
		},
		{
			p: "Janken-2023-",
			max: 5,
			exts: [".png", ".jpg"]
		},
		{
			p: "CGM48-Sansei-Kawaii-",
			max: 5,
			exts: [".png", ".jpg"]
		}
	]) for (let i = 1; i <= pref.max; i++) {
		const num = i.toString().padStart(2, "0");
		for (const ext of pref.exts) candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/${pref.p}${num}${ext}`);
	}
	for (const p of [
		"SUN-Round",
		"SAT-Round",
		"Round"
	]) for (let i = 1; i <= 10; i++) {
		candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/${p}${i}.jpg`);
		candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/${p}${i}.png`);
	}
	candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/cgm48.png`);
	for (let i = 1; i <= 6; i++) candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/cherprang-1-${i}.png`);
	candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/${idStr}.jpg`);
	candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/${idStr}.png`);
	return candidates;
}
//#endregion
export { M3U_URL as a, TIMELINE_INFO_URL as c, proxyUrl as d, INFO_URL as i, TIMELINE_VIDEO_URL as l, AUTH_URL as n, MEMBER_URL as o, BATCH_THANKYOU_URL as r, PLAYBACK_URL_HEAD as s, API_V2_BASE as t, getCDNDiscoveryUrls as u };
