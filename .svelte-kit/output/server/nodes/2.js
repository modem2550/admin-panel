import * as server from '../entries/pages/(app)/_layout.server.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/_layout.svelte.js')).default;
export const universal = {
  "load": null,
  "ssr": false
};
export const universal_id = "src/routes/(app)/+layout.ts";
export { server };
export const server_id = "src/routes/(app)/+layout.server.ts";
export const imports = ["_app/immutable/nodes/2.BvNfKOmr.js","_app/immutable/chunks/B-U5jx19.js","_app/immutable/chunks/CG7xseMn.js","_app/immutable/chunks/CXuWhOti.js","_app/immutable/chunks/CJsOrg_x.js","_app/immutable/chunks/CNxz2d-N.js","_app/immutable/chunks/CP97kCR3.js","_app/immutable/chunks/DQlk9frC.js"];
export const stylesheets = [];
export const fonts = [];
