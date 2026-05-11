export const AUTH_URL = 'https://user.bnk48.io/auth/email';
export const INFO_URL = 'https://public.bnk48.io/content/member-live/video/';
export const TIMELINE_VIDEO_URL = 'https://user.bnk48.io/timeline-video/';
export const TIMELINE_INFO_URL = 'https://public.bnk48.io/timeline/';
export const BATCH_THANKYOU_URL = 'https://public.bnk48.io/timeline/content-member-batch-thankyou/';
export const M3U_URL = 'https://user.bnk48.io/member-live/';
export const MEMBER_URL = 'https://public.bnk48.io/member/';
export const PLAYBACK_URL_HEAD = 'https://app.bnk48.com/member-playback/';
export const API_V2_BASE = 'https://api.bnk48.com/api/v2';

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

export const GE2023_MEMBERS = [
    "berry", "earn", "earth", "emmy", "eve", "fame", "grace", "hoop", "janry", "jaokhem",
    "kaofrang", "khamin", "l", "marine", "mean", "micha", "minmin", "monet", "myyu", "nene",
    "new", "nine", "paeyah", "palmmy", "pancake", "panda", "patt", "peak", "popper", "ratah",
    "satchan", "sindy", "stang", "wawa", "wee", "yayee", "yoghurt", "angel", "aom", "champoo",
    "emma", "fahsai", "fortune", "ginna", "izurina", "jingjing", "jjae", "kaiwan", "kaning",
    "kyla", "latin", "lookked", "marmink", "meen", "mei", "milk", "nana", "nena", "nenie",
    "papang", "pim", "ping", "punch", "sita"
];

export const CGM48_CALENDAR2024 = [
    "Angel", "Aom", "Champoo", "Emma", "Fahsai", "Fortune", "Ginna", "Izurina",
    "Jingjing", "Jjae", "Kaiwan", "Kaning", "Kyla", "Latin", "Lookked", "Marmink",
    "Meen", "Mei", "Milk", "Nana", "Nena", "Nenie", "Papang",
    "Pim", "Ping", "Punch", "Sita"
];

export const BNK48_CALENDAR2024 = [
    "Berry", "Earn", "Earth", "Emmy", "Eve", "Fame", "Fond", "Grace",
    "Gygee", "Hoop", "Janry", "Jaokhem", "Kaofrang", "Khamin",
    "L", "Marine", "Mean", "Micha", "Minmin", "Miori", "Monet", "Myyu",
    "Nene", "New", "Niky", "Nine", "Paeyah", "Pakwan", "Palmmy", "Pancake", "Panda",
    "Patt", "Peak", "Phukkhom", "Popper", "Ratah", "Satchan", "Sindy", "Stang", "Wawa", "Wee", "Yayee", "Yoghurt"
];

export const PRODUCT_SAT_SUN_SWING_MIN = 422;
export const PRODUCT_SAT_SUN_SWING_MAX = 750;

export function isProductSatSunSwingZone(id: number | string): boolean {
    const idNum = +id;
    return Number.isFinite(idNum) && idNum >= PRODUCT_SAT_SUN_SWING_MIN && idNum <= PRODUCT_SAT_SUN_SWING_MAX;
}

export function getSatSunSwingThumbnailCandidates(id: number | string): string[] {
    const base = `/api/image/product/${id}`;
    const out: string[] = [`${base}/sku-1.jpg`, `${base}/sku-1.png`];
    for (let r = 1; r <= 6; r++) {
        out.push(
            `${base}/SAT-Round${r}.png`,
            `${base}/SAT-Round${r}.jpg`,
            `${base}/SUN-Round${r}.png`,
            `${base}/SUN-Round${r}.jpg`,
        );
    }
    return out;
}

export const PRODUCT_ROUND_ONLY_MIN = 850;
export const PRODUCT_ROUND_ONLY_MAX = 914;

export function isProductRoundOnlyZone(id: number | string): boolean {
    const idNum = +id;
    return Number.isFinite(idNum) && idNum >= PRODUCT_ROUND_ONLY_MIN && idNum <= PRODUCT_ROUND_ONLY_MAX;
}

export function getRoundOnlyThumbnailCandidates(id: number | string): string[] {
    const base = `/api/image/product/${id}`;
    const out: string[] = [`${base}/sku-1.jpg`, `${base}/sku-1.png`];
    for (let r = 1; r <= 6; r++) {
        out.push(`${base}/Round${r}.png`, `${base}/Round${r}.jpg`);
    }
    return out;
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
 * Uses a stealthy path-based approach: /p/{prefix}/{path}
 * Results are memoized — repeated calls with the same URL are O(1).
 */
export function proxyUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('/p/')) return url;
    if (!url.startsWith('http')) return url;

    const cached = proxyCache.get(url);
    if (cached !== undefined) return cached;

    let result = url;
    try {
        const parsed = new URL(url);
        const prefix = HOST_PREFIX_MAP[parsed.hostname];
        if (prefix) {
            const path = parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname;
            result = `/p/${prefix}/${path}${parsed.search}`;
        }
    } catch {
        // ignore invalid URLs, return original
    }

    proxyCache.set(url, result);
    return result;
}

