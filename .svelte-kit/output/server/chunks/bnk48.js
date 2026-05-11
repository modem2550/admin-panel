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
var GE2023_MEMBERS = [
	"berry",
	"earn",
	"earth",
	"emmy",
	"eve",
	"fame",
	"grace",
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
	"monet",
	"myyu",
	"nene",
	"new",
	"nine",
	"paeyah",
	"palmmy",
	"pancake",
	"panda",
	"patt",
	"peak",
	"popper",
	"ratah",
	"satchan",
	"sindy",
	"stang",
	"wawa",
	"wee",
	"yayee",
	"yoghurt",
	"angel",
	"aom",
	"champoo",
	"emma",
	"fahsai",
	"fortune",
	"ginna",
	"izurina",
	"jingjing",
	"jjae",
	"kaiwan",
	"kaning",
	"kyla",
	"latin",
	"lookked",
	"marmink",
	"meen",
	"mei",
	"milk",
	"nana",
	"nena",
	"nenie",
	"papang",
	"pim",
	"ping",
	"punch",
	"sita"
];
function getDefaultAssetUrl(type, id) {
	const idNum = typeof id === "string" ? parseInt(id) : id;
	const idStr = id.toString();
	if (type !== "product") return `/p/img/shop/product-group/${idStr}.jpg`;
	if (idNum >= 1 && idNum <= 4) return `/p/img/shop/product/${idStr}/aroma-${idStr}.png`;
	if (idNum >= 5 && idNum <= 49) return `/p/img/shop/product/${idStr}/${CDN_MEMBERS[idNum - 5] || "berry"}.jpg`;
	if (idNum >= 50 && idNum <= 94) return `/p/img/shop/product/${idStr}/${CDN_MEMBERS[idNum - 50] || "berry"}.jpg`;
	if (idNum >= 95 && idNum <= 98) return `/p/img/shop/product/${idStr}/image-1.jpg`;
	if (idNum >= 99 && idNum <= 99) return `/p/img/shop/product/${idStr}/cherprang-1-1.png`;
	if (idNum >= 100 && idNum <= 103) return `/p/img/shop/product/${idStr}/cherprang-1.png`;
	if (idNum >= 107 && idNum <= 108) return `/p/img/shop/product/${idStr}/cgm48.png`;
	if (idNum >= 110 && idNum <= 130) return `/p/img/shop/product/${idStr}/CGM48-Debut-01.jpg`;
	if (idNum >= 131 && idNum <= 140) return `/p/img/shop/product/${idStr}/bnk48-1.png`;
	if (idNum >= 141 && idNum <= 150) return `/p/img/shop/product/${idStr}/cgm48-1.png`;
	if (idNum >= 151 && idNum <= 159) return `/p/img/shop/product/${idStr}/Janken-2023-01.png`;
	if (idNum >= 160 && idNum <= 164) return `/p/img/shop/product/${idStr}/CGM48-Sansei-Kawaii-01.png`;
	if (idNum >= 167 && idNum <= 232) return `/p/img/shop/product/${idStr}/tshirt-1.jpg`;
	if (idNum >= 235 && idNum <= 246) return `/p/img/shop/product/${idStr}/tshirt-1.jpg`;
	if (idNum >= 250 && idNum <= 279) return `/p/img/shop/product/${idStr}/${idStr}.jpg`;
	if (idNum >= 422 && idNum <= 750) return `/p/img/shop/product/${idStr}/sku-1.jpg`;
	if (idNum >= 806 && idNum <= 841) return `/p/img/shop/product/${idStr}/sku1.jpg`;
	if (idNum >= 850 && idNum <= 914) return `/p/img/shop/product/${idStr}/Round1.png`;
	if (idNum >= 751 && idNum <= 1e3) return `/p/img/shop/product/${idStr}/sku-1.jpg`;
	if (idNum >= 1089 && idNum <= 1152) return `/p/img/shop/product/${idStr}/${GE2023_MEMBERS[idNum - 1089] || "berry"}-poster-ge2023.jpg`;
	if (idNum >= 1182 && idNum <= 1184) return `/p/img/shop/product/${idStr}/sku-2.png`;
	return `/p/img/shop/product/${idStr}/sku-1.jpg`;
}
function getCDNDiscoveryUrls(type, id) {
	const idNum = typeof id === "string" ? parseInt(id) : id;
	const idStr = id.toString();
	if (type === "group") return [`https://img.bnk48cdn.net/shop/product-group/${idStr}.jpg`, `https://img.bnk48cdn.net/shop/product-group/${idStr}.png`];
	const candidates = [];
	const push = (path) => candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/${path}`);
	push("sku-1.jpg");
	push("sku-1.png");
	if (idNum >= 1 && idNum <= 4) push(`aroma-${idNum}.png`);
	else if (idNum >= 5 && idNum <= 49) {
		const member = CDN_MEMBERS[idNum - 5];
		if (member) {
			push(`${member}.jpg`);
			push(`${member}.png`);
		}
	} else if (idNum >= 50 && idNum <= 94) {
		const member = CDN_MEMBERS[idNum - 50];
		if (member) {
			push(`${member}.jpg`);
			push(`${member}.png`);
		}
	} else if (idNum >= 95 && idNum <= 98) for (let i = 1; i <= 3; i++) push(`image-${i}.jpg`);
	else if (idNum >= 99 && idNum <= 103) for (let i = 1; i <= 3; i++) push(`cherprang-1-${i}.png`);
	else if (idNum >= 107 && idNum <= 108) push("cgm48.png");
	else if (idNum >= 110 && idNum <= 130) for (let i = 1; i <= 4; i++) {
		push(`CGM48-Debut-${i}.jpg`);
		push(`CGM48-Debut-0${i}.jpg`);
	}
	else if (idNum >= 135 && idNum <= 150) {
		if (idNum <= 140) for (let i = 1; i <= 3; i++) push(`bnk48-${i}.png`);
		if (idNum >= 141) for (let i = 1; i <= 3; i++) push(`cgm48-${i}.png`);
	} else if (idNum >= 151 && idNum <= 159) for (let i = 1; i <= 3; i++) push(`Janken-2023-0${i}.png`);
	else if (idNum >= 160 && idNum <= 164) for (let i = 1; i <= 3; i++) {
		push(`CGM48-Sansei-Kawaii-${i}.png`);
		push(`CGM48-Sansei-Kawaii-0${i}.png`);
	}
	else if (idNum >= 167 && idNum <= 246) for (let i = 1; i <= 3; i++) push(`tshirt-${i}.jpg`);
	else if (idNum >= 250 && idNum <= 279) push(`${idStr}.jpg`);
	else if (idNum >= 422 && idNum <= 750) for (const day of ["SAT", "SUN"]) for (let i = 1; i <= 6; i++) {
		push(`${day}-Round${i}.png`);
		push(`${day}-Round${i}.jpg`);
	}
	else if (idNum >= 751 && idNum <= 805) {
		for (let i = 1; i <= 4; i++) {
			push(`sku-${i}.jpg`);
			push(`sku-${i}.png`);
		}
		for (const day of ["SAT", "SUN"]) for (let i = 1; i <= 6; i++) push(`${day}-Round${i}.png`);
	} else if (idNum >= 806 && idNum <= 841) for (let i = 1; i <= 3; i++) push(`sku${i}.jpg`);
	else if (idNum >= 842 && idNum <= 849) {
		for (let i = 1; i <= 4; i++) {
			push(`sku-${i}.jpg`);
			push(`sku${i}.jpg`);
		}
		for (let i = 1; i <= 6; i++) {
			push(`Round${i}.png`);
			push(`Round${i}.jpg`);
		}
	} else if (idNum >= 850 && idNum <= 914) for (let i = 1; i <= 6; i++) {
		push(`Round${i}.png`);
		push(`Round${i}.jpg`);
	}
	else if (idNum >= 915 && idNum <= 1e3) {
		for (let i = 1; i <= 4; i++) {
			push(`sku-${i}.jpg`);
			push(`sku-${i}.png`);
		}
		for (const day of ["SAT", "SUN"]) for (let i = 1; i <= 6; i++) push(`${day}-Round${i}.png`);
		for (let i = 1; i <= 6; i++) {
			push(`Round${i}.png`);
			push(`Round${i}.jpg`);
		}
	} else if (idNum >= 1089 && idNum <= 1152) push(`${GE2023_MEMBERS[idNum - 1089] || "berry"}-poster-ge2023.jpg`);
	else if (idNum >= 1182 && idNum <= 1184) for (let i = 2; i <= 6; i++) push(`sku-${i}.png`);
	else for (let i = 2; i <= 5; i++) {
		push(`sku-${i}.jpg`);
		push(`sku-${i}.png`);
	}
	return candidates;
}
//#endregion
export { M3U_URL as a, TIMELINE_INFO_URL as c, getDefaultAssetUrl as d, proxyUrl as f, INFO_URL as i, TIMELINE_VIDEO_URL as l, AUTH_URL as n, MEMBER_URL as o, BATCH_THANKYOU_URL as r, PLAYBACK_URL_HEAD as s, API_V2_BASE as t, getCDNDiscoveryUrls as u };
