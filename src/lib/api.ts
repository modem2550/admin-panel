/**
 * Tauri Desktop API Helper
 *
 * When the desktop app runs the embedded local server (production build),
 * `/api/...` requests stay on the same origin and need no rewriting.
 *
 * For static-only Tauri builds, relative `/api/...` fetches can be rewritten
 * to a remote backend (Netlify) via `VITE_TAURI_API_BASE_URL` or localStorage.
 */

const STORAGE_KEY = 'tauri-api-base-url';

/** Compile-time remote API base (optional fallback for static desktop builds). */
const DEFAULT_API_BASE_URL =
    (import.meta.env.VITE_TAURI_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? '';

// ── Tauri detection ────────────────────────────────────────────────────────────

let _isTauri: boolean | null = null;

/** True when built for Tauri desktop (`VITE_TAURI` set during `tauri build`). */
export function isTauriBuild(): boolean {
    return import.meta.env.VITE_TAURI === '1';
}

/** Returns true when the app is running inside a Tauri webview. */
export function isTauri(): boolean {
    if (_isTauri !== null) return _isTauri;
    if (isTauriBuild()) {
        _isTauri = true;
        return true;
    }
    if (typeof window === 'undefined') {
        _isTauri = false;
        return false;
    }
    // Tauri 2.x injects `window.__TAURI_INTERNALS__`
    // Tauri 1.x injects `window.__TAURI__`
    _isTauri = !!(
        (window as any).__TAURI_INTERNALS__ ||
        (window as any).__TAURI__
    );
    return _isTauri;
}

/** Embedded Node server in production Tauri — API calls stay same-origin. */
function usesEmbeddedServer(): boolean {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    return host === '127.0.0.1' || host === 'localhost';
}

// ── API Base URL management ────────────────────────────────────────────────────

/** Read the configured API base URL (from localStorage, or the compile-time default). */
export function getApiBaseUrl(): string {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return stored.replace(/\/+$/, '');  // trim trailing slashes
    }
    return DEFAULT_API_BASE_URL;
}

/** Persist a new API base URL to localStorage. */
export function setApiBaseUrl(url: string): void {
    const clean = url.replace(/\/+$/, '');
    localStorage.setItem(STORAGE_KEY, clean);
}

/**
 * Resolve a relative `/api/...` path to an absolute URL when running in Tauri.
 * On the web this returns the path unchanged.
 */
export function getApiUrl(path: string): string {
    if (!isTauri()) return path;
    if (!path.startsWith('/api/')) return path;
    if (usesEmbeddedServer()) return path;
    const base = getApiBaseUrl();
    if (!base) return path;
    return `${base}${path}`;
}

// ── Fetch override ─────────────────────────────────────────────────────────────

let _fetchPatched = false;

/**
 * Monkey-patch `window.fetch` so that any relative `/api/...` request is
 * transparently redirected to the Netlify backend when running in Tauri.
 *
 * Safe to call multiple times — the patch is applied only once.
 */
export function installFetchOverride(): void {
    if (_fetchPatched) return;
    if (typeof window === 'undefined') return;
    if (!isTauri()) return;
    if (usesEmbeddedServer()) return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        if (typeof input === 'string' && input.startsWith('/api/')) {
            const base = getApiBaseUrl();
            if (base) {
                input = `${base}${input}`;
            }
        } else if (input instanceof Request && input.url) {
            // Request objects with relative URLs will have been resolved
            // against the Tauri origin (tauri://localhost or https://tauri.localhost).
            // We check if the pathname starts with /api/.
            try {
                const u = new URL(input.url);
                if (u.pathname.startsWith('/api/')) {
                    const base = getApiBaseUrl();
                    if (base) {
                        const newUrl = `${base}${u.pathname}${u.search}`;
                        input = new Request(newUrl, input);
                    }
                }
            } catch {
                // ignore invalid URLs
            }
        }
        return originalFetch(input, init);
    } as typeof window.fetch;

    _fetchPatched = true;
}
