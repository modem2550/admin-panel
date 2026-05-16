

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.Z4ogC3ZK.js","_app/immutable/chunks/B-U5jx19.js","_app/immutable/chunks/CP97kCR3.js"];
export const stylesheets = ["_app/immutable/assets/0.BzC3x3bp.css"];
export const fonts = [];
