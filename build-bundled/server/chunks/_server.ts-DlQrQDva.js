// build/server/chunks/index-DBqjc0Yf.js
var HttpError = class {
  /**
   * @param {number} status
   * @param {{message: string} extends App.Error ? (App.Error | string | undefined) : App.Error} body
   */
  constructor(status, body) {
    this.status = status;
    if (typeof body === "string") {
      this.body = { message: body };
    } else if (body) {
      this.body = body;
    } else {
      this.body = { message: `Error: ${status}` };
    }
  }
  toString() {
    return JSON.stringify(this.body);
  }
};

// build/server/chunks/index-Bd4EiwBH.js
var text_encoder = new TextEncoder();
function error(status, body) {
  if (isNaN(status) || status < 400 || status > 599) {
    throw new Error(`HTTP error status codes must be between 400 and 599 \u2014 ${status} is invalid`);
  }
  throw new HttpError(status, body);
}

// build/server/chunks/_server.ts-DlQrQDva.js
var IMAGE_CDN_BASE = "https://img.bnk48cdn.net/shop";
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
  const assetPath = params.path;
  if (!assetPath) throw error(400, "Missing image path");
  if (!/^[\w\-./]+$/.test(assetPath)) throw error(400, "Invalid path");
  const targetUrl = new URL(`${IMAGE_CDN_BASE}/${assetPath}`);
  url.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });
  try {
    const response = await fetch(targetUrl.toString());
    if (!response.ok) {
      if (response.status === 404 && /\.(jpe?g|png|webp|gif|svg)$/i.test(assetPath)) {
        const transparentPixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
        return new Response(transparentPixel, {
          status: 200,
          headers: {
            "Content-Type": "image/gif",
            "Cache-Control": "public, max-age=300"
          }
        });
      }
      return new Response(null, {
        status: response.status,
        headers: { "Cache-Control": "no-store" }
      });
    }
    const contentType = response.headers.get("content-type");
    if (!isAllowedContentType(contentType)) throw error(403, "Content type not allowed");
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": url.origin,
        "Vary": "Origin"
      }
    });
  } catch (e) {
    if (e instanceof Response) throw e;
    throw error(500, "Image proxy failed");
  }
};
export {
  GET
};
