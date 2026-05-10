import * as server from '../entries/pages/(app)/dashboard/_page.server.ts.js';

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/dashboard/_page.svelte.js')).default;
export const universal = {
  "load": null,
  "ssr": false
};
export const universal_id = "src/routes/(app)/dashboard/+page.ts";
export { server };
export const server_id = "src/routes/(app)/dashboard/+page.server.ts";
export const imports = ["_app/immutable/nodes/6.DVGa562X.js","_app/immutable/chunks/ClagBzh-.js","_app/immutable/chunks/CJsOrg_x.js","_app/immutable/chunks/CP97kCR3.js"];
export const stylesheets = ["_app/immutable/assets/6.Bxu3AYL-.css"];
export const fonts = [];
