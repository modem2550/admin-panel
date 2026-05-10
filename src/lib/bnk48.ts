export const AUTH_URL = 'https://user.bnk48.io/auth/email';
export const INFO_URL = 'https://public.bnk48.io/content/member-live/video/';
export const TIMELINE_VIDEO_URL = 'https://user.bnk48.io/timeline-video/';
export const TIMELINE_INFO_URL = 'https://public.bnk48.io/timeline/';
export const BATCH_THANKYOU_URL = 'https://public.bnk48.io/timeline/content-member-batch-thankyou/';
export const M3U_URL = 'https://user.bnk48.io/member-live/';
export const MEMBER_URL = 'https://public.bnk48.io/member/';
export const PLAYBACK_URL_HEAD = 'https://app.bnk48.com/member-playback/';
export const API_V2_BASE = 'https://api.bnk48.com/api/v2';

/**
 * Proxies a URL through the project's own API to hide the original domain.
 * Uses a stealthy path-based approach: /p/{prefix}/{path}
 */
export function proxyUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('/p/')) return url;
    if (!url.startsWith('http')) return url;

    try {
        const parsed = new URL(url);
        let prefix = '';
        if (parsed.hostname === 'img.bnk48cdn.net') prefix = 'img';
        else if (parsed.hostname === 'public.bnk48.io') prefix = 'pub';
        else if (parsed.hostname === 'user.bnk48.io') prefix = 'usr';
        else if (parsed.hostname === 'app.bnk48.com') prefix = 'app';
        else if (parsed.hostname === 'api.bnk48.com') prefix = 'api';

        if (prefix) {
            const path = parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname;
            const search = parsed.search;
            return `/p/${prefix}/${path}${search}`;
        }
    } catch (e) {
        // Fallback or ignore invalid URLs
    }

    return url; // Return original if not in mapping, though user wants everything masked
}

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

export const CDN_MEMBERS = [
    "berry", "cherprang", "earn", "earth", "emmy", "eve", "fame", "fond", "grace",
    "gygee", "hoop", "janry", "jaokhem", "kaofrang", "khamin", "l", "marine", "mean",
    "micha", "minmin", "miori", "monet", "myyu", "nene", "new", "niky", "nine",
    "paeyah", "pakwan", "palmmy", "pampam", "pancake", "panda", "patt", "peak",
    "phukkhom", "popper", "ratah", "satchan", "sindy", "stang", "wawa", "wee",
    "yayee", "yoghurt"
];

/**
 * Generates candidate URLs for BNK48 CDN assets for discovery and scanning.
 */
export function getCDNDiscoveryUrls(type: 'product' | 'group', id: number | string): string[] {
    const idStr = id.toString();
    if (type === 'group') {
        return [
            `https://img.bnk48cdn.net/shop/product-group/${idStr}.jpg`,
            `https://img.bnk48cdn.net/shop/product-group/${idStr}.png`
        ];
    }

    const candidates: string[] = [];

    // Member names (jpg/png)
    for (const m of CDN_MEMBERS) {
        candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/${m}.jpg`);
        candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/${m}.png`);
    }

    // Standard prefixes with numbers
    const standardPrefixes = [
        { p: 'sku-', max: 10, exts: ['.jpg', '.png'] },
        { p: 'aroma-', max: 5, exts: ['.png', '.jpg'] },
        { p: 'image-', max: 5, exts: ['.jpg', '.png'] },
        { p: 'bnk48-', max: 5, exts: ['.png', '.jpg'] },
        { p: 'cgm48-', max: 5, exts: ['.png', '.jpg'] },
        { p: 'tshirt-', max: 5, exts: ['.jpg', '.png'] },
    ];

    for (const pref of standardPrefixes) {
        for (let i = 1; i <= pref.max; i++) {
            for (const ext of pref.exts) {
                candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/${pref.p}${i}${ext}`);
            }
        }
    }

    // Padded prefixes (01, 02...)
    const paddedPrefixes = [
        { p: 'CGM48-Debut-', max: 5, exts: ['.jpg', '.png'] },
        { p: 'Janken-2023-', max: 5, exts: ['.png', '.jpg'] },
        { p: 'CGM48-Sansei-Kawaii-', max: 5, exts: ['.png', '.jpg'] },
    ];
    for (const pref of paddedPrefixes) {
        for (let i = 1; i <= pref.max; i++) {
            const num = i.toString().padStart(2, '0');
            for (const ext of pref.exts) {
                candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/${pref.p}${num}${ext}`);
            }
        }
    }

    // Round based
    const roundPrefixes = ['SUN-Round', 'SAT-Round', 'Round'];
    for (const p of roundPrefixes) {
        for (let i = 1; i <= 10; i++) {
            candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/${p}${i}.jpg`);
            candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/${p}${i}.png`);
        }
    }

    // Specific filenames & legacy formats
    candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/cgm48.png`);
    // cherprang-1-{n}.png — พบตั้งแต่ n=1 ถึง n=6
    for (let i = 1; i <= 6; i++) {
        candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/cherprang-1-${i}.png`);
    }
    candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/${idStr}.jpg`);
    candidates.push(`https://img.bnk48cdn.net/shop/product/${idStr}/${idStr}.png`);

    return candidates;
}