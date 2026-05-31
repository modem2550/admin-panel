var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// build/server/chunks/_layout.svelte-B6zg8MMF.js
var layout_svelte_B6zg8MMF_exports = {};
__export(layout_svelte_B6zg8MMF_exports, {
  default: () => _layout
});
function _layout($$renderer, $$props) {
  let { children } = $$props;
  $$renderer.push(`<div class="auth-layout-bg">`);
  children($$renderer);
  $$renderer.push(`<!----></div>`);
}
var init_layout_svelte_B6zg8MMF = __esm({
  "build/server/chunks/_layout.svelte-B6zg8MMF.js"() {
    "use strict";
  }
});

// build/server/chunks/3-QsYJP7TM.js
var index = 3;
var component_cache;
var component = async () => component_cache ??= (await Promise.resolve().then(() => (init_layout_svelte_B6zg8MMF(), layout_svelte_B6zg8MMF_exports))).default;
var imports = ["_app/immutable/nodes/3.cgazzsBe.js", "_app/immutable/chunks/DhkMvD30.js", "_app/immutable/chunks/CP97kCR3.js"];
var stylesheets = [];
var fonts = [];
export {
  component,
  fonts,
  imports,
  index,
  stylesheets
};
