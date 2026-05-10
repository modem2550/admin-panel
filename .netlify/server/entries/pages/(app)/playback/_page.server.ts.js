import { n as private_env } from "../../../../chunks/shared-server.js";
import { a as M3U_URL, c as TIMELINE_INFO_URL, d as proxyUrl, i as INFO_URL, l as TIMELINE_VIDEO_URL, n as AUTH_URL, o as MEMBER_URL, r as BATCH_THANKYOU_URL, s as PLAYBACK_URL_HEAD, t as API_V2_BASE } from "../../../../chunks/bnk48.js";
//#region src/lib/bnk48.server.ts
var cachedToken = null;
var tokenExpiresAt = 0;
var authPromise = null;
var TOKEN_BUFFER_MS = 300 * 1e3;
function isTokenExpired() {
	return Date.now() >= tokenExpiresAt - TOKEN_BUFFER_MS;
}
async function getToken() {
	if (cachedToken && !isTokenExpired()) return cachedToken;
	if (authPromise) return authPromise;
	authPromise = (async () => {
		try {
			if (!private_env.BNK48_EMAIL || !private_env.BNK48_PASSWORD) throw new Error("BNK48_EMAIL and BNK48_PASSWORD env vars are required");
			const response = await fetch(AUTH_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"BNK48-Device-Id": "null",
					"BNK48-AppCode": "null",
					"BNK48-Device-Model": "null"
				},
				body: JSON.stringify({
					email: private_env.BNK48_EMAIL,
					password: private_env.BNK48_PASSWORD
				})
			});
			if (!response.ok) throw new Error("BNK48 authentication failed");
			const result = await response.json();
			cachedToken = result.token;
			try {
				tokenExpiresAt = (JSON.parse(atob(result.token.split(".")[1])).exp ?? 0) * 1e3;
			} catch {
				tokenExpiresAt = Date.now() + 360 * 60 * 1e3;
			}
			return cachedToken;
		} catch (e) {
			cachedToken = null;
			tokenExpiresAt = 0;
			throw e;
		} finally {
			authPromise = null;
		}
	})();
	return authPromise;
}
async function httpGet(url) {
	const token = await getToken();
	const response = await fetch(url, { headers: {
		"BNK48-Device-Id": "null",
		"BNK48-AppCode": "null",
		"BNK48-Device-Model": "null",
		"Authorization": `Bearer ${token}`
	} });
	if (!response.ok) {
		if (response.status === 401) {
			cachedToken = null;
			tokenExpiresAt = 0;
		}
		throw new Error(`BNK48 API request failed: ${response.status}`);
	}
	return await response.json();
}
var memberIdCache = /* @__PURE__ */ new Map();
async function getMemberIdByName(name) {
	const searchName = name.toUpperCase();
	if (memberIdCache.has(searchName)) return memberIdCache.get(searchName);
	const maxId = 250;
	const batchSize = 25;
	for (let start = maxId; start >= 0; start -= batchSize) {
		const batch = [];
		for (let i = start; i > start - batchSize && i >= 0; i--) batch.push(httpGet(`${MEMBER_URL}${i}/profile`).then((res) => ({
			id: i,
			data: res
		})).catch(() => null));
		const results = await Promise.all(batch);
		for (const res of results) if (res?.data?.codeName) {
			const foundName = res.data.codeName.toUpperCase();
			memberIdCache.set(foundName, res.data.id);
			if (foundName === searchName) return res.data.id;
		}
	}
	return null;
}
async function getMemberLives(memberId, skip = 0, take = 20) {
	return httpGet(`${MEMBER_URL}${memberId}/member-lives?skip=${skip}&take=${take}`);
}
async function getVideoInfo(videoId) {
	return httpGet(`${INFO_URL}${videoId}`);
}
async function getVOD(videoId) {
	const id = videoId.replace(PLAYBACK_URL_HEAD, "");
	const [data, info] = await Promise.all([httpGet(`${M3U_URL}${id}`), getVideoInfo(id)]);
	return {
		resourceUrl: proxyUrl(data.resourceUrl),
		fileName: `${info.name} ${String(info.publishedAt).replace(/:/g, ".")}`,
		thumbnail: proxyUrl(info.thumbnailImageUrl),
		info
	};
}
function extractVideoUrl(obj) {
	if (typeof obj === "string") {
		if ((obj.includes(".m3u8") || obj.includes(".mp4")) && obj.startsWith("http")) return obj;
		return null;
	}
	if (obj && typeof obj === "object") {
		for (const field of [
			"resourceUrl",
			"videoUrl",
			"url",
			"fileUrl",
			"hlsUrl"
		]) if (typeof obj[field] === "string" && (obj[field].includes(".m3u8") || obj[field].includes(".mp4"))) return obj[field];
		for (const val of Object.values(obj)) {
			const found = extractVideoUrl(val);
			if (found) return found;
		}
	}
	return null;
}
async function getTimeline(postId) {
	const candidates = [
		`${TIMELINE_VIDEO_URL}${postId}`,
		`${BATCH_THANKYOU_URL}${postId}`,
		`https://public.bnk48.io/timeline/content-member-timeline/${postId}`,
		`${TIMELINE_INFO_URL}${postId}/info/v2`,
		`${TIMELINE_INFO_URL}${postId}`,
		`${API_V2_BASE}/timeline/content-member-timeline/${postId}`,
		`${API_V2_BASE}/timeline/${postId}`,
		`https://public.bnk48.io/content/member-timeline/${postId}`,
		`https://public.bnk48.io/content/${postId}`,
		`https://user.bnk48.io/timeline/${postId}`
	];
	const results = await Promise.all(candidates.map((url) => httpGet(url).then((data) => ({
		url,
		data
	})).catch(() => ({
		url,
		data: null
	}))));
	const merged = Object.assign({}, ...results.map((r) => r.data ?? {}));
	const resourceUrl = extractVideoUrl(merged);
	let images = [];
	if (Array.isArray(merged.images)) images = merged.images.map((img) => typeof img === "string" ? img : img.url ?? img.imageUrl ?? img.fileUrl ?? "");
	else if (Array.isArray(merged.contents)) images = merged.contents.filter((c) => c.type === "image" || c.imageUrl || c.fileUrl).map((c) => c.url ?? c.imageUrl ?? c.fileUrl ?? "");
	else if (Array.isArray(merged.mediaList)) images = merged.mediaList.filter((m) => m.type === "image" || !m.type).map((m) => m.url ?? m.imageUrl ?? "");
	else if (merged.imageUrl) images = [merged.imageUrl];
	else if (merged.imageFileUrl) images = [merged.imageFileUrl];
	if (images.length === 0) {
		const scanObj = (obj) => {
			if (!obj || typeof obj !== "object") return [];
			const found = [];
			for (const val of Object.values(obj)) if (typeof val === "string" && val.includes("bnk48cdn.net/content/")) found.push(val);
			else if (typeof val === "object") found.push(...scanObj(val));
			return found;
		};
		images = [...new Set(scanObj(merged))];
	}
	images = images.filter(Boolean);
	const thumbnail = proxyUrl(merged.thumbnailImageUrl ?? merged.thumbnail ?? images[0] ?? "");
	const name = merged.name ?? merged.title ?? merged.memberName ?? postId;
	const publishedAt = String(merged.publishedAt ?? "").replace(/:/g, ".");
	return {
		resourceUrl: proxyUrl(resourceUrl),
		images: images.map(proxyUrl),
		fileName: publishedAt ? `${name} ${publishedAt}` : name,
		thumbnail,
		info: merged
	};
}
//#endregion
//#region src/routes/(app)/playback/+page.server.ts
var load = async () => {
	return {};
};
var actions = {
	search: async ({ request }) => {
		const name = (await request.formData()).get("name")?.toString() || "";
		console.log(`[Playback Action] Search requested for: "${name}"`);
		if (!name) return { error: "Search term is required" };
		if (name.includes("timeline/content-member-timeline/") || name.includes("timeline/content-member-batch-thankyou/")) {
			let id = "";
			if (name.includes("timeline/content-member-timeline/")) id = name.split("timeline/content-member-timeline/")[1].split(/[\s?#]/)[0].trim();
			else id = name.split("timeline/content-member-batch-thankyou/")[1].split(/[\s?#]/)[0].trim();
			console.log(`[Playback Action] Detected Timeline Post ID: ${id}`);
			try {
				return { directTimeline: await getTimeline(id) };
			} catch (err) {
				console.error(`[Playback Action] Timeline Error: ${err.message}`);
				return { error: `Timeline post error: ${err.message}` };
			}
		}
		if (name.includes("member-playback/") || name.includes("timeline/content-member-live-playback/")) {
			let id = "";
			if (name.includes("member-playback/")) id = name.split("member-playback/")[1].split(/[\s?#]/)[0];
			else id = name.split("timeline/content-member-live-playback/")[1].split(/[\s?#]/)[0];
			id = id.trim();
			console.log(`[Playback Action] Detected Live Playback ID: ${id}. Fetching VOD...`);
			try {
				return { directVod: await getVOD(id) };
			} catch (err) {
				console.error(`[Playback Action] URL Error: ${err.message}`);
				return { error: `Invalid URL or video not found: ${err.message}` };
			}
		}
		try {
			const memberId = await getMemberIdByName(name);
			if (!memberId) {
				console.log(`[Playback Action] Member "${name}" NOT found.`);
				return { error: "Member not found" };
			}
			console.log(`[Playback Action] Found member "${name}" with ID: ${memberId}. Fetching lives...`);
			const lives = await getMemberLives(memberId, 0, 40);
			console.log(`[Playback Action] Successfully fetched ${lives.length} lives for "${name}".`);
			return {
				lives,
				memberName: name,
				memberId
			};
		} catch (err) {
			console.error(`[Playback Action] Search Error: ${err.message}`);
			return { error: err.message };
		}
	},
	getVOD: async ({ request }) => {
		const videoId = (await request.formData()).get("videoId")?.toString();
		console.log(`[Playback Action] VOD details requested for videoId: ${videoId}`);
		if (!videoId) return { error: "Video ID is required" };
		try {
			const vod = await getVOD(videoId);
			console.log(`[Playback Action] VOD found: ${vod.fileName}`);
			return { vod };
		} catch (err) {
			console.error(`[Playback Action] VOD Error: ${err.message}`);
			return { error: err.message };
		}
	}
};
//#endregion
export { actions, load };
