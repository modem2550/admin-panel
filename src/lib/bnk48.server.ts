import { env } from '$env/dynamic/private';
import {
	AUTH_URL, INFO_URL, M3U_URL, MEMBER_URL, TIMELINE_VIDEO_URL,
	BATCH_THANKYOU_URL, TIMELINE_INFO_URL, API_V2_BASE, PLAYBACK_URL_HEAD,
	proxyUrl
} from './bnk48';
import type { MemberLive, VODResult, TimelineResult } from './bnk48';

// ── Token cache ────────────────────────────────────────────────────────────────
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;          // ✅ เพิ่ม expiry tracking
let authPromise: Promise<string> | null = null;

const TOKEN_BUFFER_MS = 5 * 60 * 1000;  // refresh ก่อนหมด 5 นาที

function isTokenExpired(): boolean {
	return Date.now() >= tokenExpiresAt - TOKEN_BUFFER_MS;
}

export async function getToken(): Promise<string> {
	// ✅ ตรวจ expiry ด้วย ไม่ใช่แค่ null check
	if (cachedToken && !isTokenExpired()) return cachedToken;
	if (authPromise) return authPromise;

	authPromise = (async () => {
		try {
			if (!env.BNK48_EMAIL || !env.BNK48_PASSWORD) {
				throw new Error('BNK48_EMAIL and BNK48_PASSWORD env vars are required');
			}

			// ✅ ลบ console.log ที่แสดง email
			const response = await fetch(AUTH_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'BNK48-Device-Id': 'null',
					'BNK48-AppCode': 'null',
					'BNK48-Device-Model': 'null',
				},
				body: JSON.stringify({
					email: env.BNK48_EMAIL,
					password: env.BNK48_PASSWORD
				})
			});

			if (!response.ok) {
				// ✅ ไม่ log status detail ที่อาจมีข้อมูล credential
				throw new Error('BNK48 authentication failed');
			}

			const result = await response.json();
			cachedToken = result.token;

			// ✅ parse expiry จาก token (JWT) หรือ fallback 6 ชั่วโมง
			try {
				const payload = JSON.parse(atob(result.token.split('.')[1]));
				tokenExpiresAt = (payload.exp ?? 0) * 1000;
			} catch {
				tokenExpiresAt = Date.now() + 6 * 60 * 60 * 1000;
			}

			return cachedToken!;
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

/**
 * Extracts userId from the cached token payload.
 */
export async function getUserId(): Promise<string> {
	const token = await getToken();
	try {
		const payload = JSON.parse(atob(token.split('.')[1]));
		if (payload.id) return String(payload.id);
		if (payload.sub) return String(payload.sub);
		if (payload.userId) return String(payload.userId);
		throw new Error('User ID not found in token payload');
	} catch (e) {
		console.error('Failed to extract user ID:', e);
		throw e;
	}
}

import { fetchTheaterArchive as fetchArchive } from './bnk48';
import type { TheaterArchiveResult } from './bnk48';

/**
 * Server-side wrapper for theater archive fetching.
 */
export async function getTheaterArchive(skip = 0, take = 20): Promise<TheaterArchiveResult> {
	const token = await getToken();
	const userId = await getUserId();
	console.log(`[TheaterArchive] Fetching for userId: ${userId}`);
	const result = await fetchArchive(userId, token, skip, take);
	
	// Normalize result: some endpoints return array directly, others return { items: [] }
	if (Array.isArray(result)) {
		if (result.length > 0) {
			console.log(`[TheaterArchive] Item 0 keys:`, Object.keys(result[0]));
			console.log(`[TheaterArchive] Item 0 sample:`, JSON.stringify(result[0]).slice(0, 200));
		}
		return {
			items: result,
			total: result.length,
			skip: skip,
			take: take
		};
	}
	
	if (!result.items) {
		console.error(`[TheaterArchive] result.items is missing! Result keys:`, Object.keys(result));
		// Fallback if result is not an array and has no items
		return {
			items: [],
			total: 0,
			skip,
			take
		};
	}
	return result;
}

async function httpGet<T>(url: string): Promise<T> {
	const token = await getToken();
	// ✅ ลบ console.log URL ทุก request (มีเยอะมาก ทำให้ log รก + อาจ leak path)
	const response = await fetch(url, {
		headers: {
			'BNK48-Device-Id': 'null',
			'BNK48-AppCode': 'null',
			'BNK48-Device-Model': 'null',
			'Authorization': `Bearer ${token}`
		}
	});

	if (!response.ok) {
		// ✅ token หมดอายุ — clear cache เพื่อให้ refresh ครั้งต่อไป
		if (response.status === 401) {
			cachedToken = null;
			tokenExpiresAt = 0;
		}
		throw new Error(`BNK48 API request failed: ${response.status}`);
	}

	return await response.json();
}

// ── Member ID cache ────────────────────────────────────────────────────────────
const memberIdCache = new Map<string, number>();

export async function getMemberIdByName(name: string): Promise<number | null> {
	const searchName = name.toUpperCase();
	if (memberIdCache.has(searchName)) return memberIdCache.get(searchName)!;

	const maxId = 250;
	const batchSize = 25;

	for (let start = maxId; start >= 0; start -= batchSize) {
		const batch: Promise<{ id: number; data: any } | null>[] = [];

		for (let i = start; i > start - batchSize && i >= 0; i--) {
			batch.push(
				httpGet<any>(`${MEMBER_URL}${i}/profile`)
					.then((res) => ({ id: i, data: res }))
					.catch(() => null)
			);
		}

		const results = await Promise.all(batch);

		for (const res of results) {
			if (res?.data?.codeName) {
				const foundName: string = res.data.codeName.toUpperCase();
				memberIdCache.set(foundName, res.data.id);
				if (foundName === searchName) return res.data.id;
			}
		}
	}

	return null;
}

export async function getMemberLives(
	memberId: number,
	skip = 0,
	take = 20
): Promise<MemberLive[]> {
	return httpGet<MemberLive[]>(
		`${MEMBER_URL}${memberId}/member-lives?skip=${skip}&take=${take}`
	);
}

export async function getVideoInfo(videoId: string): Promise<any> {
	return httpGet<any>(`${INFO_URL}${videoId}`);
}

export async function getVOD(videoId: string): Promise<VODResult> {
	const id = videoId.replace(PLAYBACK_URL_HEAD, '');
	const [data, info] = await Promise.all([
		httpGet<any>(`${M3U_URL}${id}`),
		getVideoInfo(id),
	]);

	return {
		resourceUrl: proxyUrl(data.resourceUrl),
		fileName: `${info.name} ${String(info.publishedAt).replace(/:/g, '.')}`,
		thumbnail: proxyUrl(info.thumbnailImageUrl),
		info,
	};
}

function extractVideoUrl(obj: any): string | null {
	if (typeof obj === 'string') {
		if ((obj.includes('.m3u8') || obj.includes('.mp4')) && obj.startsWith('http')) {
			return obj;
		}
		return null;
	}
	if (obj && typeof obj === 'object') {
		const commonFields = ['resourceUrl', 'videoUrl', 'url', 'fileUrl', 'hlsUrl'];
		for (const field of commonFields) {
			if (typeof obj[field] === 'string' &&
				(obj[field].includes('.m3u8') || obj[field].includes('.mp4'))) {
				return obj[field];
			}
		}
		for (const val of Object.values(obj)) {
			const found = extractVideoUrl(val);
			if (found) return found;
		}
	}
	return null;
}

export async function getTimeline(postId: string): Promise<TimelineResult> {
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
		`https://user.bnk48.io/timeline/${postId}`,
	];

	const results = await Promise.all(
		candidates.map((url) =>
			httpGet<any>(url)
				.then((data) => ({ url, data }))
				.catch(() => ({ url, data: null }))
		)
	);

	// ✅ ลบ console.log ข้อมูล JSON ทั้งหมด (มี sensitive content)

	const merged: Record<string, any> = Object.assign(
		{},
		...results.map((r) => r.data ?? {})
	);

	const resourceUrl: string | null = extractVideoUrl(merged);

	let images: string[] = [];
	if (Array.isArray(merged.images)) {
		images = merged.images.map((img: any) =>
			typeof img === 'string' ? img : img.url ?? img.imageUrl ?? img.fileUrl ?? ''
		);
	} else if (Array.isArray(merged.contents)) {
		images = merged.contents
			.filter((c: any) => c.type === 'image' || c.imageUrl || c.fileUrl)
			.map((c: any) => c.url ?? c.imageUrl ?? c.fileUrl ?? '');
	} else if (Array.isArray(merged.mediaList)) {
		images = merged.mediaList
			.filter((m: any) => m.type === 'image' || !m.type)
			.map((m: any) => m.url ?? m.imageUrl ?? '');
	} else if (merged.imageUrl) {
		images = [merged.imageUrl];
	} else if (merged.imageFileUrl) {
		images = [merged.imageFileUrl];
	}

	if (images.length === 0) {
		const scanObj = (obj: any): string[] => {
			if (!obj || typeof obj !== 'object') return [];
			const found: string[] = [];
			for (const val of Object.values(obj)) {
				if (typeof val === 'string' && val.includes('bnk48cdn.net/content/')) {
					found.push(val);
				} else if (typeof val === 'object') {
					found.push(...scanObj(val));
				}
			}
			return found;
		};
		images = [...new Set(scanObj(merged))];
	}

	images = images.filter(Boolean);

	const thumbnail = proxyUrl(
		merged.thumbnailImageUrl ?? merged.thumbnail ?? images[0] ?? ''
	);

	const name = merged.name ?? merged.title ?? merged.memberName ?? postId;
	const publishedAt = String(merged.publishedAt ?? '').replace(/:/g, '.');

	return {
		resourceUrl: proxyUrl(resourceUrl),
		images: images.map(proxyUrl),
		fileName: publishedAt ? `${name} ${publishedAt}` : name,
		thumbnail,
		info: merged,
	};
}