// ── getDefaultAssetUrl — range lookup table ───────────────────────────────────

type RangeEntry = {
    min: number;
    max: number;
    /** Returns only the filename/path portion after the product base path */
    file: (id: number) => string;
};

/**
 * Sorted range table for product asset filenames.
 * Binary search finds the right range in O(log n) vs O(n) if-chain.
 */
const PRODUCT_ASSET_RANGES: RangeEntry[] = [
    { min: 1, max: 4, file: id => `aroma-${id}.png` },
    { min: 5, max: 49, file: id => `${CDN_MEMBERS[id - 5] ?? 'berry'}.jpg` },
    { min: 50, max: 94, file: id => `${CDN_MEMBERS[id - 50] ?? 'berry'}.jpg` },
    { min: 95, max: 98, file: _ => 'image-1.jpg' },
    { min: 99, max: 99, file: _ => 'cherprang-1-1.png' },
    { min: 100, max: 103, file: _ => 'cherprang-1.png' },
    { min: 107, max: 108, file: _ => 'cgm48.png' },
    { min: 110, max: 130, file: _ => 'CGM48-Debut-01.jpg' },
    { min: 131, max: 140, file: _ => 'bnk48-1.png' },
    { min: 141, max: 150, file: _ => 'cgm48-1.png' },
    { min: 151, max: 159, file: _ => 'Janken-2023-01.png' },
    { min: 160, max: 164, file: _ => 'CGM48-Sansei-Kawaii-01.png' },
    { min: 167, max: 232, file: _ => 'tshirt-1.jpg' },
    { min: 235, max: 246, file: _ => 'tshirt-1.jpg' },
    { min: 250, max: 279, file: id => `${id}.jpg` },
    // 422–750: SAT/SUN swing — sku-1.jpg as safe default; frontend retries via onerror
    { min: 422, max: 750, file: _ => 'sku-1.jpg' },
    // 751–805: unknown
    { min: 751, max: 805, file: _ => 'sku-1.jpg' },
    // 806–841: no dash variant
    { min: 806, max: 841, file: _ => 'sku1.jpg' },
    // 842–849: unknown
    { min: 842, max: 849, file: _ => 'sku-1.jpg' },
    // 850–914: Round1–6 swing — sku-1.jpg as safe default
    { min: 850, max: 914, file: _ => 'sku-1.jpg' },
    // 915–1000: unknown
    { min: 915, max: 1000, file: _ => 'sku-1.jpg' },
    { min: 1089, max: 1152, file: id => `${GE2023_MEMBERS[id - 1089] ?? 'berry'}-poster-ge2023.jpg` },
    { min: 1182, max: 1184, file: _ => 'sku-2.png' },
    { min: 1265, max: 1307, file: id => `${BNK48_CALENDAR2024[id - 1265] ?? 'Berry'}.jpg` },
    { min: 1310, max: 1336, file: id => `${CGM48_CALENDAR2024[id - 1310] ?? 'Angel'}.jpg` },
    { min: 3454, max: 3458, file: _ => 'sku-2.png' },
];

/** Binary search over sorted PRODUCT_ASSET_RANGES. Returns entry or undefined. */
function findProductRange(idNum: number): RangeEntry | undefined {
    let lo = 0, hi = PRODUCT_ASSET_RANGES.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        const entry = PRODUCT_ASSET_RANGES[mid];
        if (idNum < entry.min) hi = mid - 1;
        else if (idNum > entry.max) lo = mid + 1;
        else return entry;
    }
    return undefined;
}

export function getDefaultAssetUrl(type: 'product' | 'group', id: number | string): string {
    const idStr = String(id);
    if (type !== 'product') return `/api/image/product-group/${idStr}.jpg`;

    const idNum = +id;
    const entry = findProductRange(idNum);
    const file = entry ? entry.file(idNum) : 'sku-1.jpg';
    return `/api/image/product/${idStr}/${file}`;
}

/** True when product id is covered by PRODUCT_ASSET_RANGES */
export function isKnownProductAssetRange(id: number | string): boolean {
    const idNum = +id;
    if (!Number.isFinite(idNum)) return false;
    return !!findProductRange(idNum);
}

// ── getCDNDiscoveryUrls ────────────────────────────────────────────────────────

