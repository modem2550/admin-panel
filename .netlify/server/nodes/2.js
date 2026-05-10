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
export const imports = ["_app/immutable/nodes/2.bDulNjQt.js","_app/immutable/chunks/ClagBzh-.js","_app/immutable/chunks/C4n5GNUl.js","_app/immutable/chunks/Bta9-t93.js","_app/immutable/chunks/CJsOrg_x.js","_app/immutable/chunks/DbW4PvTZ.js","_app/immutable/chunks/CP97kCR3.js","_app/immutable/chunks/DgmqF8HY.js"];
export const stylesheets = ["_app/immutable/assets/2.51QXJmff.css"];
export const fonts = [];
