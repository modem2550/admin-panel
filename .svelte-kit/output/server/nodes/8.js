

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/events/_page.svelte.js')).default;
export const universal = {
  "load": null,
  "ssr": false
};
export const universal_id = "src/routes/(app)/events/+page.ts";
export const imports = ["_app/immutable/nodes/8.CJHrA8TO.js","_app/immutable/chunks/BN6mn_f7.js","_app/immutable/chunks/CJsOrg_x.js","_app/immutable/chunks/CP97kCR3.js","_app/immutable/chunks/RNzBf7tm.js","_app/immutable/chunks/DHQF-k_M.js","_app/immutable/chunks/DBZPenr5.js"];
export const stylesheets = [];
export const fonts = [];
