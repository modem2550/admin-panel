import { env } from '$env/dynamic/private';
import { 
    AUTH_URL, INFO_URL, M3U_URL, MEMBER_URL, TIMELINE_VIDEO_URL, 
    BATCH_THANKYOU_URL, TIMELINE_INFO_URL, API_V2_BASE, PLAYBACK_URL_HEAD,
    proxyUrl
} from './bnk48';
import type { MemberLive, VODResult, TimelineResult } from './bnk48';

// ── Token cache ────────────────────────────────────────────────────────────────
let cachedToken: string | null = null;
let authPromise: Promise<string> | null = null;

async function getToken(): Promise<string> {
    if (cachedToken) return cachedToken;
    if (authPromise) return authPromise;

    authPromise = (async () => {
        try {
            if (!env.BNK48_EMAIL || !env.BNK48_PASSWORD) {
                throw new Error('BNK48_EMAIL and BNK48_PASSWORD env vars are required');
            }
            console.log(`[BNK48 API] Authenticating as ${env.BNK48_EMAIL}...`);
            const authData = {
                "email": env.BNK48_EMAIL,
                "password": env.BNK48_PASSWORD
            };

            const response = await fetch(AUTH_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'BNK48-Device-Id': 'null',
                    'BNK48-AppCode': 'null',
                    'BNK48-Device-Model': 'null',
                },
                body: JSON.stringify(authData)
            });

            if (!response.ok) {
                console.error(`[BNK48 API] Auth failed: ${response.status} ${response.statusText}`);
                throw new Error(`Auth failed: ${response.statusText}`);
            }

            const result = await response.json();
            console.log(`[BNK48 API] Auth successful, token acquired.`);
            cachedToken = result.token;
            return cachedToken!;
        } finally {
            authPromise = null;
        }
    })();

    return authPromise;
}

async function httpGet<T>(url: string): Promise<T> {
    const token = await getToken();
    console.log(`[BNK48 API] GET ${url}`);
    const response = await fetch(url, {
        headers: {
            'BNK48-Device-Id': 'null',
            'BNK48-AppCode': 'null',
            'BNK48-Device-Model': 'null',
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        console.warn(`[BNK48 API] GET failed (${response.status}): ${url}`);
        throw new Error(`GET ${url} failed: ${response.statusText}`);
    }

    return await response.json();
}

// ── Member ID cache ────────────────────────────────────────────────────────────
const memberIdCache = new Map<string, number>();

export async function getMemberIdByName(name: string): Promise<number | null> {
    const searchName = name.toUpperCase();

    if (memberIdCache.has(searchName)) {
        return memberIdCache.get(searchName)!;
    }

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

/**
 * Robustly search for any video URL (m3u8 or mp4) in a complex JSON object
 */
function extractVideoUrl(obj: any): string | null {
    if (typeof obj === 'string') {
        if (obj.includes('.m3u8') || obj.includes('.mp4')) {
            // Check if it's a valid URL
            if (obj.startsWith('http')) return obj;
        }
        return null;
    }
    if (obj && typeof obj === 'object') {
        // First check common fields to be fast
        const commonFields = ['resourceUrl', 'videoUrl', 'url', 'fileUrl', 'hlsUrl'];
        for (const field of commonFields) {
            if (typeof obj[field] === 'string' && (obj[field].includes('.m3u8') || obj[field].includes('.mp4'))) {
                return obj[field];
            }
        }

        // Then recurse
        for (const val of Object.values(obj)) {
            const found = extractVideoUrl(val);
            if (found) return found;
        }
    }
    return null;
}

export async function getTimeline(postId: string): Promise<TimelineResult> {
    // ลอง endpoints ทั้งหมดพร้อมกัน
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

    // log ทุก endpoint ที่สำเร็จ
    for (const r of results) {
        if (r.data) {
            console.log(`[BNK48 API] ✅ ${r.url}:`, JSON.stringify(r.data, null, 2));
        } else {
            console.log(`[BNK48 API] ❌ ${r.url}: 404/failed`);
        }
    }

    const merged: Record<string, any> = Object.assign(
        {},
        ...results.map((r) => r.data ?? {})
    );

    // วิดีโอ — ใช้ extractor ที่แม่นยำกว่า
    const resourceUrl: string | null = extractVideoUrl(merged);

    // รูปภาพ — ลองทุก pattern ที่เป็นไปได้
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

    // fallback: scan ทุก string field ที่มี img.bnk48cdn.net/content/
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
        merged.thumbnailImageUrl ??
        merged.thumbnail ??
        images[0] ??
        ''
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
