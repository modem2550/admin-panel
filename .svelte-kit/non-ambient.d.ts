
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/(app)" | "/" | "/.well-known" | "/.well-known/security.txt" | "/api" | "/api/assets" | "/api/assets/playback" | "/api/assets/scan" | "/api/assets/scan/status" | "/api/assets/scan/status/sku" | "/api/assets/theater-archive" | "/api/check-assets" | "/api/check-assets/latest" | "/api/downloader" | "/api/downloader/get-vod" | "/api/downloader/search" | "/api/downloads" | "/api/downloads/[id]" | "/api/downloads/[id]/file" | "/api/image" | "/api/image/[...path]" | "/api/[...path]" | "/(app)/assets" | "/(app)/dashboard" | "/(app)/downloader" | "/(app)/events" | "/(app)/members" | "/robots.txt";
		RouteParams(): {
			"/api/downloads/[id]": { id: string };
			"/api/downloads/[id]/file": { id: string };
			"/api/image/[...path]": { path: string };
			"/api/[...path]": { path: string }
		};
		LayoutParams(): {
			"/(app)": Record<string, never>;
			"/": { id?: string | undefined; path?: string | undefined };
			"/.well-known": Record<string, never>;
			"/.well-known/security.txt": Record<string, never>;
			"/api": { id?: string | undefined; path?: string | undefined };
			"/api/assets": Record<string, never>;
			"/api/assets/playback": Record<string, never>;
			"/api/assets/scan": Record<string, never>;
			"/api/assets/scan/status": Record<string, never>;
			"/api/assets/scan/status/sku": Record<string, never>;
			"/api/assets/theater-archive": Record<string, never>;
			"/api/check-assets": Record<string, never>;
			"/api/check-assets/latest": Record<string, never>;
			"/api/downloader": Record<string, never>;
			"/api/downloader/get-vod": Record<string, never>;
			"/api/downloader/search": Record<string, never>;
			"/api/downloads": { id?: string | undefined };
			"/api/downloads/[id]": { id: string };
			"/api/downloads/[id]/file": { id: string };
			"/api/image": { path?: string | undefined };
			"/api/image/[...path]": { path: string };
			"/api/[...path]": { path: string };
			"/(app)/assets": Record<string, never>;
			"/(app)/dashboard": Record<string, never>;
			"/(app)/downloader": Record<string, never>;
			"/(app)/events": Record<string, never>;
			"/(app)/members": Record<string, never>;
			"/robots.txt": Record<string, never>
		};
		Pathname(): "/" | "/.well-known/security.txt" | "/api/assets/playback" | "/api/assets/scan" | "/api/assets/scan/status" | "/api/assets/scan/status/sku" | "/api/assets/theater-archive" | "/api/check-assets" | "/api/check-assets/latest" | "/api/downloader/get-vod" | "/api/downloader/search" | "/api/downloads" | `/api/downloads/${string}` & {} | `/api/downloads/${string}/file` & {} | `/api/image/${string}` & {} | `/api/${string}` & {} | "/assets" | "/dashboard" | "/downloader" | "/events" | "/members" | "/robots.txt";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/.assetsignore" | "/favicon.ico" | "/favicon.svg" | "/ffmpeg/ffmpeg-core.js" | "/ffmpeg/ffmpeg-core.wasm" | string & {};
	}
}