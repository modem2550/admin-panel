

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/settings/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/10.DE4cZXBL.js","_app/immutable/chunks/B-U5jx19.js","_app/immutable/chunks/CJsOrg_x.js","_app/immutable/chunks/CP97kCR3.js"];
export const stylesheets = [];
export const fonts = [];
