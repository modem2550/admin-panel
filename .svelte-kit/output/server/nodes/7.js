

export const index = 7;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/events/_page.svelte.js')).default;
export const universal = {
  "load": null,
  "ssr": false
};
export const universal_id = "src/routes/(app)/events/+page.ts";
export const imports = ["_app/immutable/nodes/7.Tcs2qJnq.js","_app/immutable/chunks/ClagBzh-.js","_app/immutable/chunks/CJsOrg_x.js","_app/immutable/chunks/CP97kCR3.js","_app/immutable/chunks/DBW4LZBf.js","_app/immutable/chunks/DgmqF8HY.js","_app/immutable/chunks/Bta9-t93.js"];
export const stylesheets = ["_app/immutable/assets/7.CdtbvTn_.css"];
export const fonts = [];
