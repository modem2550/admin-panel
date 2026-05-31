// build/server/chunks/shared-server-BKxUl-5q.js
var private_env = {};

// build/server/chunks/_server.ts-Buw1cQbR.js
var GET = async ({ url }) => {
  const contact = private_env.SECURITY_CONTACT_EMAIL?.trim();
  const base = private_env.PUBLIC_SITE_URL?.replace(/\/$/, "") ?? url.origin;
  const expires = /* @__PURE__ */ new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  const lines = [];
  if (contact) lines.push(`Contact: mailto:${contact}`);
  else lines.push("# Configure SECURITY_CONTACT_EMAIL for your organization");
  lines.push(`Canonical: ${base}/.well-known/security.txt`);
  lines.push(`Expires: ${expires.toISOString().replace(/\.\d{3}Z$/, "Z")}`);
  lines.push("Preferred-Languages: en, th");
  const body = lines.join("\n") + "\n";
  return new Response(body, { headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=3600"
  } });
};
export {
  GET
};
