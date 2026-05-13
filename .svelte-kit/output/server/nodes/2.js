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
export const imports = ["_app/immutable/nodes/2.BxKG48OT.js","_app/immutable/chunks/BN6mn_f7.js","_app/immutable/chunks/Ds0zw2yl.js","_app/immutable/chunks/DBZPenr5.js","_app/immutable/chunks/CJsOrg_x.js","_app/immutable/chunks/B1kV9ByG.js","_app/immutable/chunks/CP97kCR3.js","_app/immutable/chunks/DHQF-k_M.js"];
export const stylesheets = [];
export const fonts = [];
