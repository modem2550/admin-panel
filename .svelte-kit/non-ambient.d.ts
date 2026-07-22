
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
		RouteId(): "/(app)" | "/" | "/.well-known" | "/.well-known/security.txt" | "/api" | "/api/assets" | "/api/assets/[[action]]" | "/api/check-assets" | "/api/check-assets/[[mode]]" | "/api/downloader" | "/api/downloads" | "/api/downloads/[id]" | "/api/downloads/[id]/file" | "/api/image" | "/api/image/[...path]" | "/api/status" | "/api/[...path]" | "/(app)/auctions" | "/(app)/auctions/polls" | "/(app)/auctions/polls/[id]" | "/(app)/auctions/[id]" | "/(app)/campaigns" | "/(app)/downloader" | "/(app)/events" | "/(app)/members" | "/robots.txt" | "/(app)/scanner" | "/(app)/theater";
		RouteParams(): {
			"/api/assets/[[action]]": { action?: string | undefined };
			"/api/check-assets/[[mode]]": { mode?: string | undefined };
			"/api/downloads/[id]": { id: string };
			"/api/downloads/[id]/file": { id: string };
			"/api/image/[...path]": { path: string };
			"/api/[...path]": { path: string };
			"/(app)/auctions/polls/[id]": { id: string };
			"/(app)/auctions/[id]": { id: string }
		};
		LayoutParams(): {
			"/(app)": { id?: string | undefined };
			"/": { action?: string | undefined; mode?: string | undefined; id?: string | undefined; path?: string | undefined };
			"/.well-known": Record<string, never>;
			"/.well-known/security.txt": Record<string, never>;
			"/api": { action?: string | undefined; mode?: string | undefined; id?: string | undefined; path?: string | undefined };
			"/api/assets": { action?: string | undefined };
			"/api/assets/[[action]]": { action?: string | undefined };
			"/api/check-assets": { mode?: string | undefined };
			"/api/check-assets/[[mode]]": { mode?: string | undefined };
			"/api/downloader": Record<string, never>;
			"/api/downloads": { id?: string | undefined };
			"/api/downloads/[id]": { id: string };
			"/api/downloads/[id]/file": { id: string };
			"/api/image": { path?: string | undefined };
			"/api/image/[...path]": { path: string };
			"/api/status": Record<string, never>;
			"/api/[...path]": { path: string };
			"/(app)/auctions": { id?: string | undefined };
			"/(app)/auctions/polls": { id?: string | undefined };
			"/(app)/auctions/polls/[id]": { id: string };
			"/(app)/auctions/[id]": { id: string };
			"/(app)/campaigns": Record<string, never>;
			"/(app)/downloader": Record<string, never>;
			"/(app)/events": Record<string, never>;
			"/(app)/members": Record<string, never>;
			"/robots.txt": Record<string, never>;
			"/(app)/scanner": Record<string, never>;
			"/(app)/theater": Record<string, never>
		};
		Pathname(): "/" | "/.well-known/security.txt" | `/api/assets${string}` & {} | `/api/check-assets${string}` & {} | "/api/downloader" | "/api/downloads" | `/api/downloads/${string}` & {} | `/api/downloads/${string}/file` & {} | `/api/image/${string}` & {} | "/api/status" | `/api/${string}` & {} | "/auctions" | `/auctions/polls/${string}` & {} | `/auctions/${string}` & {} | "/campaigns" | "/downloader" | "/events" | "/members" | "/robots.txt" | "/scanner" | "/theater";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/.assetsignore" | "/app-logo.png" | "/apple-touch-icon-precomposed.png" | "/apple-touch-icon.png" | "/favicon.ico" | "/favicon.png" | "/favicon.svg" | "/ffmpeg/ffmpeg-core.js" | "/ffmpeg/ffmpeg-core.wasm" | string & {};
	}
}