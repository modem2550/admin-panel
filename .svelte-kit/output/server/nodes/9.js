

export const index = 9;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/members/_page.svelte.js')).default;
export const universal = {
  "load": null,
  "ssr": false
};
export const universal_id = "src/routes/(app)/members/+page.ts";
export const imports = ["_app/immutable/nodes/9.Cfjao1BC.js","_app/immutable/chunks/B-U5jx19.js","_app/immutable/chunks/CJsOrg_x.js","_app/immutable/chunks/CP97kCR3.js","_app/immutable/chunks/RNzBf7tm.js","_app/immutable/chunks/DQlk9frC.js","_app/immutable/chunks/CXuWhOti.js"];
export const stylesheets = [];
export const fonts = [];
