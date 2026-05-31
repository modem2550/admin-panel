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
var Redirect = class {
  /**
   * @param {300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308} status
   * @param {string} location
   */
  constructor(status, location) {
    try {
      new Headers({ location });
    } catch {
      throw new Error(
        `Invalid redirect location ${JSON.stringify(location)}: this string contains characters that cannot be used in HTTP headers`
      );
    }
    this.status = status;
    this.location = location;
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
function isHttpError(e, status) {
  if (!(e instanceof HttpError)) return false;
  return true;
}
function redirect(status, location) {
  if (isNaN(status) || status < 300 || status > 308) {
    throw new Error("Invalid status code");
  }
  throw new Redirect(
    // @ts-ignore
    status,
    location.toString()
  );
}
function isRedirect(e) {
  return e instanceof Redirect;
}
function json(data, init) {
  const body = JSON.stringify(data);
  const headers = new Headers(init?.headers);
  if (!headers.has("content-length")) {
    headers.set("content-length", text_encoder.encode(body).byteLength.toString());
  }
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return new Response(body, {
    ...init,
    headers
  });
}
function text(body, init) {
  const headers = new Headers(init?.headers);
  if (!headers.has("content-length")) {
    const encoded = text_encoder.encode(body);
    headers.set("content-length", encoded.byteLength.toString());
    return new Response(encoded, {
      ...init,
      headers
    });
  }
  return new Response(body, {
    ...init,
    headers
  });
}
export {
  isRedirect as a,
  error as e,
  isHttpError as i,
  json as j,
  redirect as r,
  text as t
};
