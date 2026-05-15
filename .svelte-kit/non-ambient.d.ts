
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
		RouteId(): "/(auth)" | "/(app)" | "/" | "/.well-known" | "/.well-known/security.txt" | "/api" | "/api/assets" | "/api/assets/scan" | "/api/assets/scan/status" | "/api/assets/scan/status/sku" | "/api/assets/theater-archive" | "/api/auth" | "/api/auth/session" | "/api/check-assets" | "/api/check-assets/latest" | "/api/download" | "/api/download/mp4" | "/api/image" | "/api/image/[...path]" | "/api/proxy" | "/api/[...path]" | "/(app)/assets" | "/(app)/dashboard" | "/(app)/downloader" | "/(app)/events" | "/(auth)/login" | "/(app)/members" | "/robots.txt" | "/(app)/settings";
		RouteParams(): {
			"/api/image/[...path]": { path: string };
			"/api/[...path]": { path: string }
		};
		LayoutParams(): {
			"/(auth)": Record<string, never>;
			"/(app)": Record<string, never>;
			"/": { path?: string };
			"/.well-known": Record<string, never>;
			"/.well-known/security.txt": Record<string, never>;
			"/api": { path?: string };
			"/api/assets": Record<string, never>;
			"/api/assets/scan": Record<string, never>;
			"/api/assets/scan/status": Record<string, never>;
			"/api/assets/scan/status/sku": Record<string, never>;
			"/api/assets/theater-archive": Record<string, never>;
			"/api/auth": Record<string, never>;
			"/api/auth/session": Record<string, never>;
			"/api/check-assets": Record<string, never>;
			"/api/check-assets/latest": Record<string, never>;
			"/api/download": Record<string, never>;
			"/api/download/mp4": Record<string, never>;
			"/api/image": { path?: string };
			"/api/image/[...path]": { path: string };
			"/api/proxy": Record<string, never>;
			"/api/[...path]": { path: string };
			"/(app)/assets": Record<string, never>;
			"/(app)/dashboard": Record<string, never>;
			"/(app)/downloader": Record<string, never>;
			"/(app)/events": Record<string, never>;
			"/(auth)/login": Record<string, never>;
			"/(app)/members": Record<string, never>;
			"/robots.txt": Record<string, never>;
			"/(app)/settings": Record<string, never>
		};
		Pathname(): "/" | "/.well-known/security.txt" | "/api/assets/scan" | "/api/assets/scan/status" | "/api/assets/scan/status/sku" | "/api/assets/theater-archive" | "/api/auth/session" | "/api/check-assets" | "/api/check-assets/latest" | "/api/download/mp4" | `/api/image/${string}` & {} | `/api/${string}` & {} | "/assets" | "/dashboard" | "/downloader" | "/events" | "/login" | "/members" | "/robots.txt" | "/settings";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/.assetsignore" | "/favicon.ico" | "/favicon.svg" | string & {};
	}
}