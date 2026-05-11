
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
		RouteId(): "/(auth)" | "/(app)" | "/" | "/.well-known" | "/.well-known/security.txt" | "/api" | "/api/assets" | "/api/assets/scan" | "/api/assets/scan/status" | "/api/assets/scan/status/sku" | "/api/auth" | "/api/auth/session" | "/api/check-assets" | "/api/check-assets/latest" | "/api/image" | "/api/image/[...path]" | "/api/proxy" | "/(app)/assets" | "/(app)/dashboard" | "/(app)/events" | "/(auth)/login" | "/(app)/members" | "/(app)/playback" | "/p" | "/p/[...path]" | "/robots.txt" | "/(app)/settings";
		RouteParams(): {
			"/api/image/[...path]": { path: string };
			"/p/[...path]": { path: string }
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
			"/api/auth": Record<string, never>;
			"/api/auth/session": Record<string, never>;
			"/api/check-assets": Record<string, never>;
			"/api/check-assets/latest": Record<string, never>;
			"/api/image": { path?: string };
			"/api/image/[...path]": { path: string };
			"/api/proxy": Record<string, never>;
			"/(app)/assets": Record<string, never>;
			"/(app)/dashboard": Record<string, never>;
			"/(app)/events": Record<string, never>;
			"/(auth)/login": Record<string, never>;
			"/(app)/members": Record<string, never>;
			"/(app)/playback": Record<string, never>;
			"/p": { path?: string };
			"/p/[...path]": { path: string };
			"/robots.txt": Record<string, never>;
			"/(app)/settings": Record<string, never>
		};
		Pathname(): "/" | "/.well-known/security.txt" | "/api/assets/scan" | "/api/assets/scan/status" | "/api/assets/scan/status/sku" | "/api/auth/session" | "/api/check-assets" | "/api/check-assets/latest" | `/api/image/${string}` & {} | "/assets" | "/dashboard" | "/events" | "/login" | "/members" | "/playback" | `/p/${string}` & {} | "/robots.txt" | "/settings";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/.assetsignore" | "/favicon.ico" | "/favicon.svg" | string & {};
	}
}