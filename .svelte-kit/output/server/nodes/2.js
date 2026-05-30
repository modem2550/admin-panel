import * as universal from '../entries/pages/(app)/_layout.ts.js';
import * as server from '../entries/pages/(app)/_layout.server.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/(app)/+layout.ts";
export { server };
export const server_id = "src/routes/(app)/+layout.server.ts";
export const imports = ["_app/immutable/nodes/2.CEDbXcvF.js","_app/immutable/chunks/DhkMvD30.js","_app/immutable/chunks/Dooaho3v.js","_app/immutable/chunks/D1h2OxpE.js","_app/immutable/chunks/DUoziJeh.js","_app/immutable/chunks/BzxV9f7d.js","_app/immutable/chunks/CP97kCR3.js","_app/immutable/chunks/D72LGVUQ.js"];
export const stylesheets = [];
export const fonts = [];
