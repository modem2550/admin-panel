
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
		RouteId(): "/" | "/.well-known" | "/.well-known/security.txt" | "/api" | "/api/assets" | "/api/assets/[[action]]" | "/api/check-assets" | "/api/check-assets/[[mode]]" | "/api/downloader" | "/api/downloads" | "/api/downloads/[id]" | "/api/downloads/[id]/file" | "/api/image" | "/api/image/[...path]" | "/api/[...path]" | "/robots.txt";
		RouteParams(): {
			"/api/assets/[[action]]": { action?: string | undefined };
			"/api/check-assets/[[mode]]": { mode?: string | undefined };
			"/api/downloads/[id]": { id: string };
			"/api/downloads/[id]/file": { id: string };
			"/api/image/[...path]": { path: string };
			"/api/[...path]": { path: string }
		};
		LayoutParams(): {
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
			"/api/[...path]": { path: string };
			"/robots.txt": Record<string, never>
		};
		Pathname(): "/" | "/.well-known/security.txt" | `/api/assets${string}` & {} | `/api/check-assets${string}` & {} | "/api/downloader" | "/api/downloads" | `/api/downloads/${string}` & {} | `/api/downloads/${string}/file` & {} | `/api/image/${string}` & {} | `/api/${string}` & {} | "/robots.txt";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/.assetsignore" | "/favicon.ico" | "/favicon.svg" | "/ffmpeg/ffmpeg-core.js" | "/ffmpeg/ffmpeg-core.wasm" | string & {};
	}
}