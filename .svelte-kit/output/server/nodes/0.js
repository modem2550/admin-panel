

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.GX3ezsx1.js","_app/immutable/chunks/DBgZ8ocX.js","_app/immutable/chunks/CP97kCR3.js"];
export const stylesheets = [];
export const fonts = [];
