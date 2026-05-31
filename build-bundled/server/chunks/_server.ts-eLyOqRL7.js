// build/server/chunks/_server.ts-eLyOqRL7.js
var GET = async () => {
  const body = [
    "User-agent: *",
    "Disallow: /",
    ""
  ].join("\n");
  return new Response(body, { headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=86400"
  } });
};
export {
  GET
};
