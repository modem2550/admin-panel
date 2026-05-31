var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// build/server/chunks/_layout.svelte-C9kkUOBf.js
var layout_svelte_C9kkUOBf_exports = {};
__export(layout_svelte_C9kkUOBf_exports, {
  default: () => _layout
});
function _layout($$renderer, $$props) {
  let { children } = $$props;
  children($$renderer);
  $$renderer.push(`<!---->`);
}
var init_layout_svelte_C9kkUOBf = __esm({
  "build/server/chunks/_layout.svelte-C9kkUOBf.js"() {
    "use strict";
  }
});

// build/server/chunks/0-BqbiLtSi.js
var index = 0;
var component_cache;
var component = async () => component_cache ??= (await Promise.resolve().then(() => (init_layout_svelte_C9kkUOBf(), layout_svelte_C9kkUOBf_exports))).default;
var imports = ["_app/immutable/nodes/0.Dt-EhyqT.js", "_app/immutable/chunks/DhkMvD30.js", "_app/immutable/chunks/CP97kCR3.js"];
var stylesheets = ["_app/immutable/assets/0.CCokm-yW.css"];
var fonts = [];
export {
  component,
  fonts,
  imports,
  index,
  stylesheets
};
