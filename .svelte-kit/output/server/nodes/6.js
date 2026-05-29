import * as server from '../entries/pages/(app)/dashboard/_page.server.ts.js';

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/dashboard/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/(app)/dashboard/+page.server.ts";
export const imports = ["_app/immutable/nodes/6.BA8RL4R6.js","_app/immutable/chunks/DhkMvD30.js","_app/immutable/chunks/CP97kCR3.js"];
export const stylesheets = ["_app/immutable/assets/6.CL2nV7rY.css"];
export const fonts = [];
