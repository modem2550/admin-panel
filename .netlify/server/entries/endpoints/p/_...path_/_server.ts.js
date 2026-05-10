import { error } from "@sveltejs/kit";
//#region src/routes/p/[...path]/+server.ts
var DOMAIN_MAP = {
	"img": "https://img.bnk48cdn.net",
	"pub": "https://public.bnk48.io",
	"usr": "https://user.bnk48.io",
	"app": "https://app.bnk48.com",
	"api": "https://api.bnk48.com"
};
var ALLOWED_CONTENT_TYPES = [
	"image/",
	"video/",
	"audio/",
	"application/vnd.apple.mpegurl",
	"application/x-mpegurl",
	"application/octet-stream"
];
function isAllowedContentType(contentType) {
	if (!contentType) return true;
	return ALLOWED_CONTENT_TYPES.some((t) => contentType.startsWith(t));
}
var GET = async ({ params, url, fetch, locals }) => {
	if (!locals.session) return new Response(null, {
		status: 401,
		headers: {
			"Cache-Control": "no-store",
			"WWW-Authenticate": "session"
		}
	});
	const fullPath = params.path;
	if (!fullPath) throw error(400, "Missing path");
	const parts = fullPath.split("/");
	const prefix = parts[0];
	const remainingPath = parts.slice(1).join("/");
	const baseDomain = DOMAIN_MAP[prefix];
	if (!baseDomain) throw error(404, "Invalid proxy prefix");
	const targetUrl = new URL(`${baseDomain}/${remainingPath}`);
	url.searchParams.forEach((value, key) => {
		targetUrl.searchParams.set(key, value);
	});
	try {
		const response = await fetch(targetUrl.toString());
		if (!response.ok) return new Response(null, {
			status: response.status,
			headers: { "Cache-Control": "no-store" }
		});
		const contentType = response.headers.get("content-type");
		if (!isAllowedContentType(contentType)) throw error(403, "Content type not allowed");
		const blob = await response.blob();
		const allowedOrigin = url.origin;
		return new Response(blob, {
			status: response.status,
			headers: {
				"Content-Type": contentType || "application/octet-stream",
				"Cache-Control": "public, max-age=3600",
				"Access-Control-Allow-Origin": allowedOrigin,
				"Vary": "Origin"
			}
		});
	} catch (e) {
		if (e instanceof Response) throw e;
		throw error(500, "Proxy failed");
	}
};
//#endregion
export { GET };
