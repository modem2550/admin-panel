import * as server from '../entries/pages/(app)/downloader/_page.server.ts.js';

export const index = 7;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/downloader/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/(app)/downloader/+page.server.ts";
export const imports = ["_app/immutable/nodes/7.BOZVKtXa.js","_app/immutable/chunks/B-U5jx19.js","_app/immutable/chunks/CG7xseMn.js","_app/immutable/chunks/CXuWhOti.js","_app/immutable/chunks/CNxz2d-N.js","_app/immutable/chunks/CP97kCR3.js","_app/immutable/chunks/DQlk9frC.js"];
export const stylesheets = ["_app/immutable/assets/7.BZkjfTGW.css"];
export const fonts = [];
