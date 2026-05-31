// build/server/chunks/dev-DRV-q2AU.js
var MAX_ARRAY_LEN = 2 ** 32 - 1;
var MAX_ARRAY_INDEX = MAX_ARRAY_LEN - 1;
var object_proto_names = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
var index_of = Array.prototype.indexOf;
var includes = Array.prototype.includes;
var object_prototype = Object.prototype;
var array_prototype = Array.prototype;
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
var whitespace = [..." 	\n\r\f\xA0\v\uFEFF"];
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
export {
  toasts as t
};
