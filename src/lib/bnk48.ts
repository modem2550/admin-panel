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