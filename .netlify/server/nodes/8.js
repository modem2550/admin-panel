

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/events/_page.svelte.js')).default;
export const universal = {
  "load": null,
  "ssr": false
};
export const universal_id = "src/routes/(app)/events/+page.ts";
export const imports = ["_app/immutable/nodes/8.CPm1hNje.js","_app/immutable/chunks/B-U5jx19.js","_app/immutable/chunks/CJsOrg_x.js","_app/immutable/chunks/CP97kCR3.js","_app/immutable/chunks/DPum27Nz.js","_app/immutable/chunks/DQlk9frC.js","_app/immutable/chunks/CXuWhOti.js"];
export const stylesheets = [];
export const fonts = [];
