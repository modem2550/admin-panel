

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(auth)/_layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/3.0gq_X7WD.js","_app/immutable/chunks/BN6mn_f7.js","_app/immutable/chunks/CP97kCR3.js"];
export const stylesheets = [];
export const fonts = [];
