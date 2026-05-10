

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/members/_page.svelte.js')).default;
export const universal = {
  "load": null,
  "ssr": false
};
export const universal_id = "src/routes/(app)/members/+page.ts";
export const imports = ["_app/immutable/nodes/8.BooUnN83.js","_app/immutable/chunks/ClagBzh-.js","_app/immutable/chunks/CJsOrg_x.js","_app/immutable/chunks/CP97kCR3.js","_app/immutable/chunks/DBW4LZBf.js","_app/immutable/chunks/DgmqF8HY.js","_app/immutable/chunks/Bta9-t93.js"];
export const stylesheets = ["_app/immutable/assets/8.DmVWWcyv.css"];
export const fonts = [];
