// build/server/chunks/dev-DRV-q2AU.js
var MAX_ARRAY_LEN = 2 ** 32 - 1;
var MAX_ARRAY_INDEX = MAX_ARRAY_LEN - 1;
var object_proto_names = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
var index_of = Array.prototype.indexOf;
var includes = Array.prototype.includes;
var object_prototype = Object.prototype;
var array_prototype = Array.prototype;
var DESTROYING = 1 << 25;
var EFFECT_TRANSPARENT = 65536;
var EFFECT_PRESERVED = 1 << 19;
var USER_EFFECT = 1 << 20;
var REACTION_IS_UPDATING = 1 << 21;
var ERROR_VALUE = 1 << 23;
var STALE_REACTION = new class StaleReactionError extends Error {
  name = "StaleReactionError";
  message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
}();
var ATTR_REGEX = /[&"<]/g;
var CONTENT_REGEX = /[&<]/g;
function escape_html(value, is_attr) {
  const str = String(value ?? "");
  const pattern = is_attr ? ATTR_REGEX : CONTENT_REGEX;
  pattern.lastIndex = 0;
  let escaped = "";
  let last = 0;
  while (pattern.test(str)) {
    const i = pattern.lastIndex - 1;
    const ch = str[i];
    escaped += str.substring(last, i) + (ch === "&" ? "&amp;" : ch === '"' ? "&quot;" : "&lt;");
    last = i + 1;
  }
  return escaped + str.substring(last);
}
var whitespace = [..." 	\n\r\f\xA0\v\uFEFF"];
var flags = EFFECT_TRANSPARENT | EFFECT_PRESERVED;

// build/server/chunks/_page.svelte-DAXTB-vk.js
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    $$renderer2.push(`<div class="page-shell"><div class="co-page-hero"><div class="co-page-hero__main"><span class="mono-label">Operational Overview</span> <h1 class="hero-display">Dashboard</h1> <p class="body-large">High-level counts, the next scheduled activity, and a snapshot
				of the newest indexed media \u2014 white surface, rule-based
				hierarchy.</p></div></div> <div class="stats-grid"><div class="product-stat"><span class="mono-label">Network Scope</span> <div class="stat-main"><span class="stat-value">${escape_html(data.membersCount)}</span> <span class="stat-unit">Members indexed</span></div></div> <div class="product-stat"><span class="mono-label">Activity flux</span> <div class="stat-main"><span class="stat-value">${escape_html(data.eventsCount)}</span> <span class="stat-unit">Total activities</span></div></div> <div class="product-stat product-stat--accent"><span class="mono-label">Imminent event</span> <div class="stat-main">`);
    if (data.nextEvent) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="stat-title">${escape_html(data.nextEvent.title)}</span> <span class="stat-meta">${escape_html(data.nextEvent.date)}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<span class="stat-dash">\u2014</span>`);
    }
    $$renderer2.push(`<!--]--></div></div></div> <section class="asset-stream svelte-1tyszyy"><div class="section-header svelte-1tyszyy"><h2 class="card-heading">Asset registry</h2> <a href="/assets" class="button-secondary">Explore repository <i class="fa-solid fa-arrow-right ms-1"></i></a></div> <div class="media-preview-row svelte-1tyszyy">`);
    $$renderer2.push("<!--[0-->");
    $$renderer2.push(`<div class="preview-col"><div class="skeleton-media mb-3"></div> <div class="skeleton-text"></div></div> <div class="preview-col"><div class="skeleton-media mb-3"></div> <div class="skeleton-text"></div></div> <div class="preview-col"><div class="skeleton-media mb-3"></div> <div class="skeleton-text"></div></div>`);
    $$renderer2.push(`<!--]--></div></section></div>`);
  });
}
export {
  _page as default
};
