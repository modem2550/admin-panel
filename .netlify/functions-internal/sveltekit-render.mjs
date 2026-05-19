import { init } from '../serverless.js';

export default init((() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([".assetsignore","favicon.ico","favicon.svg"]),
	mimeTypes: {".svg":"image/svg+xml"},
	_: {
		client: {start:"_app/immutable/entry/start.Br7tTwPh.js",app:"_app/immutable/entry/app.DaVK9PXn.js",imports:["_app/immutable/entry/start.Br7tTwPh.js","_app/immutable/chunks/BP6uOatx.js","_app/immutable/chunks/B-U5jx19.js","_app/immutable/chunks/CXuWhOti.js","_app/immutable/entry/app.DaVK9PXn.js","_app/immutable/chunks/B-U5jx19.js","_app/immutable/chunks/O6-aNYLC.js","_app/immutable/chunks/CP97kCR3.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('../server/nodes/0.js')),
			__memo(() => import('../server/nodes/1.js')),
			__memo(() => import('../server/nodes/2.js')),
			__memo(() => import('../server/nodes/3.js')),
			__memo(() => import('../server/nodes/4.js')),
			__memo(() => import('../server/nodes/5.js')),
			__memo(() => import('../server/nodes/6.js')),
			__memo(() => import('../server/nodes/7.js')),
			__memo(() => import('../server/nodes/8.js')),
			__memo(() => import('../server/nodes/9.js')),
			__memo(() => import('../server/nodes/10.js')),
			__memo(() => import('../server/nodes/11.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/.well-known/security.txt",
				pattern: /^\/\.well-known\/security\.txt\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../server/entries/endpoints/.well-known/security.txt/_server.ts.js'))
			},
			{
				id: "/api/assets/playback",
				pattern: /^\/api\/assets\/playback\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../server/entries/endpoints/api/assets/playback/_server.ts.js'))
			},
			{
				id: "/api/assets/scan",
				pattern: /^\/api\/assets\/scan\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../server/entries/endpoints/api/assets/scan/_server.ts.js'))
			},
			{
				id: "/api/assets/scan/status",
				pattern: /^\/api\/assets\/scan\/status\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../server/entries/endpoints/api/assets/scan/status/_server.ts.js'))
			},
			{
				id: "/api/assets/scan/status/sku",
				pattern: /^\/api\/assets\/scan\/status\/sku\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../server/entries/endpoints/api/assets/scan/status/sku/_server.ts.js'))
			},
			{
				id: "/api/assets/theater-archive",
				pattern: /^\/api\/assets\/theater-archive\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../server/entries/endpoints/api/assets/theater-archive/_server.ts.js'))
			},
			{
				id: "/api/auth/session",
				pattern: /^\/api\/auth\/session\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../server/entries/endpoints/api/auth/session/_server.ts.js'))
			},
			{
				id: "/api/check-assets",
				pattern: /^\/api\/check-assets\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../server/entries/endpoints/api/check-assets/_server.ts.js'))
			},
			{
				id: "/api/check-assets/latest",
				pattern: /^\/api\/check-assets\/latest\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../server/entries/endpoints/api/check-assets/latest/_server.ts.js'))
			},
			{
				id: "/api/download/mp4",
				pattern: /^\/api\/download\/mp4\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../server/entries/endpoints/api/download/mp4/_server.ts.js'))
			},
			{
				id: "/api/image/[...path]",
				pattern: /^\/api\/image(?:\/([^]*))?\/?$/,
				params: [{"name":"path","optional":false,"rest":true,"chained":true}],
				page: null,
				endpoint: __memo(() => import('../server/entries/endpoints/api/image/_...path_/_server.ts.js'))
			},
			{
				id: "/api/[...path]",
				pattern: /^\/api(?:\/([^]*))?\/?$/,
				params: [{"name":"path","optional":false,"rest":true,"chained":true}],
				page: null,
				endpoint: __memo(() => import('../server/entries/endpoints/api/_...path_/_server.ts.js'))
			},
			{
				id: "/(app)/assets",
				pattern: /^\/assets\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/(app)/dashboard",
				pattern: /^\/dashboard\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/(app)/downloader",
				pattern: /^\/downloader\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/(app)/events",
				pattern: /^\/events\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/(auth)/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/(app)/members",
				pattern: /^\/members\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/robots.txt",
				pattern: /^\/robots\.txt\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../server/entries/endpoints/robots.txt/_server.ts.js'))
			},
			{
				id: "/(app)/settings",
				pattern: /^\/settings\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 10 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})());

export const config = {
	path: ["/*"],
	excludedPath: ["/.netlify/*"],
	preferStatic: true
};