export function getCDNDiscoveryUrls(type: 'product' | 'group', id: number | string): string[] {
    const idNum = +id;
    const idStr = String(id);

    if (type === 'group') {
        return [
            `https://img.bnk48cdn.net/shop/product-group/${idStr}.jpg`,
            `https://img.bnk48cdn.net/shop/product-group/${idStr}.png`,
        ];
    }

    // Seen set to deduplicate without post-processing
    const seen = new Set<string>();
    const candidates: string[] = [];

    const push = (path: string) => {
        const full = `https://img.bnk48cdn.net/shop/product/${idStr}/${path}`;
        if (!seen.has(full)) { seen.add(full); candidates.push(full); }
    };

    // Always try sku-1 first
    push('sku-1.jpg');
    push('sku-1.png');

    if (idNum >= 1 && idNum <= 4) {
        push(`aroma-${idNum}.png`);

    } else if (idNum >= 5 && idNum <= 49) {
        const m = CDN_MEMBERS[idNum - 5];
        if (m) { push(`${m}.jpg`); push(`${m}.png`); }

    } else if (idNum >= 50 && idNum <= 94) {
        const m = CDN_MEMBERS[idNum - 50];
        if (m) { push(`${m}.jpg`); push(`${m}.png`); }

    } else if (idNum >= 95 && idNum <= 98) {
        for (let i = 1; i <= 3; i++) push(`image-${i}.jpg`);

    } else if (idNum >= 99 && idNum <= 103) {
        for (let i = 1; i <= 3; i++) push(`cherprang-1-${i}.png`);

    } else if (idNum >= 107 && idNum <= 108) {
        push('cgm48.png');

    } else if (idNum >= 110 && idNum <= 130) {
        for (let i = 1; i <= 4; i++) {
            push(`CGM48-Debut-${i}.jpg`);
            push(`CGM48-Debut-0${i}.jpg`);
        }

    } else if (idNum >= 131 && idNum <= 150) {
        if (idNum <= 140) for (let i = 1; i <= 3; i++) push(`bnk48-${i}.png`);
        if (idNum >= 141) for (let i = 1; i <= 3; i++) push(`cgm48-${i}.png`);

    } else if (idNum >= 151 && idNum <= 159) {
        for (let i = 1; i <= 3; i++) push(`Janken-2023-0${i}.png`);

    } else if (idNum >= 160 && idNum <= 164) {
        for (let i = 1; i <= 3; i++) {
            push(`CGM48-Sansei-Kawaii-${i}.png`);
            push(`CGM48-Sansei-Kawaii-0${i}.png`);
        }

    } else if (idNum >= 167 && idNum <= 246) {
        for (let i = 1; i <= 3; i++) push(`tshirt-${i}.jpg`);

    } else if (idNum >= 250 && idNum <= 279) {
        push(`${idStr}.jpg`);

    } else if (idNum >= 422 && idNum <= 750) {
        // SAT/SUN swing zone
        for (let r = 1; r <= 6; r++) {
            push(`SAT-Round${r}.png`);
            push(`SAT-Round${r}.jpg`);
            push(`SUN-Round${r}.png`);
            push(`SUN-Round${r}.jpg`);
        }

    } else if (idNum >= 751 && idNum <= 805) {
        for (let i = 1; i <= 4; i++) { push(`sku-${i}.jpg`); push(`sku-${i}.png`); }
        for (const day of ['SAT', 'SUN']) {
            for (let r = 1; r <= 6; r++) push(`${day}-Round${r}.png`);
        }

    } else if (idNum >= 806 && idNum <= 841) {
        for (let i = 1; i <= 3; i++) push(`sku${i}.jpg`);

    } else if (idNum >= 842 && idNum <= 849) {
        for (let i = 1; i <= 4; i++) { push(`sku-${i}.jpg`); push(`sku${i}.jpg`); }
        for (let r = 1; r <= 6; r++) { push(`Round${r}.png`); push(`Round${r}.jpg`); }

    } else if (idNum >= 850 && idNum <= 914) {
        for (let r = 1; r <= 6; r++) { push(`Round${r}.png`); push(`Round${r}.jpg`); }

    } else if (idNum >= 915 && idNum <= 1000) {
        for (let i = 1; i <= 4; i++) { push(`sku-${i}.jpg`); push(`sku-${i}.png`); }
        for (const day of ['SAT', 'SUN']) {
            for (let r = 1; r <= 6; r++) push(`${day}-Round${r}.png`);
        }
        for (let r = 1; r <= 6; r++) { push(`Round${r}.png`); push(`Round${r}.jpg`); }

    } else if (idNum >= 1089 && idNum <= 1152) {
        push(`${GE2023_MEMBERS[idNum - 1089] ?? 'berry'}-poster-ge2023.jpg`);

    } else if (idNum >= 1182 && idNum <= 1184) {
        for (let i = 2; i <= 6; i++) push(`sku-${i}.png`);

    } else {
        for (let i = 2; i <= 5; i++) { push(`sku-${i}.jpg`); push(`sku-${i}.png`); }
    }

    return candidates;
}