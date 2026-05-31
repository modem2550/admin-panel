// build/server/chunks/dev-DRV-q2AU.js
var MAX_ARRAY_LEN = 2 ** 32 - 1;
var MAX_ARRAY_INDEX = MAX_ARRAY_LEN - 1;
var object_proto_names = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
var index_of = Array.prototype.indexOf;
var includes = Array.prototype.includes;
var object_prototype = Object.prototype;
var array_prototype = Array.prototype;
var has_own_property = Object.prototype.hasOwnProperty;
var noop = () => {
};
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
var replacements = { translate: /* @__PURE__ */ new Map([[true, "yes"], [false, "no"]]) };
function attr(name, value, is_boolean = false) {
  if (name === "hidden" && value !== "until-found") is_boolean = true;
  if (value == null || !value && is_boolean) return "";
  const normalized = has_own_property.call(replacements, name) && replacements[name].get(value) || value;
  return ` ${name}${is_boolean ? `=""` : `="${escape_html(normalized, true)}"`}`;
}
var whitespace = [..." 	\n\r\f\xA0\v\uFEFF"];
function to_class(value, hash, directives) {
  var classname = value == null ? "" : "" + value;
  if (hash) classname = classname ? classname + " " + hash : hash;
  if (directives) {
    for (var key of Object.keys(directives)) if (directives[key]) classname = classname ? classname + " " + key : key;
    else if (classname.length) {
      var len = key.length;
      var a = 0;
      while ((a = classname.indexOf(key, a)) >= 0) {
        var b = a + len;
        if ((a === 0 || whitespace.includes(classname[a - 1])) && (b === classname.length || whitespace.includes(classname[b]))) classname = (a === 0 ? "" : classname.substring(0, a)) + classname.substring(b + 1);
        else a = b;
      }
    }
  }
  return classname === "" ? null : classname;
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || a !== null && typeof a === "object" || typeof a === "function";
}
var subscriber_queue = [];
function writable(value, start = noop) {
  let stop = null;
  const subscribers = /* @__PURE__ */ new Set();
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) subscriber_queue[i][0](subscriber_queue[i + 1]);
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update2(fn) {
    set(fn(value));
  }
  function subscribe2(run, invalidate = noop) {
    const subscriber = [run, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) stop = start(set, update2) || noop;
    run(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0 && stop) {
        stop();
        stop = null;
      }
    };
  }
  return {
    set,
    update: update2,
    subscribe: subscribe2
  };
}
var flags = EFFECT_TRANSPARENT | EFFECT_PRESERVED;
function attr_class(value, hash, directives) {
  var result = to_class(value, hash, directives);
  return result ? ` class="${escape_html(result, true)}"` : "";
}
function ensure_array_like(array_like_or_iterator) {
  if (array_like_or_iterator) return array_like_or_iterator.length !== void 0 ? array_like_or_iterator : Array.from(array_like_or_iterator);
  return [];
}

// build/server/chunks/toasts-eJOPe2vZ.js
var { subscribe, update } = writable([]);
var nextId = 0;
function remove(id) {
  update((all) => all.filter((t) => t.id !== id));
}
var toasts = {
  subscribe,
  _remove: remove,
  add: (message, type = "info") => {
    const id = nextId++;
    update((all) => [...all, {
      id,
      message,
      type
    }]);
    setTimeout(() => remove(id), 3e3);
  }
};

