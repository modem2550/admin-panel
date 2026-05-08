import * as universal from '../entries/pages/(app)/dashboard/_page.ts.js';
import * as server from '../entries/pages/(app)/dashboard/_page.server.ts.js';

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/dashboard/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/(app)/dashboard/+page.ts";
export { server };
export const server_id = "src/routes/(app)/dashboard/+page.server.ts";
export const imports = ["_app/immutable/nodes/6.jTobnNTr.js","_app/immutable/chunks/DBgZ8ocX.js","_app/immutable/chunks/RjDAsemb.js","_app/immutable/chunks/CP97kCR3.js"];
export const stylesheets = ["_app/immutable/assets/6.BshQbZ4o.css"];
export const fonts = [];
