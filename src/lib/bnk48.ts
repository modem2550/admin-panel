export const AUTH_URL = 'https://user.bnk48.io/auth/email';
export const INFO_URL = 'https://public.bnk48.io/content/member-live/video/';
export const TIMELINE_VIDEO_URL = 'https://user.bnk48.io/timeline-video/';
export const TIMELINE_INFO_URL = 'https://public.bnk48.io/timeline/';
export const BATCH_THANKYOU_URL = 'https://public.bnk48.io/timeline/content-member-batch-thankyou/';
export const M3U_URL = 'https://user.bnk48.io/member-live/';
export const MEMBER_URL = 'https://public.bnk48.io/member/';
export const PLAYBACK_URL_HEAD = 'https://app.bnk48.com/member-playback/';
export const API_V2_BASE = 'https://api.bnk48.com/api/v2';
export const THEATER_ARCHIVE_URL = 'https://user.bnk48.io/user/';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface MemberLive {
    id: string;
    title: string;
    thumbnailImageUrl: string;
    publishedAt: string;
}

export interface VODResult {
    resourceUrl: string;
    fileName: string;
    thumbnail: string;
    info: Record<string, any>;
}

export interface TimelineResult {
    resourceUrl: string | null;
    images: string[];
    fileName: string;
    thumbnail: string;
    info: Record<string, any>;
}

export interface TheaterPlayback {
    id: string;
    title: string;
    thumbnailImageUrl: string;
    publishedAt: string;
    [key: string]: any;
}

export interface TheaterArchiveResult {
    items: TheaterPlayback[];
    total: number;
    skip: number;
    take: number;
}

// ── proxyUrl — with memoization ───────────────────────────────────────────────

/** hostname → proxy prefix mapping (built once at module load) */
const HOST_PREFIX_MAP: Record<string, string> = {
    'img.bnk48cdn.net': 'img',
    'public.bnk48.io': 'pub',
    'user.bnk48.io': 'usr',
    'app.bnk48.com': 'app',
    'api.bnk48.com': 'api',
};

const proxyCache = new Map<string, string>();

/**
 * Proxies a URL through the project's own API to hide the original domain.
 * Uses a stealthy path-based approach: /api/{prefix}/{path}
 * Results are memoized — repeated calls with the same URL are O(1).
 */
export function proxyUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('/api/')) return url;
    if (!url.startsWith('http')) return url;

    const cached = proxyCache.get(url);
    if (cached !== undefined) return cached;

    let result = url;
    try {
        const parsed = new URL(url);
        const prefix = HOST_PREFIX_MAP[parsed.hostname];
        if (prefix) {
            const path = parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname;
            result = `/api/${prefix}/${path}${parsed.search}`;
        }
    } catch {
        // ignore invalid URLs, return original
    }

    proxyCache.set(url, result);
    return result;
}

/**
 * Reverses a proxied URL back to its original domain.
 * Example: /api/usr/path -> https://user.bnk48.io/path
 */
export function unproxyUrl(proxiedUrl: string | null | undefined): string {
    if (!proxiedUrl) return '';
    if (!proxiedUrl.startsWith('/api/')) return proxiedUrl;

    const parts = proxiedUrl.slice(5).split('/');
    const prefix = parts[0];
    const pathWithSearch = parts.slice(1).join('/');

    // Reverse lookup for host
    const host = Object.keys(HOST_PREFIX_MAP).find(key => HOST_PREFIX_MAP[key] === prefix);
    if (!host) return proxiedUrl;

    return `https://${host}/${pathWithSearch}`;
}

export function getDefaultAssetUrl(type: 'product' | 'group', id: number | string): string {
    const idStr = String(id);
    if (type === 'group') return `/api/image/product-group/${idStr}.jpg`;
    return `/api/image/product/${idStr}/sku-1.jpg`;
}

// ── getCDNDiscoveryUrls ────────────────────────────────────────────────────────

export function getCDNDiscoveryUrls(type: 'product' | 'group', id: number | string): string[] {
    const idStr = String(id);

    if (type === 'group') {
        return [
            `https://img.bnk48cdn.net/shop/product-group/${idStr}.jpg`,
            `https://img.bnk48cdn.net/shop/product-group/${idStr}.png`,
        ];
    }

    const candidates: string[] = [];

    return candidates;
}

// ── Theater Playback Archive ───────────────────────────────────────────────────

export const DEFAULT_HEADERS = {
    'Accept': 'application/json',
    'BNK48-AppVersion': '1.55.1',
    'BNK48-Device-Id': 'devi/8BFC4876-FA5B-5EDC-A460-9F6F3610C5A2',
    'BNK48-App-Id': 'BNK48_101',
    'Accept-Language': 'en-TH;q=1.0, th-TH;q=0.9',
    'Content-Type': 'application/json',
    'BNK48-Device-Model': 'iPadPro12Inch3',
    'User-Agent': 'iAM48/1.55.1 (app.bnk48official; build:697; iOS 26.4.0) Alamofire/4.9.1',
    'Connection': 'keep-alive',
    'Environment': 'Production',
} as const;

/**
 * Fetch theater-playback archive for a user.
 * @param userId  - user ID (e.g. 878951)
 * @param token   - Bearer JWT token
 * @param skip    - pagination offset (default 0)
 * @param take    - page size (default 20)
 */
export async function fetchTheaterArchive(
    userId: number | string,
    token: string,
    skip = 0,
    take = 20,
): Promise<TheaterArchiveResult> {
    const url = `${THEATER_ARCHIVE_URL}${userId}/theater-playback/archive?skip=${skip}&take=${take}`;

    const res = await fetch(url, {
        method: 'GET',
        headers: {
            ...DEFAULT_HEADERS,
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        throw new Error(`Theater archive fetch failed: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<TheaterArchiveResult>;
}