// build/server/chunks/_page.svelte-Cd4_c6kt.js
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let selectedMemberId = "";
    let searchQuery = "";
    let isLoading = false;
    let resultData = null;
    let selectedVod = null;
    let selectedTimeline = null;
    let showVodModal = false;
    let showTimelineModal = false;
    let fetchingVodId = null;
    let playVideo = false;
    let selectedType = "lives";
    let downloadProgress = null;
    let downloadingUrl = null;
    function formatDate(dateStr) {
      if (!dateStr) return "Unknown Date";
      return new Date(dateStr).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    function isVideo(url) {
      if (!url) return false;
      const cleanUrl = url.split("?")[0].toLowerCase();
      return cleanUrl.endsWith(".mp4") || cleanUrl.endsWith(".m3u8") || cleanUrl.endsWith(".mov") || cleanUrl.endsWith(".webm");
    }
    let isLoadMoreLoading = false;
    let hasMore = true;
    async function queryMemberData(memberName, append = false) {
      if (append) isLoadMoreLoading = true;
      else {
        isLoading = true;
        resultData = null;
        hasMore = true;
      }
      try {
        const currentSkip = append && resultData ? (selectedType === "posts" ? resultData.posts?.length : resultData.lives?.length) || 0 : 0;
        let lastId;
        if (append && resultData) {
          if (selectedType === "posts" && resultData.posts && resultData.posts.length > 0) ;
          else if (selectedType !== "posts" && resultData.lives && resultData.lives.length > 0) lastId = resultData.lives[resultData.lives.length - 1].id;
        }
        const response = await fetch("/api/downloader/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: memberName,
            type: selectedType,
            skip: currentSkip,
            take: 300,
            lastId
          })
        });
        const result = await response.json();
        if (response.ok) if (append && resultData) if (selectedType === "posts") ;
        else if (result.lives && result.lives.length > 0) {
          resultData.lives = [...resultData.lives || [], ...result.lives];
          if (result.lives.length < 20) hasMore = false;
        } else hasMore = false;
        else {
          resultData = result;
          if (selectedType === "posts") ;
          else if (resultData?.lives && resultData.lives.length < 20) hasMore = false;
          if (resultData?.directVod) {
            selectedVod = resultData.directVod;
            showVodModal = true;
          }
          if (resultData?.directTimeline) {
            selectedTimeline = resultData.directTimeline;
            showTimelineModal = true;
          }
        }
        else if (!append) resultData = { error: result.error || "Failed to query member data" };
        else toasts.add(result.error || "Failed to load more items", "error");
      } catch (err) {
        if (!append) resultData = { error: err.message || "An error occurred" };
        else toasts.add(err.message || "An error occurred", "error");
      } finally {
        isLoading = false;
        isLoadMoreLoading = false;
      }
    }
    async function handleMemberSelect(e) {
      const name = e.target.value;
      if (!name) return;
      searchQuery = name;
      await queryMemberData(name);
    }
    async function handleTypeChange() {
      if (searchQuery) await queryMemberData(searchQuery.trim());
    }
    $$renderer2.push(`<div class="page-shell svelte-16wwd3h"><section class="download-hero svelte-16wwd3h" aria-labelledby="download-title"><p class="download-hero__rule svelte-16wwd3h" aria-hidden="true">\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500</p> <p class="mono-label download-hero__kicker svelte-16wwd3h"><span class="bracket-muted svelte-16wwd3h" aria-hidden="true">[+]</span> Technical intelligence</p> <h1 id="download-title" class="ds-display-xl svelte-16wwd3h">Downloader</h1> <p class="ds-body-md download-hero__lede svelte-16wwd3h">Automated extraction and indexing of member broadcast infrastructure
			and media resources.</p> <p class="download-hero__rule download-hero__rule--dim svelte-16wwd3h" aria-hidden="true">\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500</p></section> <div class="downloader-controls-group svelte-16wwd3h"><div class="technical-select hairline-section svelte-16wwd3h"><span class="search-glyph ds-caption-md svelte-16wwd3h" aria-hidden="true">[o]</span> `);
    $$renderer2.select({
      value: selectedMemberId,
      onchange: handleMemberSelect,
      class: ""
    }, ($$renderer3) => {
      $$renderer3.option({
        value: "",
        class: ""
      }, ($$renderer4) => {
        $$renderer4.push(`-- Select Member --`);
      }, "svelte-16wwd3h");
      $$renderer3.push(`<!--[-->`);
      const each_array = ensure_array_like(data.members || []);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let member = each_array[$$index];
        $$renderer3.option({
          value: member.name,
          class: ""
        }, ($$renderer4) => {
          $$renderer4.push(`${escape_html(member.name)} (${escape_html(member.brand)})`);
        }, "svelte-16wwd3h");
      }
      $$renderer3.push(`<!--]-->`);
    }, "svelte-16wwd3h");
    $$renderer2.push(`</div> <div class="technical-select hairline-section svelte-16wwd3h"><span class="search-glyph ds-caption-md svelte-16wwd3h" aria-hidden="true">[t]</span> `);
    $$renderer2.select({
      value: selectedType,
      onchange: handleTypeChange,
      class: ""
    }, ($$renderer3) => {
      $$renderer3.option({
        value: "lives",
        class: ""
      }, ($$renderer4) => {
        $$renderer4.push(`Lives`);
      }, "svelte-16wwd3h");
      $$renderer3.option({
        value: "posts",
        class: ""
      }, ($$renderer4) => {
        $$renderer4.push(`Posts`);
      }, "svelte-16wwd3h");
    }, "svelte-16wwd3h");
    $$renderer2.push(`</div> <form class="playback-search-form svelte-16wwd3h"><div class="playback-search-field hairline-section svelte-16wwd3h"><span class="search-glyph ds-caption-md svelte-16wwd3h" aria-hidden="true">[~]</span> <input type="text" name="name"${attr("value", searchQuery)} placeholder="Or enter member name, alias, app URI endpoint\u2026" required="" autocomplete="off" class="svelte-16wwd3h"/> <button type="submit" class="button-primary ds-button-md svelte-16wwd3h"${attr("disabled", isLoading, true)}>`);
    if (isLoading) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="ds-busy svelte-16wwd3h" aria-hidden="true">[*]</span> Wait`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`Query`);
    }
    $$renderer2.push(`<!--]--></button></div></form></div> `);
    if (resultData?.error) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="banner-error hairline-section svelte-16wwd3h" role="alert"><span class="bracket-danger svelte-16wwd3h" aria-hidden="true">[!]</span> <span class="svelte-16wwd3h">System Error: ${escape_html(resultData.error)}</span></div>`);
    } else $$renderer2.push("<!--[-1-->");
    $$renderer2.push(`<!--]--> `);
    if (resultData?.lives) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="section-divider hairline-section svelte-16wwd3h"><h2 class="ds-heading-md section-title svelte-16wwd3h"><span class="bracket-accent svelte-16wwd3h" aria-hidden="true">[+]</span> ${escape_html(resultData.memberName)} Sessions</h2> <div class="mono-label svelte-16wwd3h"><span class="bracket-muted svelte-16wwd3h" aria-hidden="true">[#]</span> Total Nodes: ${escape_html(resultData.lives.length)}</div></div> <div class="technical-grid svelte-16wwd3h"><!--[-->`);
      const each_array_1 = ensure_array_like(resultData.lives);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let live = each_array_1[$$index_1];
        $$renderer2.push(`<article class="media-card-co hairline-section svelte-16wwd3h"><div class="card-media svelte-16wwd3h"><img${attr("src", live.thumbnailImageUrl)}${attr("alt", live.title)} loading="lazy" class="svelte-16wwd3h"/> <button class="play-trigger svelte-16wwd3h"${attr("disabled", fetchingVodId === live.id, true)} aria-label="Initialize VOD">`);
        if (fetchingVodId === live.id) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<span class="ds-busy svelte-16wwd3h" aria-hidden="true">[*]</span>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<span aria-hidden="true" class="svelte-16wwd3h">[>]</span>`);
        }
        $$renderer2.push(`<!--]--></button></div> <div class="card-info svelte-16wwd3h"><div class="mono-label svelte-16wwd3h">${escape_html(formatDate(live.publishedAt))}</div></div></article>`);
      }
      $$renderer2.push(`<!--]--></div> `);
      if (hasMore && searchQuery) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="load-more-container svelte-16wwd3h"><button type="button" class="button-secondary load-more-btn svelte-16wwd3h"${attr("disabled", isLoadMoreLoading, true)}>`);
        if (isLoadMoreLoading) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<span class="ds-busy svelte-16wwd3h" aria-hidden="true">[*]</span> Loading...`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`Load More`);
        }
        $$renderer2.push(`<!--]--></button></div>`);
      } else $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<!--]-->`);
    } else if (resultData?.posts) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<div class="section-divider hairline-section svelte-16wwd3h"><h2 class="ds-heading-md section-title svelte-16wwd3h"><span class="bracket-accent svelte-16wwd3h" aria-hidden="true">[+]</span> ${escape_html(resultData.memberName)} Posts</h2> <div class="mono-label svelte-16wwd3h"><span class="bracket-muted svelte-16wwd3h" aria-hidden="true">[#]</span> Total Nodes: ${escape_html(resultData.posts.length)}</div></div> <div class="technical-grid svelte-16wwd3h"><!--[-->`);
      const each_array_2 = ensure_array_like(resultData.posts);
      for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
        let post = each_array_2[$$index_2];
        $$renderer2.push(`<article class="media-card-co hairline-section svelte-16wwd3h"><div class="card-media svelte-16wwd3h">`);
        if (post.thumbnail) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<img${attr("src", post.thumbnail)}${attr("alt", post.title || "Post")} loading="lazy" class="svelte-16wwd3h"/>`);
        } else if (post.images && post.images.length > 0) {
          $$renderer2.push("<!--[1-->");
          $$renderer2.push(`<img${attr("src", post.images[0])}${attr("alt", post.title || "Post")} loading="lazy" class="svelte-16wwd3h"/>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<div class="card-media-placeholder svelte-16wwd3h"><span aria-hidden="true" style="font-size: 2rem; opacity: 0.3;" class="svelte-16wwd3h">[img]</span></div>`);
        }
        $$renderer2.push(`<!--]--> <button class="play-trigger svelte-16wwd3h"${attr("disabled", fetchingVodId === String(post.contentId), true)} aria-label="View Post Details">`);
        if (fetchingVodId === String(post.contentId)) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<span class="ds-busy svelte-16wwd3h" aria-hidden="true">[*]</span>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<span aria-hidden="true" class="svelte-16wwd3h">[>]</span>`);
        }
        $$renderer2.push(`<!--]--></button></div> <div class="card-info svelte-16wwd3h"><div class="mono-label svelte-16wwd3h">${escape_html(formatDate(post.publishedAt))}</div> <div style="margin-top: 0.25rem;" class="svelte-16wwd3h"><span class="ds-caption-md item-badge svelte-16wwd3h" style="background: var(--surface-soft); border: 1px solid var(--hairline-strong); padding: 0.1rem 0.35rem; border-radius: var(--radius-interactive); font-size: 10px; color: var(--ash);">${escape_html(post.itemType.replace("content-member-", "").toUpperCase())}</span></div> <h3 class="technical-title ds-body-sm svelte-16wwd3h" style="margin-top: 0.5rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; font-weight: normal; font-size: 0.85rem; line-height: 1.4; color: var(--body);"${attr("title", post.title)}>${escape_html(post.title || "No description text provided.")}</h3></div></article>`);
      }
      $$renderer2.push(`<!--]--></div> `);
      if (hasMore && searchQuery) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="load-more-container svelte-16wwd3h"><button type="button" class="button-secondary load-more-btn svelte-16wwd3h"${attr("disabled", isLoadMoreLoading, true)}>`);
        if (isLoadMoreLoading) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<span class="ds-busy svelte-16wwd3h" aria-hidden="true">[*]</span> Loading...`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`Load More`);
        }
        $$renderer2.push(`<!--]--></button></div>`);
      } else $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<!--]-->`);
    } else if (!isLoading && !resultData?.error) {
      $$renderer2.push("<!--[2-->");
      $$renderer2.push(`<div class="empty-state hairline-section svelte-16wwd3h"><h3 class="ds-heading-md svelte-16wwd3h"><span class="bracket-muted svelte-16wwd3h" aria-hidden="true">[-]</span> Null Response</h3> <p class="ds-body-md empty-copy svelte-16wwd3h">Enter a valid member identifier to begin technical extraction.</p></div>`);
    } else $$renderer2.push("<!--[-1-->");
    $$renderer2.push(`<!--]--></div> `);
    if (showVodModal && selectedVod) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="modal-overlay svelte-16wwd3h" role="presentation"><div class="contact-form-card hairline-section svelte-16wwd3h" role="presentation"><div class="form-header svelte-16wwd3h"><div class="svelte-16wwd3h"><span class="mono-label svelte-16wwd3h">VOD_RESOURCE</span> <h2 class="ds-heading-md modal-heading svelte-16wwd3h">Playback Records</h2></div> <button class="close-trigger svelte-16wwd3h" aria-label="Close modal"><span aria-hidden="true" class="svelte-16wwd3h">[x]</span></button></div> <div class="technical-details svelte-16wwd3h"><div${attr_class("detail-row svelte-16wwd3h", void 0, { "is-playing": playVideo })}><div${attr_class("media-preview hairline-section svelte-16wwd3h", void 0, { "is-playing": playVideo })}>`);
      $$renderer2.push("<!--[-1-->");
      if (isVideo(selectedVod.thumbnail)) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<video${attr("src", selectedVod.thumbnail)} muted="" loop="" autoplay="" class="preview-video svelte-16wwd3h"></video>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<img${attr("src", selectedVod.thumbnail)} alt="Thumbnail" class="svelte-16wwd3h"/>`);
      }
      $$renderer2.push(`<!--]--> <button class="play-overlay svelte-16wwd3h" aria-label="Play video"><span aria-hidden="true" class="svelte-16wwd3h">[>]</span></button>`);
      $$renderer2.push(`<!--]--></div> <div class="detail-content svelte-16wwd3h"><h3 class="technical-title ds-heading-md svelte-16wwd3h">${escape_html(selectedVod.fileName)}</h3> <p class="body-small ds-caption-md svelte-16wwd3h">${escape_html(selectedVod.info?.description || "Technical description unavailable for this node.")}</p></div></div> `);
      if (downloadingUrl === selectedVod.resourceUrl && downloadProgress !== null) ;
      else $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<!--]--> <div class="modal-actions-co svelte-16wwd3h"><a${attr("href", selectedVod.resourceUrl)} target="_blank" class="button-secondary ds-button-md svelte-16wwd3h" rel="noreferrer">Open stream</a> <button class="button-primary ds-button-md svelte-16wwd3h"${attr("disabled", false, true)}>`);
      if (downloadingUrl === selectedVod.resourceUrl) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span class="ds-busy svelte-16wwd3h" aria-hidden="true">[*]</span> ${escape_html(downloadProgress)}%`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<span aria-hidden="true" class="svelte-16wwd3h">[v]</span> Download MP4`);
      }
      $$renderer2.push(`<!--]--></button></div></div></div></div>`);
    } else $$renderer2.push("<!--[-1-->");
    $$renderer2.push(`<!--]--> `);
    if (showTimelineModal && selectedTimeline) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="modal-overlay svelte-16wwd3h" role="presentation"><div class="contact-form-card hairline-section svelte-16wwd3h" role="presentation"><div class="form-header svelte-16wwd3h"><div class="svelte-16wwd3h"><span class="mono-label svelte-16wwd3h">TIMELINE_OBJECT</span> <h2 class="ds-heading-md modal-heading svelte-16wwd3h">Extraction Results</h2></div> <button class="close-trigger svelte-16wwd3h" aria-label="Close modal"><span aria-hidden="true" class="svelte-16wwd3h">[x]</span></button></div> <div class="technical-details svelte-16wwd3h"><div${attr_class("detail-row svelte-16wwd3h", void 0, { "is-playing": playVideo })}>`);
      if (selectedTimeline.thumbnail || selectedTimeline.resourceUrl) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div${attr_class("media-preview hairline-section svelte-16wwd3h", void 0, { "is-playing": playVideo })}>`);
        $$renderer2.push("<!--[-1-->");
        if (selectedTimeline.thumbnail) {
          $$renderer2.push("<!--[0-->");
          if (isVideo(selectedTimeline.thumbnail)) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<video${attr("src", selectedTimeline.thumbnail)} muted="" loop="" autoplay="" class="preview-video svelte-16wwd3h"></video>`);
          } else {
            $$renderer2.push("<!--[-1-->");
            $$renderer2.push(`<img${attr("src", selectedTimeline.thumbnail)} alt="Thumbnail" class="svelte-16wwd3h"/>`);
          }
          $$renderer2.push(`<!--]-->`);
        } else $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<!--]--> `);
        if (selectedTimeline.resourceUrl) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<button class="play-overlay svelte-16wwd3h" aria-label="Play video"><span aria-hidden="true" class="svelte-16wwd3h">[>]</span></button>`);
        } else $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<!--]-->`);
        $$renderer2.push(`<!--]--></div>`);
      } else $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<!--]--> <div class="detail-content svelte-16wwd3h"><h3 class="technical-title ds-heading-md svelte-16wwd3h">${escape_html(selectedTimeline.fileName)}</h3> <p class="body-small ds-caption-md svelte-16wwd3h">${escape_html(selectedTimeline.info?.contentText ?? selectedTimeline.info?.content?.contentText ?? selectedTimeline.info?.description ?? selectedTimeline.info?.caption ?? "Metadata empty.")}</p></div></div> `);
      if (selectedTimeline.resourceUrl) {
        $$renderer2.push("<!--[0-->");
        if (downloadingUrl === selectedTimeline.resourceUrl && downloadProgress !== null) ;
        else $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<!--]--> <div class="modal-actions-co svelte-16wwd3h"><a${attr("href", selectedTimeline.resourceUrl)} target="_blank" class="button-secondary ds-button-md svelte-16wwd3h" rel="noreferrer">Open stream</a> <button class="button-primary ds-button-md svelte-16wwd3h"${attr("disabled", false, true)}>`);
        if (downloadingUrl === selectedTimeline.resourceUrl) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<span class="ds-busy svelte-16wwd3h" aria-hidden="true">[*]</span> ${escape_html(downloadProgress)}%`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<span aria-hidden="true" class="svelte-16wwd3h">[v]</span> Download MP4`);
        }
        $$renderer2.push(`<!--]--></button></div>`);
      } else $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<!--]--> `);
      if (selectedTimeline.images.length > 0) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="image-inventory hairline-section svelte-16wwd3h"><span class="mono-label inventory-label svelte-16wwd3h"><span class="bracket-muted svelte-16wwd3h" aria-hidden="true">[+]</span> Visual Assets (${escape_html(selectedTimeline.images.length)})</span> <div class="inventory-grid svelte-16wwd3h"><!--[-->`);
        const each_array_3 = ensure_array_like(selectedTimeline.images);
        for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
          let img = each_array_3[$$index_3];
          $$renderer2.push(`<div class="inventory-item hairline-section svelte-16wwd3h">`);
          if (isVideo(img)) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<video${attr("src", img)} muted="" loop="" autoplay="" class="inventory-video svelte-16wwd3h"></video>`);
          } else {
            $$renderer2.push("<!--[-1-->");
            $$renderer2.push(`<img${attr("src", img)} alt="Asset" loading="lazy" class="svelte-16wwd3h"/>`);
          }
          $$renderer2.push(`<!--]--> <div class="item-overlay svelte-16wwd3h"><button aria-label="Copy image URL" class="overlay-btn svelte-16wwd3h"><span aria-hidden="true" class="svelte-16wwd3h">[c]</span></button> <a${attr("href", img)} target="_blank" aria-label="Open image in new tab" class="overlay-btn svelte-16wwd3h"><span aria-hidden="true" class="svelte-16wwd3h">[^]</span></a></div></div>`);
        }
        $$renderer2.push(`<!--]--></div></div>`);
      } else $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<!--]--></div></div></div>`);
    } else $$renderer2.push("<!--[-1-->");
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
