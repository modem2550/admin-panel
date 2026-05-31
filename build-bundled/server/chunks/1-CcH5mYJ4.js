var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// build/server/chunks/dev-DRV-q2AU.js
function is_primitive(thing) {
  return thing === null || typeof thing !== "object" && typeof thing !== "function";
}
function is_plain_object(thing) {
  const proto = Object.getPrototypeOf(thing);
  return proto === Object.prototype || proto === null || Object.getPrototypeOf(proto) === null || Object.getOwnPropertyNames(proto).sort().join("\0") === object_proto_names;
}
function get_type(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}
function get_escaped_char(char) {
  switch (char) {
    case '"':
      return '\\"';
    case "<":
      return "\\u003C";
    case "\\":
      return "\\\\";
    case "\n":
      return "\\n";
    case "\r":
      return "\\r";
    case "	":
      return "\\t";
    case "\b":
      return "\\b";
    case "\f":
      return "\\f";
    case "\u2028":
      return "\\u2028";
    case "\u2029":
      return "\\u2029";
    default:
      return char < " " ? `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}` : "";
  }
}
function stringify_string(str) {
  let result = "";
  let last_pos = 0;
  const len = str.length;
  for (let i = 0; i < len; i += 1) {
    const char = str[i];
    const replacement = get_escaped_char(char);
    if (replacement) {
      result += str.slice(last_pos, i) + replacement;
      last_pos = i + 1;
    }
  }
  return `"${last_pos === 0 ? str : result + str.slice(last_pos)}"`;
}
function enumerable_symbols(object) {
  return Object.getOwnPropertySymbols(object).filter(
    (symbol) => Object.getOwnPropertyDescriptor(object, symbol).enumerable
  );
}
function stringify_key(key) {
  return is_identifier.test(key) ? "." + key : "[" + JSON.stringify(key) + "]";
}
function is_valid_array_index(n) {
  if (!Number.isInteger(n)) return false;
  if (n < 0) return false;
  if (n > MAX_ARRAY_INDEX) return false;
  return true;
}
function is_valid_array_index_string(s) {
  if (s.length === 0) return false;
  if (s.length > 1 && s.charCodeAt(0) === 48) return false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 48 || c > 57) return false;
  }
  return is_valid_array_index(+s);
}
function valid_array_indices(array) {
  const keys = Object.keys(array);
  for (var i = keys.length - 1; i >= 0; i--) {
    if (is_valid_array_index_string(keys[i])) {
      break;
    }
  }
  keys.length = i + 1;
  return keys;
}
function uneval(value, replacer) {
  const counts = /* @__PURE__ */ new Map();
  const keys = [];
  const custom = /* @__PURE__ */ new Map();
  function walk(thing) {
    if (!is_primitive(thing)) {
      if (counts.has(thing)) {
        counts.set(thing, counts.get(thing) + 1);
        return;
      }
      counts.set(thing, 1);
      if (replacer) {
        const str2 = replacer(thing, (value2) => uneval(value2, replacer));
        if (typeof str2 === "string") {
          custom.set(thing, str2);
          return;
        }
      }
      if (typeof thing === "function") {
        throw new DevalueError(`Cannot stringify a function`, keys, thing, value);
      }
      const type = get_type(thing);
      switch (type) {
        case "Number":
        case "BigInt":
        case "String":
        case "Boolean":
        case "Date":
        case "RegExp":
        case "URL":
        case "URLSearchParams":
          return;
        case "Array":
          thing.forEach((value2, i) => {
            keys.push(`[${i}]`);
            walk(value2);
            keys.pop();
          });
          break;
        case "Set":
          Array.from(thing).forEach(walk);
          break;
        case "Map":
          for (const [key, value2] of thing) {
            keys.push(`.get(${is_primitive(key) ? stringify_primitive(key) : "..."})`);
            walk(value2);
            keys.pop();
          }
          break;
        case "Int8Array":
        case "Uint8Array":
        case "Uint8ClampedArray":
        case "Int16Array":
        case "Uint16Array":
        case "Float16Array":
        case "Int32Array":
        case "Uint32Array":
        case "Float32Array":
        case "Float64Array":
        case "BigInt64Array":
        case "BigUint64Array":
        case "DataView":
          walk(thing.buffer);
          return;
        case "ArrayBuffer":
          return;
        case "Temporal.Duration":
        case "Temporal.Instant":
        case "Temporal.PlainDate":
        case "Temporal.PlainTime":
        case "Temporal.PlainDateTime":
        case "Temporal.PlainMonthDay":
        case "Temporal.PlainYearMonth":
        case "Temporal.ZonedDateTime":
          return;
        default:
          if (!is_plain_object(thing)) {
            throw new DevalueError(`Cannot stringify arbitrary non-POJOs`, keys, thing, value);
          }
          if (enumerable_symbols(thing).length > 0) {
            throw new DevalueError(`Cannot stringify POJOs with symbolic keys`, keys, thing, value);
          }
          for (const key of Object.keys(thing)) {
            if (key === "__proto__") {
              throw new DevalueError(
                `Cannot stringify objects with __proto__ keys`,
                keys,
                thing,
                value
              );
            }
            keys.push(stringify_key(key));
            walk(thing[key]);
            keys.pop();
          }
      }
    } else if (typeof thing === "symbol") {
      throw new DevalueError(`Cannot stringify a Symbol primitive`, keys, thing, value);
    }
  }
  walk(value);
  const names = /* @__PURE__ */ new Map();
  Array.from(counts).filter((entry) => entry[1] > 1).sort((a, b) => b[1] - a[1]).forEach((entry, i) => {
    names.set(entry[0], get_name(i));
  });
  function stringify(thing) {
    if (names.has(thing)) {
      return names.get(thing);
    }
    if (is_primitive(thing)) {
      return stringify_primitive(thing);
    }
    if (custom.has(thing)) {
      return custom.get(thing);
    }
    const type = get_type(thing);
    switch (type) {
      case "Number":
      case "String":
      case "Boolean":
      case "BigInt":
        return `Object(${stringify(thing.valueOf())})`;
      case "RegExp":
        const { source: source2, flags: flags2 } = thing;
        return flags2 ? `new RegExp(${stringify_string(source2)},"${flags2}")` : `new RegExp(${stringify_string(source2)})`;
      case "Date":
        return `new Date(${thing.getTime()})`;
      case "URL":
        return `new URL(${stringify_string(thing.toString())})`;
      case "URLSearchParams":
        return `new URLSearchParams(${stringify_string(thing.toString())})`;
      case "Array": {
        let has_holes = false;
        let result = "[";
        for (let i = 0; i < thing.length; i += 1) {
          if (i > 0) result += ",";
          if (Object.hasOwn(thing, i)) {
            result += stringify(thing[i]);
          } else if (!has_holes) {
            const populated_keys = valid_array_indices(
              /** @type {any[]} */
              thing
            );
            const population = populated_keys.length;
            const d = String(thing.length).length;
            const hole_cost = thing.length + 2;
            const sparse_cost = 25 + d + population * (d + 2);
            if (hole_cost > sparse_cost) {
              const entries = populated_keys.map((k) => `${k}:${stringify(thing[k])}`).join(",");
              return `Object.assign(Array(${thing.length}),{${entries}})`;
            }
            has_holes = true;
            i -= 1;
          }
        }
        const tail = thing.length === 0 || thing.length - 1 in thing ? "" : ",";
        return result + tail + "]";
      }
      case "Set":
      case "Map":
        return `new ${type}([${Array.from(thing).map(stringify).join(",")}])`;
      case "Int8Array":
      case "Uint8Array":
      case "Uint8ClampedArray":
      case "Int16Array":
      case "Uint16Array":
      case "Float16Array":
      case "Int32Array":
      case "Uint32Array":
      case "Float32Array":
      case "Float64Array":
      case "BigInt64Array":
      case "BigUint64Array": {
        let str2 = `new ${type}`;
        if (!names.has(thing.buffer)) {
          const array = new thing.constructor(thing.buffer);
          str2 += `([${array}])`;
        } else {
          str2 += `(${stringify(thing.buffer)})`;
        }
        if (thing.byteLength !== thing.buffer.byteLength) {
          const start = thing.byteOffset / thing.BYTES_PER_ELEMENT;
          const end = start + thing.length;
          str2 += `.subarray(${start},${end})`;
        }
        return str2;
      }
      case "DataView": {
        let str2 = `new DataView`;
        if (!names.has(thing.buffer)) {
          str2 += `(new Uint8Array([${new Uint8Array(thing.buffer)}]).buffer`;
        } else {
          str2 += `(${stringify(thing.buffer)}`;
        }
        if (thing.byteLength !== thing.buffer.byteLength) {
          str2 += `,${thing.startOffset},${thing.byteLength}`;
        }
        return str2 + ")";
      }
      case "ArrayBuffer": {
        const ui8 = new Uint8Array(thing);
        return `new Uint8Array([${ui8.toString()}]).buffer`;
      }
      case "Temporal.Duration":
      case "Temporal.Instant":
      case "Temporal.PlainDate":
      case "Temporal.PlainTime":
      case "Temporal.PlainDateTime":
      case "Temporal.PlainMonthDay":
      case "Temporal.PlainYearMonth":
      case "Temporal.ZonedDateTime":
        return `${type}.from(${stringify_string(thing.toString())})`;
      default:
        const keys2 = Object.keys(thing);
        const obj = keys2.map((key) => `${safe_key(key)}:${stringify(thing[key])}`).join(",");
        const proto = Object.getPrototypeOf(thing);
        if (proto === null) {
          return keys2.length > 0 ? `{${obj},__proto__:null}` : `{__proto__:null}`;
        }
        return `{${obj}}`;
    }
  }
  const str = stringify(value);
  if (names.size) {
    const params = [];
    const statements = [];
    const values = [];
    names.forEach((name, thing) => {
      params.push(name);
      if (custom.has(thing)) {
        values.push(
          /** @type {string} */
          custom.get(thing)
        );
        return;
      }
      if (is_primitive(thing)) {
        values.push(stringify_primitive(thing));
        return;
      }
      const type = get_type(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
        case "BigInt":
          values.push(`Object(${stringify(thing.valueOf())})`);
          break;
        case "RegExp":
          const { source: source2, flags: flags2 } = thing;
          const regexp = flags2 ? `new RegExp(${stringify_string(source2)},"${flags2}")` : `new RegExp(${stringify_string(source2)})`;
          values.push(regexp);
          break;
        case "Date":
          values.push(`new Date(${thing.getTime()})`);
          break;
        case "URL":
          values.push(`new URL(${stringify_string(thing.toString())})`);
          break;
        case "URLSearchParams":
          values.push(`new URLSearchParams(${stringify_string(thing.toString())})`);
          break;
        case "Array":
          values.push(`Array(${thing.length})`);
          thing.forEach((v, i) => {
            statements.push(`${name}[${i}]=${stringify(v)}`);
          });
          break;
        case "Set":
          values.push(`new Set`);
          statements.push(
            `${name}.${Array.from(thing).map((v) => `add(${stringify(v)})`).join(".")}`
          );
          break;
        case "Map":
          values.push(`new Map`);
          statements.push(
            `${name}.${Array.from(thing).map(([k, v]) => `set(${stringify(k)}, ${stringify(v)})`).join(".")}`
          );
          break;
        case "Int8Array":
        case "Uint8Array":
        case "Uint8ClampedArray":
        case "Int16Array":
        case "Uint16Array":
        case "Float16Array":
        case "Int32Array":
        case "Uint32Array":
        case "Float32Array":
        case "Float64Array":
        case "BigInt64Array":
        case "BigUint64Array": {
          let str2 = `new ${type}`;
          if (!names.has(thing.buffer)) {
            const array = new thing.constructor(thing.buffer);
            str2 += `([${array}])`;
          } else {
            str2 += `(${stringify(thing.buffer)})`;
          }
          if (thing.byteLength !== thing.buffer.byteLength) {
            const start = thing.byteOffset / thing.BYTES_PER_ELEMENT;
            const end = start + thing.length;
            str2 += `.subarray(${start},${end})`;
          }
          values.push(`{}`);
          statements.push(`${name}=${str2}`);
          break;
        }
        case "DataView": {
          let str2 = `new DataView`;
          if (!names.has(thing.buffer)) {
            str2 += `(new Uint8Array([${new Uint8Array(thing.buffer)}]).buffer`;
          } else {
            str2 += `(${stringify(thing.buffer)}`;
          }
          if (thing.byteLength !== thing.buffer.byteLength) {
            str2 += `,${thing.byteOffset},${thing.byteLength}`;
          }
          str2 += ")";
          values.push(`{}`);
          statements.push(`${name}=${str2}`);
          break;
        }
        case "ArrayBuffer":
          values.push(`new Uint8Array([${new Uint8Array(thing)}]).buffer`);
          break;
        default:
          values.push(Object.getPrototypeOf(thing) === null ? "Object.create(null)" : "{}");
          Object.keys(thing).forEach((key) => {
            statements.push(`${name}${safe_prop(key)}=${stringify(thing[key])}`);
          });
      }
    });
    statements.push(`return ${str}`);
    return `(function(${params.join(",")}){${statements.join(";")}}(${values.join(",")}))`;
  } else {
    return str;
  }
}
function get_name(num) {
  let name = "";
  do {
    name = chars[num % chars.length] + name;
    num = ~~(num / chars.length) - 1;
  } while (num >= 0);
  return reserved.test(name) ? `${name}0` : name;
}
function escape_unsafe_char(c) {
  return escaped[c] || c;
}
function escape_unsafe_chars(str) {
  return str.replace(unsafe_chars, escape_unsafe_char);
}
function safe_key(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? key : escape_unsafe_chars(JSON.stringify(key));
}
function safe_prop(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? `.${key}` : `[${escape_unsafe_chars(JSON.stringify(key))}]`;
}
function stringify_primitive(thing) {
  const type = typeof thing;
  if (type === "string") return stringify_string(thing);
  if (thing === void 0) return "void 0";
  if (thing === 0 && 1 / thing < 0) return "-0";
  const str = String(thing);
  if (type === "number") return str.replace(/^(-)?0\./, "$1.");
  if (type === "bigint") return thing + "n";
  return str;
}
function r(e) {
  var t, f, n = "";
  if ("string" == typeof e || "number" == typeof e) n += e;
  else if ("object" == typeof e) if (Array.isArray(e)) {
    var o = e.length;
    for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
  } else for (f in e) e[f] && (n && (n += " "), n += f);
  return n;
}
function clsx() {
  for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
  return n;
}
function experimental_async_required(name) {
  throw new Error(`https://svelte.dev/e/experimental_async_required`);
}
function lifecycle_outside_component(name) {
  throw new Error(`https://svelte.dev/e/lifecycle_outside_component`);
}
function missing_context() {
  throw new Error(`https://svelte.dev/e/missing_context`);
}
function await_invalid() {
  const error = new Error(`await_invalid
Encountered asynchronous work while rendering synchronously.
https://svelte.dev/e/await_invalid`);
  error.name = "Svelte error";
  throw error;
}
function hydratable_serialization_failed(key, stack) {
  const error = new Error(`hydratable_serialization_failed
Failed to serialize \`hydratable\` data for key \`${key}\`.

\`hydratable\` can serialize anything [\`uneval\` from \`devalue\`](https://npmjs.com/package/uneval) can, plus Promises.

Cause:
${stack}
https://svelte.dev/e/hydratable_serialization_failed`);
  error.name = "Svelte error";
  throw error;
}
function invalid_csp() {
  const error = new Error(`invalid_csp
\`csp.nonce\` was set while \`csp.hash\` was \`true\`. These options cannot be used simultaneously.
https://svelte.dev/e/invalid_csp`);
  error.name = "Svelte error";
  throw error;
}
function invalid_id_prefix() {
  const error = new Error(`invalid_id_prefix
The \`idPrefix\` option cannot include \`--\`.
https://svelte.dev/e/invalid_id_prefix`);
  error.name = "Svelte error";
  throw error;
}
function lifecycle_function_unavailable(name) {
  const error = new Error(`lifecycle_function_unavailable
\`${name}(...)\` is not available on the server
https://svelte.dev/e/lifecycle_function_unavailable`);
  error.name = "Svelte error";
  throw error;
}
function server_context_required() {
  const error = new Error(`server_context_required
Could not resolve \`render\` context.
https://svelte.dev/e/server_context_required`);
  error.name = "Svelte error";
  throw error;
}
function set_ssr_context(v) {
  ssr_context = v;
}
function createContext() {
  const key = {};
  return [() => {
    if (!hasContext(key)) missing_context();
    return getContext(key);
  }, (context2) => setContext(key, context2)];
}
function getContext(key) {
  return get_or_init_context_map().get(key);
}
function setContext(key, context2) {
  get_or_init_context_map().set(key, context2);
  return context2;
}
function hasContext(key) {
  return get_or_init_context_map().has(key);
}
function getAllContexts() {
  return get_or_init_context_map();
}
function get_or_init_context_map(name) {
  if (ssr_context === null) lifecycle_outside_component();
  return ssr_context.c ??= new Map(get_parent_context(ssr_context) || void 0);
}
function push$1(fn) {
  ssr_context = {
    p: ssr_context,
    c: null,
    r: null
  };
}
function pop$1() {
  ssr_context = ssr_context.p;
}
function get_parent_context(ssr_context2) {
  let parent = ssr_context2.p;
  while (parent !== null) {
    const context_map = parent.c;
    if (context_map !== null) return context_map;
    parent = parent.p;
  }
  return null;
}
function run(fn) {
  return fn();
}
function run_all(arr) {
  for (var i = 0; i < arr.length; i++) arr[i]();
}
function deferred() {
  var resolve;
  var reject;
  return {
    promise: new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    }),
    resolve,
    reject
  };
}
function abort() {
  controller?.abort(STALE_REACTION);
  controller = null;
}
function getAbortSignal() {
  return (controller ??= new AbortController()).signal;
}
function get_render_context() {
  const store = als?.getStore();
  server_context_required();
  return store;
}
function unresolved_hydratable(key, stack) {
  console.warn(`https://svelte.dev/e/unresolved_hydratable`);
}
function escape_html(value, is_attr) {
  const str = String(value ?? "");
  const pattern = is_attr ? ATTR_REGEX : CONTENT_REGEX;
  pattern.lastIndex = 0;
  let escaped2 = "";
  let last = 0;
  while (pattern.test(str)) {
    const i = pattern.lastIndex - 1;
    const ch = str[i];
    escaped2 += str.substring(last, i) + (ch === "&" ? "&amp;" : ch === '"' ? "&quot;" : "&lt;");
    last = i + 1;
  }
  return escaped2 + str.substring(last);
}
function attr(name, value, is_boolean = false) {
  if (name === "hidden" && value !== "until-found") is_boolean = true;
  if (value == null || !value && is_boolean) return "";
  const normalized = has_own_property.call(replacements, name) && replacements[name].get(value) || value;
  return ` ${name}${is_boolean ? `=""` : `="${escape_html(normalized, true)}"`}`;
}
function clsx$1(value) {
  if (typeof value === "object") return clsx(value);
  else return value ?? "";
}
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
function append_styles(styles, important = false) {
  var separator = important ? " !important;" : ";";
  var css = "";
  for (var key of Object.keys(styles)) {
    var value = styles[key];
    if (value != null && value !== "") css += " " + key + ": " + value + separator;
  }
  return css;
}
function to_css_name(name) {
  if (name[0] !== "-" || name[1] !== "-") return name.toLowerCase();
  return name;
}
function to_style(value, styles) {
  if (styles) {
    var new_style = "";
    var normal_styles;
    var important_styles;
    if (Array.isArray(styles)) {
      normal_styles = styles[0];
      important_styles = styles[1];
    } else normal_styles = styles;
    if (value) {
      value = String(value).replaceAll(/\s*\/\*.*?\*\/\s*/g, "").trim();
      var in_str = false;
      var in_apo = 0;
      var in_comment = false;
      var reserved_names = [];
      if (normal_styles) reserved_names.push(...Object.keys(normal_styles).map(to_css_name));
      if (important_styles) reserved_names.push(...Object.keys(important_styles).map(to_css_name));
      var start_index = 0;
      var name_index = -1;
      const len = value.length;
      for (var i = 0; i < len; i++) {
        var c = value[i];
        if (in_comment) {
          if (c === "/" && value[i - 1] === "*") in_comment = false;
        } else if (in_str) {
          if (in_str === c) in_str = false;
        } else if (c === "/" && value[i + 1] === "*") in_comment = true;
        else if (c === '"' || c === "'") in_str = c;
        else if (c === "(") in_apo++;
        else if (c === ")") in_apo--;
        if (!in_comment && in_str === false && in_apo === 0) {
          if (c === ":" && name_index === -1) name_index = i;
          else if (c === ";" || i === len - 1) {
            if (name_index !== -1) {
              var name = to_css_name(value.substring(start_index, name_index).trim());
              if (!reserved_names.includes(name)) {
                if (c !== ";") i++;
                var property = value.substring(start_index, i).trim();
                new_style += " " + property + ";";
              }
            }
            start_index = i + 1;
            name_index = -1;
          }
        }
      }
    }
    if (normal_styles) new_style += append_styles(normal_styles);
    if (important_styles) new_style += append_styles(important_styles, true);
    new_style = new_style.trim();
    return new_style === "" ? null : new_style;
  }
  return value == null ? null : String(value);
}
function effect_update_depth_exceeded() {
  throw new Error(`https://svelte.dev/e/effect_update_depth_exceeded`);
}
function hydration_failed() {
  throw new Error(`https://svelte.dev/e/hydration_failed`);
}
function state_descriptors_fixed() {
  throw new Error(`https://svelte.dev/e/state_descriptors_fixed`);
}
function state_prototype_fixed() {
  throw new Error(`https://svelte.dev/e/state_prototype_fixed`);
}
function state_unsafe_mutation() {
  throw new Error(`https://svelte.dev/e/state_unsafe_mutation`);
}
function svelte_boundary_reset_onerror() {
  throw new Error(`https://svelte.dev/e/svelte_boundary_reset_onerror`);
}
function derived_inert() {
  console.warn(`https://svelte.dev/e/derived_inert`);
}
function hydration_mismatch(location) {
  console.warn(`https://svelte.dev/e/hydration_mismatch`);
}
function svelte_boundary_reset_noop() {
  console.warn(`https://svelte.dev/e/svelte_boundary_reset_noop`);
}
function set_hydrating(value) {
  hydrating = value;
}
function set_hydrate_node(node) {
  if (node === null) {
    hydration_mismatch();
    throw HYDRATION_ERROR;
  }
  return hydrate_node = node;
}
function hydrate_next() {
  return set_hydrate_node(get_next_sibling(hydrate_node));
}
function next(count = 1) {
  if (hydrating) {
    var i = count;
    var node = hydrate_node;
    while (i--) node = get_next_sibling(node);
    hydrate_node = node;
  }
}
function skip_nodes(remove = true) {
  var depth = 0;
  var node = hydrate_node;
  while (true) {
    if (node.nodeType === 8) {
      var data = node.data;
      if (data === "]") {
        if (depth === 0) return node;
        depth -= 1;
      } else if (data === "[" || data === "[!" || data[0] === "[" && !isNaN(Number(data.slice(1)))) depth += 1;
    }
    var next2 = get_next_sibling(node);
    if (remove) node.remove();
    node = next2;
  }
}
function equals(value) {
  return value === this.v;
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || a !== null && typeof a === "object" || typeof a === "function";
}
function safe_equals(value) {
  return !safe_not_equal(value, this.v);
}
function set_component_context(context2) {
  component_context = context2;
}
function push(props, runes = false, fn) {
  component_context = {
    p: component_context,
    i: false,
    c: null,
    e: null,
    s: props,
    x: null,
    r: active_effect,
    l: null
  };
}
function pop(component2) {
  var context2 = component_context;
  var effects = context2.e;
  if (effects !== null) {
    context2.e = null;
    for (var fn of effects) create_user_effect(fn);
  }
  context2.i = true;
  component_context = context2.p;
  return {};
}
function is_runes() {
  return true;
}
function run_micro_tasks() {
  var tasks = micro_tasks;
  micro_tasks = [];
  run_all(tasks);
}
function queue_micro_task(fn) {
  if (micro_tasks.length === 0 && !is_flushing_sync) {
    var tasks = micro_tasks;
    queueMicrotask(() => {
      if (tasks === micro_tasks) run_micro_tasks();
    });
  }
  micro_tasks.push(fn);
}
function flush_tasks() {
  while (micro_tasks.length > 0) run_micro_tasks();
}
function handle_error(error) {
  var effect = active_effect;
  if (effect === null) {
    active_reaction.f |= ERROR_VALUE;
    return error;
  }
  if ((effect.f & 32768) === 0 && (effect.f & 4) === 0) throw error;
  invoke_error_boundary(error, effect);
}
function invoke_error_boundary(error, effect) {
  while (effect !== null) {
    if ((effect.f & 128) !== 0) {
      if ((effect.f & 32768) === 0) throw error;
      try {
        effect.b.error(error);
        return;
      } catch (e) {
        error = e;
      }
    }
    effect = effect.parent;
  }
  throw error;
}
function set_signal_status(signal, status) {
  signal.f = signal.f & STATUS_MASK | status;
}
function update_derived_status(derived2) {
  if ((derived2.f & 512) !== 0 || derived2.deps === null) set_signal_status(derived2, CLEAN);
  else set_signal_status(derived2, MAYBE_DIRTY);
}
function clear_marked(deps) {
  if (deps === null) return;
  for (const dep of deps) {
    if ((dep.f & 2) === 0 || (dep.f & 65536) === 0) continue;
    dep.f ^= WAS_MARKED;
    clear_marked(
      /** @type {Derived} */
      dep.deps
    );
  }
}
function defer_effect(effect, dirty_effects, maybe_dirty_effects) {
  if ((effect.f & 2048) !== 0) dirty_effects.add(effect);
  else if ((effect.f & 4096) !== 0) maybe_dirty_effects.add(effect);
  clear_marked(effect.deps);
  set_signal_status(effect, CLEAN);
}
function flushSync(fn) {
  var was_flushing_sync = is_flushing_sync;
  is_flushing_sync = true;
  try {
    var result;
    if (fn) ;
    while (true) {
      flush_tasks();
      if (current_batch === null) return result;
      current_batch.flush();
    }
  } finally {
    is_flushing_sync = was_flushing_sync;
  }
}
function infinite_loop_guard() {
  try {
    effect_update_depth_exceeded();
  } catch (error) {
    invoke_error_boundary(error, last_scheduled_effect);
  }
}
function flush_queued_effects(effects) {
  var length = effects.length;
  if (length === 0) return;
  var i = 0;
  while (i < length) {
    var effect = effects[i++];
    if ((effect.f & 24576) === 0 && is_dirty(effect)) {
      eager_block_effects = /* @__PURE__ */ new Set();
      update_effect(effect);
      if (effect.deps === null && effect.first === null && effect.nodes === null && effect.teardown === null && effect.ac === null) unlink_effect(effect);
      if (eager_block_effects?.size > 0) {
        old_values.clear();
        for (const e of eager_block_effects) {
          if ((e.f & 24576) !== 0) continue;
          const ordered_effects = [e];
          let ancestor = e.parent;
          while (ancestor !== null) {
            if (eager_block_effects.has(ancestor)) {
              eager_block_effects.delete(ancestor);
              ordered_effects.push(ancestor);
            }
            ancestor = ancestor.parent;
          }
          for (let j = ordered_effects.length - 1; j >= 0; j--) {
            const e2 = ordered_effects[j];
            if ((e2.f & 24576) !== 0) continue;
            update_effect(e2);
          }
        }
        eager_block_effects.clear();
      }
    }
  }
  eager_block_effects = null;
}
function mark_effects(value, sources, marked, checked) {
  if (marked.has(value)) return;
  marked.add(value);
  if (value.reactions !== null) for (const reaction of value.reactions) {
    const flags2 = reaction.f;
    if ((flags2 & 2) !== 0) mark_effects(reaction, sources, marked, checked);
    else if ((flags2 & 4194320) !== 0 && (flags2 & 2048) === 0 && depends_on(reaction, sources, checked)) {
      set_signal_status(reaction, DIRTY);
      schedule_effect(reaction);
    }
  }
}
function depends_on(reaction, sources, checked) {
  const depends = checked.get(reaction);
  if (depends !== void 0) return depends;
  if (reaction.deps !== null) for (const dep of reaction.deps) {
    if (includes.call(sources, dep)) return true;
    if ((dep.f & 2) !== 0 && depends_on(dep, sources, checked)) {
      checked.set(dep, true);
      return true;
    }
  }
  checked.set(reaction, false);
  return false;
}
function schedule_effect(effect) {
  current_batch.schedule(effect);
}
function reset_branch(effect, tracked) {
  if ((effect.f & 32) !== 0 && (effect.f & 1024) !== 0) return;
  if ((effect.f & 2048) !== 0) tracked.d.push(effect);
  else if ((effect.f & 4096) !== 0) tracked.m.push(effect);
  set_signal_status(effect, CLEAN);
  var e = effect.first;
  while (e !== null) {
    reset_branch(e, tracked);
    e = e.next;
  }
}
function reset_all(effect) {
  set_signal_status(effect, CLEAN);
  var e = effect.first;
  while (e !== null) {
    reset_all(e);
    e = e.next;
  }
}
function createSubscriber(start) {
  let subscribers = 0;
  let version = source(0);
  let stop;
  return () => {
    if (effect_tracking()) {
      get(version);
      render_effect(() => {
        if (subscribers === 0) stop = untrack(() => start(() => increment(version)));
        subscribers += 1;
        return () => {
          queue_micro_task(() => {
            subscribers -= 1;
            if (subscribers === 0) {
              stop?.();
              stop = void 0;
              increment(version);
            }
          });
        };
      });
    }
  };
}
function boundary(node, props, children, transform_error) {
  new Boundary(node, props, children, transform_error);
}
function destroy_derived_effects(derived2) {
  var effects = derived2.effects;
  if (effects !== null) {
    derived2.effects = null;
    for (var i = 0; i < effects.length; i += 1) destroy_effect(effects[i]);
  }
}
function execute_derived(derived2) {
  var value;
  var prev_active_effect = active_effect;
  var parent = derived2.parent;
  if (!is_destroying_effect && parent !== null && (parent.f & 24576) !== 0) {
    derived_inert();
    return derived2.v;
  }
  set_active_effect(parent);
  try {
    derived2.f &= ~WAS_MARKED;
    destroy_derived_effects(derived2);
    value = update_reaction(derived2);
  } finally {
    set_active_effect(prev_active_effect);
  }
  return value;
}
function update_derived(derived2) {
  var value = execute_derived(derived2);
  if (!derived2.equals(value)) {
    derived2.wv = increment_write_version();
    if (!current_batch?.is_fork || derived2.deps === null) {
      if (current_batch !== null) current_batch.capture(derived2, value, true);
      else derived2.v = value;
      if (derived2.deps === null) {
        set_signal_status(derived2, CLEAN);
        return;
      }
    }
  }
  if (is_destroying_effect) return;
  if (batch_values !== null) {
    if (effect_tracking() || current_batch?.is_fork) batch_values.set(derived2, value);
  } else update_derived_status(derived2);
}
function freeze_derived_effects(derived2) {
  if (derived2.effects === null) return;
  for (const e of derived2.effects) if (e.teardown || e.ac) {
    e.teardown?.();
    e.ac?.abort(STALE_REACTION);
    e.teardown = noop;
    e.ac = null;
    remove_reactions(e, 0);
    destroy_effect_children(e);
  }
}
function unfreeze_derived_effects(derived2) {
  if (derived2.effects === null) return;
  for (const e of derived2.effects) if (e.teardown) update_effect(e);
}
function source(v, stack) {
  return {
    f: 0,
    v,
    reactions: null,
    equals,
    rv: 0,
    wv: 0
  };
}
function state(v, stack) {
  const s = source(v);
  push_reaction_value(s);
  return s;
}
function mutable_source(initial_value, immutable = false, trackable = true) {
  const s = source(initial_value);
  if (!immutable) s.equals = safe_equals;
  return s;
}
function set(source2, value, should_proxy = false) {
  if (active_reaction !== null && (!untracking || (active_reaction.f & 131072) !== 0) && is_runes() && (active_reaction.f & 4325394) !== 0 && (current_sources === null || !includes.call(current_sources, source2))) state_unsafe_mutation();
  return internal_set(source2, should_proxy ? proxy(value) : value, legacy_updates);
}
function internal_set(source2, value, updated_during_traversal = null) {
  if (!source2.equals(value)) {
    old_values.set(source2, is_destroying_effect ? value : source2.v);
    var batch = Batch.ensure();
    batch.capture(source2, value);
    if ((source2.f & 2) !== 0) {
      const derived2 = source2;
      if ((source2.f & 2048) !== 0) execute_derived(derived2);
      if (batch_values === null) update_derived_status(derived2);
    }
    source2.wv = increment_write_version();
    mark_reactions(source2, DIRTY, updated_during_traversal);
    if (active_effect !== null && (active_effect.f & 1024) !== 0 && (active_effect.f & 96) === 0) if (untracked_writes === null) set_untracked_writes([source2]);
    else untracked_writes.push(source2);
    if (!batch.is_fork && eager_effects.size > 0 && !eager_effects_deferred) flush_eager_effects();
  }
  return value;
}
function flush_eager_effects() {
  eager_effects_deferred = false;
  for (const effect of eager_effects) {
    if ((effect.f & 1024) !== 0) set_signal_status(effect, MAYBE_DIRTY);
    if (is_dirty(effect)) update_effect(effect);
  }
  eager_effects.clear();
}
function increment(source2) {
  set(source2, source2.v + 1);
}
function mark_reactions(signal, status, updated_during_traversal) {
  var reactions = signal.reactions;
  if (reactions === null) return;
  var length = reactions.length;
  for (var i = 0; i < length; i++) {
    var reaction = reactions[i];
    var flags2 = reaction.f;
    var not_dirty = (flags2 & DIRTY) === 0;
    if (not_dirty) set_signal_status(reaction, status);
    if ((flags2 & 2) !== 0) {
      var derived2 = reaction;
      batch_values?.delete(derived2);
      if ((flags2 & 65536) === 0) {
        if (flags2 & 512 && (active_effect === null || (active_effect.f & 2097152) === 0)) reaction.f |= WAS_MARKED;
        mark_reactions(derived2, MAYBE_DIRTY, updated_during_traversal);
      }
    } else if (not_dirty) {
      var effect = reaction;
      if ((flags2 & 16) !== 0 && eager_block_effects !== null) eager_block_effects.add(effect);
      if (updated_during_traversal !== null) updated_during_traversal.push(effect);
      else schedule_effect(effect);
    }
  }
}
function proxy(value) {
  if (typeof value !== "object" || value === null || STATE_SYMBOL in value) return value;
  const prototype = get_prototype_of(value);
  if (prototype !== object_prototype && prototype !== array_prototype) return value;
  var sources = /* @__PURE__ */ new Map();
  var is_proxied_array = is_array(value);
  var version = state(0);
  var parent_version = update_version;
  var with_parent = (fn) => {
    if (update_version === parent_version) return fn();
    var reaction = active_reaction;
    var version2 = update_version;
    set_active_reaction(null);
    set_update_version(parent_version);
    var result = fn();
    set_active_reaction(reaction);
    set_update_version(version2);
    return result;
  };
  if (is_proxied_array) sources.set("length", state(
    /** @type {any[]} */
    value.length
  ));
  return new Proxy(value, {
    defineProperty(_, prop, descriptor) {
      if (!("value" in descriptor) || descriptor.configurable === false || descriptor.enumerable === false || descriptor.writable === false) state_descriptors_fixed();
      var s = sources.get(prop);
      if (s === void 0) with_parent(() => {
        var s2 = state(descriptor.value);
        sources.set(prop, s2);
        return s2;
      });
      else set(s, descriptor.value, true);
      return true;
    },
    deleteProperty(target, prop) {
      var s = sources.get(prop);
      if (s === void 0) {
        if (prop in target) {
          const s2 = with_parent(() => state(UNINITIALIZED));
          sources.set(prop, s2);
          increment(version);
        }
      } else {
        set(s, UNINITIALIZED);
        increment(version);
      }
      return true;
    },
    get(target, prop, receiver) {
      if (prop === STATE_SYMBOL) return value;
      var s = sources.get(prop);
      var exists = prop in target;
      if (s === void 0 && (!exists || get_descriptor(target, prop)?.writable)) {
        s = with_parent(() => {
          return state(proxy(exists ? target[prop] : UNINITIALIZED));
        });
        sources.set(prop, s);
      }
      if (s !== void 0) {
        var v = get(s);
        return v === UNINITIALIZED ? void 0 : v;
      }
      return Reflect.get(target, prop, receiver);
    },
    getOwnPropertyDescriptor(target, prop) {
      var descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
      if (descriptor && "value" in descriptor) {
        var s = sources.get(prop);
        if (s) descriptor.value = get(s);
      } else if (descriptor === void 0) {
        var source2 = sources.get(prop);
        var value2 = source2?.v;
        if (source2 !== void 0 && value2 !== UNINITIALIZED) return {
          enumerable: true,
          configurable: true,
          value: value2,
          writable: true
        };
      }
      return descriptor;
    },
    has(target, prop) {
      if (prop === STATE_SYMBOL) return true;
      var s = sources.get(prop);
      var has = s !== void 0 && s.v !== UNINITIALIZED || Reflect.has(target, prop);
      if (s !== void 0 || active_effect !== null && (!has || get_descriptor(target, prop)?.writable)) {
        if (s === void 0) {
          s = with_parent(() => {
            return state(has ? proxy(target[prop]) : UNINITIALIZED);
          });
          sources.set(prop, s);
        }
        if (get(s) === UNINITIALIZED) return false;
      }
      return has;
    },
    set(target, prop, value2, receiver) {
      var s = sources.get(prop);
      var has = prop in target;
      if (is_proxied_array && prop === "length") for (var i = value2; i < s.v; i += 1) {
        var other_s = sources.get(i + "");
        if (other_s !== void 0) set(other_s, UNINITIALIZED);
        else if (i in target) {
          other_s = with_parent(() => state(UNINITIALIZED));
          sources.set(i + "", other_s);
        }
      }
      if (s === void 0) {
        if (!has || get_descriptor(target, prop)?.writable) {
          s = with_parent(() => state(void 0));
          set(s, proxy(value2));
          sources.set(prop, s);
        }
      } else {
        has = s.v !== UNINITIALIZED;
        var p = with_parent(() => proxy(value2));
        set(s, p);
      }
      var descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
      if (descriptor?.set) descriptor.set.call(receiver, value2);
      if (!has) {
        if (is_proxied_array && typeof prop === "string") {
          var ls = sources.get("length");
          var n = Number(prop);
          if (Number.isInteger(n) && n >= ls.v) set(ls, n + 1);
        }
        increment(version);
      }
      return true;
    },
    ownKeys(target) {
      get(version);
      var own_keys = Reflect.ownKeys(target).filter((key2) => {
        var source3 = sources.get(key2);
        return source3 === void 0 || source3.v !== UNINITIALIZED;
      });
      for (var [key, source2] of sources) if (source2.v !== UNINITIALIZED && !(key in target)) own_keys.push(key);
      return own_keys;
    },
    setPrototypeOf() {
      state_prototype_fixed();
    }
  });
}
function init_operations() {
  if ($window !== void 0) return;
  $window = window;
  var element_prototype = Element.prototype;
  var node_prototype = Node.prototype;
  var text_prototype = Text.prototype;
  first_child_getter = get_descriptor(node_prototype, "firstChild").get;
  next_sibling_getter = get_descriptor(node_prototype, "nextSibling").get;
  if (is_extensible(element_prototype)) {
    element_prototype.__click = void 0;
    element_prototype.__className = void 0;
    element_prototype.__attributes = null;
    element_prototype.__style = void 0;
    element_prototype.__e = void 0;
  }
  if (is_extensible(text_prototype)) text_prototype.__t = void 0;
}
function create_text(value = "") {
  return document.createTextNode(value);
}
function get_first_child(node) {
  return first_child_getter.call(node);
}
function get_next_sibling(node) {
  return next_sibling_getter.call(node);
}
function clear_text_content(node) {
  node.textContent = "";
}
function without_reactive_context(fn) {
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  set_active_reaction(null);
  set_active_effect(null);
  try {
    return fn();
  } finally {
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
  }
}
function push_effect(effect, parent_effect) {
  var parent_last = parent_effect.last;
  if (parent_last === null) parent_effect.last = parent_effect.first = effect;
  else {
    parent_last.next = effect;
    effect.prev = parent_last;
    parent_effect.last = effect;
  }
}
function create_effect(type, fn) {
  var parent = active_effect;
  if (parent !== null && (parent.f & 8192) !== 0) type |= INERT;
  var effect = {
    ctx: component_context,
    deps: null,
    nodes: null,
    f: type | DIRTY | 512,
    first: null,
    fn,
    last: null,
    next: null,
    parent,
    b: parent && parent.b,
    prev: null,
    teardown: null,
    wv: 0,
    ac: null
  };
  current_batch?.register_created_effect(effect);
  var e = effect;
  if ((type & 4) !== 0) if (collected_effects !== null) collected_effects.push(effect);
  else Batch.ensure().schedule(effect);
  else if (fn !== null) {
    try {
      update_effect(effect);
    } catch (e2) {
      destroy_effect(effect);
      throw e2;
    }
    if (e.deps === null && e.teardown === null && e.nodes === null && e.first === e.last && (e.f & 524288) === 0) {
      e = e.first;
      if ((type & 16) !== 0 && (type & 65536) !== 0 && e !== null) e.f |= EFFECT_TRANSPARENT;
    }
  }
  if (e !== null) {
    e.parent = parent;
    if (parent !== null) push_effect(e, parent);
    if (active_reaction !== null && (active_reaction.f & 2) !== 0 && (type & 64) === 0) {
      var derived2 = active_reaction;
      (derived2.effects ??= []).push(e);
    }
  }
  return effect;
}
function effect_tracking() {
  return active_reaction !== null && !untracking;
}
function create_user_effect(fn) {
  return create_effect(4 | USER_EFFECT, fn);
}
function component_root(fn) {
  Batch.ensure();
  const effect = create_effect(64 | EFFECT_PRESERVED, fn);
  return (options2 = {}) => {
    return new Promise((fulfil) => {
      if (options2.outro) pause_effect(effect, () => {
        destroy_effect(effect);
        fulfil(void 0);
      });
      else {
        destroy_effect(effect);
        fulfil(void 0);
      }
    });
  };
}
function render_effect(fn, flags2 = 0) {
  return create_effect(8 | flags2, fn);
}
function block(fn, flags2 = 0) {
  return create_effect(16 | flags2, fn);
}
function branch(fn) {
  return create_effect(32 | EFFECT_PRESERVED, fn);
}
function execute_effect_teardown(effect) {
  var teardown = effect.teardown;
  if (teardown !== null) {
    const previously_destroying_effect = is_destroying_effect;
    const previous_reaction = active_reaction;
    set_is_destroying_effect(true);
    set_active_reaction(null);
    try {
      teardown.call(null);
    } finally {
      set_is_destroying_effect(previously_destroying_effect);
      set_active_reaction(previous_reaction);
    }
  }
}
function destroy_effect_children(signal, remove_dom = false) {
  var effect = signal.first;
  signal.first = signal.last = null;
  while (effect !== null) {
    const controller2 = effect.ac;
    if (controller2 !== null) without_reactive_context(() => {
      controller2.abort(STALE_REACTION);
    });
    var next2 = effect.next;
    if ((effect.f & 64) !== 0) effect.parent = null;
    else destroy_effect(effect, remove_dom);
    effect = next2;
  }
}
function destroy_block_effect_children(signal) {
  var effect = signal.first;
  while (effect !== null) {
    var next2 = effect.next;
    if ((effect.f & 32) === 0) destroy_effect(effect);
    effect = next2;
  }
}
function destroy_effect(effect, remove_dom = true) {
  var removed = false;
  if ((remove_dom || (effect.f & 262144) !== 0) && effect.nodes !== null && effect.nodes.end !== null) {
    remove_effect_dom(effect.nodes.start, effect.nodes.end);
    removed = true;
  }
  set_signal_status(effect, DESTROYING);
  destroy_effect_children(effect, remove_dom && !removed);
  remove_reactions(effect, 0);
  var transitions = effect.nodes && effect.nodes.t;
  if (transitions !== null) for (const transition of transitions) transition.stop();
  execute_effect_teardown(effect);
  effect.f ^= DESTROYING;
  effect.f |= DESTROYED;
  var parent = effect.parent;
  if (parent !== null && parent.first !== null) unlink_effect(effect);
  effect.next = effect.prev = effect.teardown = effect.ctx = effect.deps = effect.fn = effect.nodes = effect.ac = effect.b = null;
}
function remove_effect_dom(node, end) {
  while (node !== null) {
    var next2 = node === end ? null : get_next_sibling(node);
    node.remove();
    node = next2;
  }
}
function unlink_effect(effect) {
  var parent = effect.parent;
  var prev = effect.prev;
  var next2 = effect.next;
  if (prev !== null) prev.next = next2;
  if (next2 !== null) next2.prev = prev;
  if (parent !== null) {
    if (parent.first === effect) parent.first = next2;
    if (parent.last === effect) parent.last = prev;
  }
}
function pause_effect(effect, callback, destroy = true) {
  var transitions = [];
  pause_children(effect, transitions, true);
  var fn = () => {
    if (destroy) destroy_effect(effect);
    if (callback) callback();
  };
  var remaining = transitions.length;
  if (remaining > 0) {
    var check = () => --remaining || fn();
    for (var transition of transitions) transition.out(check);
  } else fn();
}
function pause_children(effect, transitions, local) {
  if ((effect.f & 8192) !== 0) return;
  effect.f ^= INERT;
  var t = effect.nodes && effect.nodes.t;
  if (t !== null) {
    for (const transition of t) if (transition.is_global || local) transitions.push(transition);
  }
  var child = effect.first;
  while (child !== null) {
    var sibling = child.next;
    if ((child.f & 64) === 0) {
      var transparent = (child.f & 65536) !== 0 || (child.f & 32) !== 0 && (effect.f & 16) !== 0;
      pause_children(child, transitions, transparent ? local : false);
    }
    child = sibling;
  }
}
function move_effect(effect, fragment) {
  if (!effect.nodes) return;
  var node = effect.nodes.start;
  var end = effect.nodes.end;
  while (node !== null) {
    var next2 = node === end ? null : get_next_sibling(node);
    fragment.append(node);
    node = next2;
  }
}
function set_is_destroying_effect(value) {
  is_destroying_effect = value;
}
function set_active_reaction(reaction) {
  active_reaction = reaction;
}
function set_active_effect(effect) {
  active_effect = effect;
}
function push_reaction_value(value) {
  if (active_reaction !== null && true) if (current_sources === null) current_sources = [value];
  else current_sources.push(value);
}
function set_untracked_writes(value) {
  untracked_writes = value;
}
function set_update_version(value) {
  update_version = value;
}
function increment_write_version() {
  return ++write_version;
}
function is_dirty(reaction) {
  var flags2 = reaction.f;
  if ((flags2 & 2048) !== 0) return true;
  if (flags2 & 2) reaction.f &= ~WAS_MARKED;
  if ((flags2 & 4096) !== 0) {
    var dependencies = reaction.deps;
    var length = dependencies.length;
    for (var i = 0; i < length; i++) {
      var dependency = dependencies[i];
      if (is_dirty(dependency)) update_derived(dependency);
      if (dependency.wv > reaction.wv) return true;
    }
    if ((flags2 & 512) !== 0 && batch_values === null) set_signal_status(reaction, CLEAN);
  }
  return false;
}
function schedule_possible_effect_self_invalidation(signal, effect, root = true) {
  var reactions = signal.reactions;
  if (reactions === null) return;
  if (current_sources !== null && includes.call(current_sources, signal)) return;
  for (var i = 0; i < reactions.length; i++) {
    var reaction = reactions[i];
    if ((reaction.f & 2) !== 0) schedule_possible_effect_self_invalidation(reaction, effect, false);
    else if (effect === reaction) {
      if (root) set_signal_status(reaction, DIRTY);
      else if ((reaction.f & 1024) !== 0) set_signal_status(reaction, MAYBE_DIRTY);
      schedule_effect(reaction);
    }
  }
}
function update_reaction(reaction) {
  var previous_deps = new_deps;
  var previous_skipped_deps = skipped_deps;
  var previous_untracked_writes = untracked_writes;
  var previous_reaction = active_reaction;
  var previous_sources = current_sources;
  var previous_component_context = component_context;
  var previous_untracking = untracking;
  var previous_update_version = update_version;
  var flags2 = reaction.f;
  new_deps = null;
  skipped_deps = 0;
  untracked_writes = null;
  active_reaction = (flags2 & 96) === 0 ? reaction : null;
  current_sources = null;
  set_component_context(reaction.ctx);
  untracking = false;
  update_version = ++read_version;
  if (reaction.ac !== null) {
    without_reactive_context(() => {
      reaction.ac.abort(STALE_REACTION);
    });
    reaction.ac = null;
  }
  try {
    reaction.f |= REACTION_IS_UPDATING;
    var fn = reaction.fn;
    var result = fn();
    reaction.f |= REACTION_RAN;
    var deps = reaction.deps;
    var is_fork = current_batch?.is_fork;
    if (new_deps !== null) {
      var i;
      if (!is_fork) remove_reactions(reaction, skipped_deps);
      if (deps !== null && skipped_deps > 0) {
        deps.length = skipped_deps + new_deps.length;
        for (i = 0; i < new_deps.length; i++) deps[skipped_deps + i] = new_deps[i];
      } else reaction.deps = deps = new_deps;
      if (effect_tracking() && (reaction.f & 512) !== 0) for (i = skipped_deps; i < deps.length; i++) (deps[i].reactions ??= []).push(reaction);
    } else if (!is_fork && deps !== null && skipped_deps < deps.length) {
      remove_reactions(reaction, skipped_deps);
      deps.length = skipped_deps;
    }
    if (is_runes() && untracked_writes !== null && !untracking && deps !== null && (reaction.f & 6146) === 0) for (i = 0; i < untracked_writes.length; i++) schedule_possible_effect_self_invalidation(untracked_writes[i], reaction);
    if (previous_reaction !== null && previous_reaction !== reaction) {
      read_version++;
      if (previous_reaction.deps !== null) for (let i2 = 0; i2 < previous_skipped_deps; i2 += 1) previous_reaction.deps[i2].rv = read_version;
      if (previous_deps !== null) for (const dep of previous_deps) dep.rv = read_version;
      if (untracked_writes !== null) if (previous_untracked_writes === null) previous_untracked_writes = untracked_writes;
      else previous_untracked_writes.push(...untracked_writes);
    }
    if ((reaction.f & 8388608) !== 0) reaction.f ^= ERROR_VALUE;
    return result;
  } catch (error) {
    return handle_error(error);
  } finally {
    reaction.f ^= REACTION_IS_UPDATING;
    new_deps = previous_deps;
    skipped_deps = previous_skipped_deps;
    untracked_writes = previous_untracked_writes;
    active_reaction = previous_reaction;
    current_sources = previous_sources;
    set_component_context(previous_component_context);
    untracking = previous_untracking;
    update_version = previous_update_version;
  }
}
function remove_reaction(signal, dependency) {
  let reactions = dependency.reactions;
  if (reactions !== null) {
    var index2 = index_of.call(reactions, signal);
    if (index2 !== -1) {
      var new_length = reactions.length - 1;
      if (new_length === 0) reactions = dependency.reactions = null;
      else {
        reactions[index2] = reactions[new_length];
        reactions.pop();
      }
    }
  }
  if (reactions === null && (dependency.f & 2) !== 0 && (new_deps === null || !includes.call(new_deps, dependency))) {
    var derived2 = dependency;
    if ((derived2.f & 512) !== 0) {
      derived2.f ^= 512;
      derived2.f &= ~WAS_MARKED;
    }
    if (derived2.v !== UNINITIALIZED) update_derived_status(derived2);
    freeze_derived_effects(derived2);
    remove_reactions(derived2, 0);
  }
}
function remove_reactions(signal, start_index) {
  var dependencies = signal.deps;
  if (dependencies === null) return;
  for (var i = start_index; i < dependencies.length; i++) remove_reaction(signal, dependencies[i]);
}
function update_effect(effect) {
  var flags2 = effect.f;
  if ((flags2 & 16384) !== 0) return;
  set_signal_status(effect, CLEAN);
  var previous_effect = active_effect;
  var was_updating_effect = is_updating_effect;
  active_effect = effect;
  is_updating_effect = true;
  try {
    if ((flags2 & 16777232) !== 0) destroy_block_effect_children(effect);
    else destroy_effect_children(effect);
    execute_effect_teardown(effect);
    var teardown = update_reaction(effect);
    effect.teardown = typeof teardown === "function" ? teardown : null;
    effect.wv = write_version;
  } finally {
    is_updating_effect = was_updating_effect;
    active_effect = previous_effect;
  }
}
function get(signal) {
  var is_derived = (signal.f & 2) !== 0;
  if (active_reaction !== null && !untracking) {
    if (!(active_effect !== null && (active_effect.f & 16384) !== 0) && (current_sources === null || !includes.call(current_sources, signal))) {
      var deps = active_reaction.deps;
      if ((active_reaction.f & 2097152) !== 0) {
        if (signal.rv < read_version) {
          signal.rv = read_version;
          if (new_deps === null && deps !== null && deps[skipped_deps] === signal) skipped_deps++;
          else if (new_deps === null) new_deps = [signal];
          else new_deps.push(signal);
        }
      } else {
        (active_reaction.deps ??= []).push(signal);
        var reactions = signal.reactions;
        if (reactions === null) signal.reactions = [active_reaction];
        else if (!includes.call(reactions, active_reaction)) reactions.push(active_reaction);
      }
    }
  }
  if (is_destroying_effect && old_values.has(signal)) return old_values.get(signal);
  if (is_derived) {
    var derived2 = signal;
    if (is_destroying_effect) {
      var value = derived2.v;
      if ((derived2.f & 1024) === 0 && derived2.reactions !== null || depends_on_old_values(derived2)) value = execute_derived(derived2);
      old_values.set(derived2, value);
      return value;
    }
    var should_connect = (derived2.f & 512) === 0 && !untracking && active_reaction !== null && (is_updating_effect || (active_reaction.f & 512) !== 0);
    var is_new = (derived2.f & REACTION_RAN) === 0;
    if (is_dirty(derived2)) {
      if (should_connect) derived2.f |= 512;
      update_derived(derived2);
    }
    if (should_connect && !is_new) {
      unfreeze_derived_effects(derived2);
      reconnect(derived2);
    }
  }
  if (batch_values?.has(signal)) return batch_values.get(signal);
  if ((signal.f & 8388608) !== 0) throw signal.v;
  return signal.v;
}
function reconnect(derived2) {
  derived2.f |= 512;
  if (derived2.deps === null) return;
  for (const dep of derived2.deps) {
    (dep.reactions ??= []).push(derived2);
    if ((dep.f & 2) !== 0 && (dep.f & 512) === 0) {
      unfreeze_derived_effects(dep);
      reconnect(dep);
    }
  }
}
function depends_on_old_values(derived2) {
  if (derived2.v === UNINITIALIZED) return true;
  if (derived2.deps === null) return false;
  for (const dep of derived2.deps) {
    if (old_values.has(dep)) return true;
    if ((dep.f & 2) !== 0 && depends_on_old_values(dep)) return true;
  }
  return false;
}
function untrack(fn) {
  var previous_untracking = untracking;
  try {
    untracking = true;
    return fn();
  } finally {
    untracking = previous_untracking;
  }
}
function is_boolean_attribute(name) {
  return DOM_BOOLEAN_ATTRIBUTES.includes(name);
}
function is_passive_event(name) {
  return PASSIVE_EVENTS.includes(name);
}
function render(component2, options2 = {}) {
  if (options2.csp?.hash && options2.csp.nonce) invalid_csp();
  return Renderer.render(component2, options2);
}
function attributes(attrs, css_hash, classes, styles, flags2 = 0) {
  if (styles) attrs.style = to_style(attrs.style, styles);
  if (attrs.class) attrs.class = clsx$1(attrs.class);
  if (css_hash || classes) attrs.class = to_class(attrs.class, css_hash, classes);
  let attr_str = "";
  let name;
  const is_html = (flags2 & 1) === 0;
  const lowercase = (flags2 & 2) === 0;
  const is_input = (flags2 & 4) !== 0;
  for (name of Object.keys(attrs)) {
    if (typeof attrs[name] === "function") continue;
    if (name[0] === "$" && name[1] === "$") continue;
    if (INVALID_ATTR_NAME_CHAR_REGEX.test(name)) continue;
    var value = attrs[name];
    var lower = name.toLowerCase();
    if (lowercase) name = lower;
    if (lower.length > 2 && lower.startsWith("on")) continue;
    if (is_input) {
      if (name === "defaultvalue" || name === "defaultchecked") {
        name = name === "defaultvalue" ? "value" : "checked";
        if (attrs[name]) continue;
      }
    }
    attr_str += attr(name, value, is_html && is_boolean_attribute(name));
  }
  return attr_str;
}
function once(get_value) {
  let value = UNINITIALIZED;
  return () => {
    if (value === UNINITIALIZED) value = get_value();
    return value;
  };
}
function derived(fn) {
  const get_value = ssr_context === null ? fn : once(fn);
  let updated_value;
  return function(new_value) {
    if (arguments.length === 0) return updated_value ?? get_value();
    updated_value = new_value;
    return updated_value;
  };
}
async function sha256(data) {
  text_encoder ??= new TextEncoder();
  crypto ??= globalThis.crypto?.subtle?.digest ? globalThis.crypto : (await obfuscated_import("node:crypto")).webcrypto;
  return base64_encode(await crypto.subtle.digest("SHA-256", text_encoder.encode(data)));
}
function base64_encode(bytes) {
  if (globalThis.Buffer) return globalThis.Buffer.from(bytes).toString("base64");
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
var MAX_ARRAY_LEN, MAX_ARRAY_INDEX, escaped, DevalueError, object_proto_names, is_identifier, chars, unsafe_chars, reserved, ssr_context, is_array, index_of, includes, array_from, define_property, get_descriptor, object_prototype, array_prototype, get_prototype_of, is_extensible, has_own_property, noop, CLEAN, DIRTY, MAYBE_DIRTY, INERT, DESTROYED, REACTION_RAN, DESTROYING, EFFECT_TRANSPARENT, EFFECT_PRESERVED, USER_EFFECT, WAS_MARKED, REACTION_IS_UPDATING, ERROR_VALUE, STATE_SYMBOL, LEGACY_PROPS, STALE_REACTION, controller, als, HYDRATION_ERROR, UNINITIALIZED, BLOCK_OPEN, BLOCK_CLOSE, ATTR_REGEX, CONTENT_REGEX, replacements, whitespace, hydrating, hydrate_node, component_context, micro_tasks, STATUS_MASK, batches, current_batch, batch_values, last_scheduled_effect, is_flushing_sync, is_processing, collected_effects, legacy_updates, flush_count, uid, Batch, eager_block_effects, flags, Boundary, eager_effects, old_values, eager_effects_deferred, $window, first_child_getter, next_sibling_getter, is_updating_effect, is_destroying_effect, active_reaction, untracking, active_effect, current_sources, new_deps, skipped_deps, untracked_writes, write_version, read_version, update_version, DOM_BOOLEAN_ATTRIBUTES, PASSIVE_EVENTS, INVALID_ATTR_NAME_CHAR_REGEX, text_encoder, crypto, obfuscated_import, Renderer, SSRState;
var init_dev_DRV_q2AU = __esm({
  "build/server/chunks/dev-DRV-q2AU.js"() {
    "use strict";
    MAX_ARRAY_LEN = 2 ** 32 - 1;
    MAX_ARRAY_INDEX = MAX_ARRAY_LEN - 1;
    escaped = {
      "<": "\\u003C",
      "\\": "\\\\",
      "\b": "\\b",
      "\f": "\\f",
      "\n": "\\n",
      "\r": "\\r",
      "	": "\\t",
      "\u2028": "\\u2028",
      "\u2029": "\\u2029"
    };
    DevalueError = class extends Error {
      /**
       * @param {string} message
       * @param {string[]} keys
       * @param {any} [value] - The value that failed to be serialized
       * @param {any} [root] - The root value being serialized
       */
      constructor(message, keys, value, root) {
        super(message);
        this.name = "DevalueError";
        this.path = keys.join("");
        this.value = value;
        this.root = root;
      }
    };
    object_proto_names = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
    is_identifier = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
    chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$";
    unsafe_chars = /[<\b\f\n\r\t\0\u2028\u2029]/g;
    reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
    ssr_context = null;
    is_array = Array.isArray;
    index_of = Array.prototype.indexOf;
    includes = Array.prototype.includes;
    array_from = Array.from;
    define_property = Object.defineProperty;
    get_descriptor = Object.getOwnPropertyDescriptor;
    object_prototype = Object.prototype;
    array_prototype = Array.prototype;
    get_prototype_of = Object.getPrototypeOf;
    is_extensible = Object.isExtensible;
    has_own_property = Object.prototype.hasOwnProperty;
    noop = () => {
    };
    CLEAN = 1024;
    DIRTY = 2048;
    MAYBE_DIRTY = 4096;
    INERT = 8192;
    DESTROYED = 16384;
    REACTION_RAN = 32768;
    DESTROYING = 1 << 25;
    EFFECT_TRANSPARENT = 65536;
    EFFECT_PRESERVED = 1 << 19;
    USER_EFFECT = 1 << 20;
    WAS_MARKED = 65536;
    REACTION_IS_UPDATING = 1 << 21;
    ERROR_VALUE = 1 << 23;
    STATE_SYMBOL = /* @__PURE__ */ Symbol("$state");
    LEGACY_PROPS = /* @__PURE__ */ Symbol("legacy props");
    STALE_REACTION = new class StaleReactionError extends Error {
      name = "StaleReactionError";
      message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
    }();
    controller = null;
    als = null;
    HYDRATION_ERROR = {};
    UNINITIALIZED = /* @__PURE__ */ Symbol();
    BLOCK_OPEN = `<!--[-->`;
    BLOCK_CLOSE = `<!--]-->`;
    ATTR_REGEX = /[&"<]/g;
    CONTENT_REGEX = /[&<]/g;
    replacements = { translate: /* @__PURE__ */ new Map([[true, "yes"], [false, "no"]]) };
    whitespace = [..." 	\n\r\f\xA0\v\uFEFF"];
    hydrating = false;
    component_context = null;
    micro_tasks = [];
    STATUS_MASK = -7169;
    batches = /* @__PURE__ */ new Set();
    current_batch = null;
    batch_values = null;
    last_scheduled_effect = null;
    is_flushing_sync = false;
    is_processing = false;
    collected_effects = null;
    legacy_updates = null;
    flush_count = 0;
    uid = 1;
    Batch = class Batch2 {
      id = uid++;
      /**
      * The current values of any signals that are updated in this batch.
      * Tuple format: [value, is_derived] (note: is_derived is false for deriveds, too, if they were overridden via assignment)
      * They keys of this map are identical to `this.#previous`
      * @type {Map<Value, [any, boolean]>}
      */
      current = /* @__PURE__ */ new Map();
      /**
      * The values of any signals (sources and deriveds) that are updated in this batch _before_ those updates took place.
      * They keys of this map are identical to `this.#current`
      * @type {Map<Value, any>}
      */
      previous = /* @__PURE__ */ new Map();
      /**
      * When the batch is committed (and the DOM is updated), we need to remove old branches
      * and append new ones by calling the functions added inside (if/each/key/etc) blocks
      * @type {Set<(batch: Batch) => void>}
      */
      #commit_callbacks = /* @__PURE__ */ new Set();
      /**
      * If a fork is discarded, we need to destroy any effects that are no longer needed
      * @type {Set<(batch: Batch) => void>}
      */
      #discard_callbacks = /* @__PURE__ */ new Set();
      /**
      * Callbacks that should run only when a fork is committed.
      * @type {Set<(batch: Batch) => void>}
      */
      #fork_commit_callbacks = /* @__PURE__ */ new Set();
      /**
      * Async effects that are currently in flight
      * @type {Map<Effect, number>}
      */
      #pending = /* @__PURE__ */ new Map();
      /**
      * Async effects that are currently in flight, _not_ inside a pending boundary
      * @type {Map<Effect, number>}
      */
      #blocking_pending = /* @__PURE__ */ new Map();
      /**
      * A deferred that resolves when the batch is committed, used with `settled()`
      * TODO replace with Promise.withResolvers once supported widely enough
      * @type {{ promise: Promise<void>, resolve: (value?: any) => void, reject: (reason: unknown) => void } | null}
      */
      #deferred = null;
      /**
      * The root effects that need to be flushed
      * @type {Effect[]}
      */
      #roots = [];
      /**
      * Effects created while this batch was active.
      * @type {Effect[]}
      */
      #new_effects = [];
      /**
      * Deferred effects (which run after async work has completed) that are DIRTY
      * @type {Set<Effect>}
      */
      #dirty_effects = /* @__PURE__ */ new Set();
      /**
      * Deferred effects that are MAYBE_DIRTY
      * @type {Set<Effect>}
      */
      #maybe_dirty_effects = /* @__PURE__ */ new Set();
      /**
      * A map of branches that still exist, but will be destroyed when this batch
      * is committed — we skip over these during `process`.
      * The value contains child effects that were dirty/maybe_dirty before being reset,
      * so they can be rescheduled if the branch survives.
      * @type {Map<Effect, { d: Effect[], m: Effect[] }>}
      */
      #skipped_branches = /* @__PURE__ */ new Map();
      /**
      * Inverse of #skipped_branches which we need to tell prior batches to unskip them when committing
      * @type {Set<Effect>}
      */
      #unskipped_branches = /* @__PURE__ */ new Set();
      is_fork = false;
      #decrement_queued = false;
      /** @type {Set<Batch>} */
      #blockers = /* @__PURE__ */ new Set();
      #is_deferred() {
        return this.is_fork || this.#blocking_pending.size > 0;
      }
      #is_blocked() {
        for (const batch of this.#blockers) for (const effect of batch.#blocking_pending.keys()) {
          var skipped = false;
          var e = effect;
          while (e.parent !== null) {
            if (this.#skipped_branches.has(e)) {
              skipped = true;
              break;
            }
            e = e.parent;
          }
          if (!skipped) return true;
        }
        return false;
      }
      /**
      * Add an effect to the #skipped_branches map and reset its children
      * @param {Effect} effect
      */
      skip_effect(effect) {
        if (!this.#skipped_branches.has(effect)) this.#skipped_branches.set(effect, {
          d: [],
          m: []
        });
        this.#unskipped_branches.delete(effect);
      }
      /**
      * Remove an effect from the #skipped_branches map and reschedule
      * any tracked dirty/maybe_dirty child effects
      * @param {Effect} effect
      * @param {(e: Effect) => void} callback
      */
      unskip_effect(effect, callback = (e) => this.schedule(e)) {
        var tracked = this.#skipped_branches.get(effect);
        if (tracked) {
          this.#skipped_branches.delete(effect);
          for (var e of tracked.d) {
            set_signal_status(e, DIRTY);
            callback(e);
          }
          for (e of tracked.m) {
            set_signal_status(e, MAYBE_DIRTY);
            callback(e);
          }
        }
        this.#unskipped_branches.add(effect);
      }
      #process() {
        if (flush_count++ > 1e3) {
          batches.delete(this);
          infinite_loop_guard();
        }
        if (!this.#is_deferred()) {
          for (const e of this.#dirty_effects) {
            this.#maybe_dirty_effects.delete(e);
            set_signal_status(e, DIRTY);
            this.schedule(e);
          }
          for (const e of this.#maybe_dirty_effects) {
            set_signal_status(e, MAYBE_DIRTY);
            this.schedule(e);
          }
        }
        const roots = this.#roots;
        this.#roots = [];
        this.apply();
        var effects = collected_effects = [];
        var render_effects = [];
        var updates = legacy_updates = [];
        for (const root of roots) try {
          this.#traverse(root, effects, render_effects);
        } catch (e) {
          reset_all(root);
          throw e;
        }
        current_batch = null;
        if (updates.length > 0) {
          var batch = Batch2.ensure();
          for (const e of updates) batch.schedule(e);
        }
        collected_effects = null;
        legacy_updates = null;
        if (this.#is_deferred() || this.#is_blocked()) {
          this.#defer_effects(render_effects);
          this.#defer_effects(effects);
          for (const [e, t] of this.#skipped_branches) reset_branch(e, t);
        } else {
          if (this.#pending.size === 0) batches.delete(this);
          this.#dirty_effects.clear();
          this.#maybe_dirty_effects.clear();
          for (const fn of this.#commit_callbacks) fn(this);
          this.#commit_callbacks.clear();
          flush_queued_effects(render_effects);
          flush_queued_effects(effects);
          this.#deferred?.resolve();
        }
        var next_batch = current_batch;
        if (this.#roots.length > 0) {
          const batch2 = next_batch ??= this;
          batch2.#roots.push(...this.#roots.filter((r2) => !batch2.#roots.includes(r2)));
        }
        if (next_batch !== null) {
          batches.add(next_batch);
          next_batch.#process();
        }
      }
      /**
      * Traverse the effect tree, executing effects or stashing
      * them for later execution as appropriate
      * @param {Effect} root
      * @param {Effect[]} effects
      * @param {Effect[]} render_effects
      */
      #traverse(root, effects, render_effects) {
        root.f ^= CLEAN;
        var effect = root.first;
        while (effect !== null) {
          var flags2 = effect.f;
          var is_branch = (flags2 & 96) !== 0;
          if (!(is_branch && (flags2 & 1024) !== 0 || (flags2 & 8192) !== 0 || this.#skipped_branches.has(effect)) && effect.fn !== null) {
            if (is_branch) effect.f ^= CLEAN;
            else if ((flags2 & 4) !== 0) effects.push(effect);
            else if (is_dirty(effect)) {
              if ((flags2 & 16) !== 0) this.#maybe_dirty_effects.add(effect);
              update_effect(effect);
            }
            var child = effect.first;
            if (child !== null) {
              effect = child;
              continue;
            }
          }
          while (effect !== null) {
            var next2 = effect.next;
            if (next2 !== null) {
              effect = next2;
              break;
            }
            effect = effect.parent;
          }
        }
      }
      /**
      * @param {Effect[]} effects
      */
      #defer_effects(effects) {
        for (var i = 0; i < effects.length; i += 1) defer_effect(effects[i], this.#dirty_effects, this.#maybe_dirty_effects);
      }
      /**
      * Associate a change to a given source with the current
      * batch, noting its previous and current values
      * @param {Value} source
      * @param {any} value
      * @param {boolean} [is_derived]
      */
      capture(source2, value, is_derived = false) {
        if (source2.v !== UNINITIALIZED && !this.previous.has(source2)) this.previous.set(source2, source2.v);
        if ((source2.f & 8388608) === 0) {
          this.current.set(source2, [value, is_derived]);
          batch_values?.set(source2, value);
        }
        if (!this.is_fork) source2.v = value;
      }
      activate() {
        current_batch = this;
      }
      deactivate() {
        current_batch = null;
        batch_values = null;
      }
      flush() {
        try {
          is_processing = true;
          current_batch = this;
          this.#process();
        } finally {
          flush_count = 0;
          last_scheduled_effect = null;
          collected_effects = null;
          legacy_updates = null;
          is_processing = false;
          current_batch = null;
          batch_values = null;
          old_values.clear();
        }
      }
      discard() {
        for (const fn of this.#discard_callbacks) fn(this);
        this.#discard_callbacks.clear();
        this.#fork_commit_callbacks.clear();
        batches.delete(this);
      }
      /**
      * @param {Effect} effect
      */
      register_created_effect(effect) {
        this.#new_effects.push(effect);
      }
      #commit() {
        for (const batch of batches) {
          var is_earlier = batch.id < this.id;
          var sources = [];
          for (const [source3, [value, is_derived]] of this.current) {
            if (batch.current.has(source3)) {
              var batch_value = batch.current.get(source3)[0];
              if (is_earlier && value !== batch_value) batch.current.set(source3, [value, is_derived]);
              else continue;
            }
            sources.push(source3);
          }
          var others = [...batch.current.keys()].filter((s) => !this.current.has(s));
          if (others.length === 0) {
            if (is_earlier) batch.discard();
          } else if (sources.length > 0) {
            if (is_earlier) for (const unskipped of this.#unskipped_branches) batch.unskip_effect(unskipped, (e) => {
              if ((e.f & 4194320) !== 0) batch.schedule(e);
              else batch.#defer_effects([e]);
            });
            batch.activate();
            var marked = /* @__PURE__ */ new Set();
            var checked = /* @__PURE__ */ new Map();
            for (var source2 of sources) mark_effects(source2, others, marked, checked);
            checked = /* @__PURE__ */ new Map();
            var current_unequal = [...batch.current.keys()].filter((c) => this.current.has(c) ? this.current.get(c)[0] !== c : true);
            for (const effect of this.#new_effects) if ((effect.f & 155648) === 0 && depends_on(effect, current_unequal, checked)) if ((effect.f & 4194320) !== 0) {
              set_signal_status(effect, DIRTY);
              batch.schedule(effect);
            } else batch.#dirty_effects.add(effect);
            if (batch.#roots.length > 0) {
              batch.apply();
              for (var root of batch.#roots) batch.#traverse(root, [], []);
              batch.#roots = [];
            }
            batch.deactivate();
          }
        }
        for (const batch of batches) if (batch.#blockers.has(this)) {
          batch.#blockers.delete(this);
          if (batch.#blockers.size === 0 && !batch.#is_deferred()) {
            batch.activate();
            batch.#process();
          }
        }
      }
      /**
      * @param {boolean} blocking
      * @param {Effect} effect
      */
      increment(blocking, effect) {
        let pending_count = this.#pending.get(effect) ?? 0;
        this.#pending.set(effect, pending_count + 1);
        if (blocking) {
          let blocking_pending_count = this.#blocking_pending.get(effect) ?? 0;
          this.#blocking_pending.set(effect, blocking_pending_count + 1);
        }
      }
      /**
      * @param {boolean} blocking
      * @param {Effect} effect
      * @param {boolean} skip - whether to skip updates (because this is triggered by a stale reaction)
      */
      decrement(blocking, effect, skip) {
        let pending_count = this.#pending.get(effect) ?? 0;
        if (pending_count === 1) this.#pending.delete(effect);
        else this.#pending.set(effect, pending_count - 1);
        if (blocking) {
          let blocking_pending_count = this.#blocking_pending.get(effect) ?? 0;
          if (blocking_pending_count === 1) this.#blocking_pending.delete(effect);
          else this.#blocking_pending.set(effect, blocking_pending_count - 1);
        }
        if (this.#decrement_queued || skip) return;
        this.#decrement_queued = true;
        queue_micro_task(() => {
          this.#decrement_queued = false;
          this.flush();
        });
      }
      /**
      * @param {Set<Effect>} dirty_effects
      * @param {Set<Effect>} maybe_dirty_effects
      */
      transfer_effects(dirty_effects, maybe_dirty_effects) {
        for (const e of dirty_effects) this.#dirty_effects.add(e);
        for (const e of maybe_dirty_effects) this.#maybe_dirty_effects.add(e);
        dirty_effects.clear();
        maybe_dirty_effects.clear();
      }
      /** @param {(batch: Batch) => void} fn */
      oncommit(fn) {
        this.#commit_callbacks.add(fn);
      }
      /** @param {(batch: Batch) => void} fn */
      ondiscard(fn) {
        this.#discard_callbacks.add(fn);
      }
      /** @param {(batch: Batch) => void} fn */
      on_fork_commit(fn) {
        this.#fork_commit_callbacks.add(fn);
      }
      run_fork_commit_callbacks() {
        for (const fn of this.#fork_commit_callbacks) fn(this);
        this.#fork_commit_callbacks.clear();
      }
      settled() {
        return (this.#deferred ??= deferred()).promise;
      }
      static ensure() {
        if (current_batch === null) {
          const batch = current_batch = new Batch2();
          if (!is_processing) {
            batches.add(current_batch);
            if (!is_flushing_sync) queue_micro_task(() => {
              if (current_batch !== batch) return;
              batch.flush();
            });
          }
        }
        return current_batch;
      }
      apply() {
        {
          batch_values = null;
          return;
        }
      }
      /**
      *
      * @param {Effect} effect
      */
      schedule(effect) {
        last_scheduled_effect = effect;
        if (effect.b?.is_pending && (effect.f & 16777228) !== 0 && (effect.f & 32768) === 0) {
          effect.b.defer_effect(effect);
          return;
        }
        var e = effect;
        while (e.parent !== null) {
          e = e.parent;
          var flags2 = e.f;
          if (collected_effects !== null && e === active_effect) {
            if ((active_reaction === null || (active_reaction.f & 2) === 0) && true) return;
          }
          if ((flags2 & 96) !== 0) {
            if ((flags2 & 1024) === 0) return;
            e.f ^= CLEAN;
          }
        }
        this.#roots.push(e);
      }
    };
    eager_block_effects = null;
    flags = EFFECT_TRANSPARENT | EFFECT_PRESERVED;
    Boundary = class {
      /** @type {Boundary | null} */
      parent;
      is_pending = false;
      /**
      * API-level transformError transform function. Transforms errors before they reach the `failed` snippet.
      * Inherited from parent boundary, or defaults to identity.
      * @type {(error: unknown) => unknown}
      */
      transform_error;
      /** @type {TemplateNode} */
      #anchor;
      /** @type {TemplateNode | null} */
      #hydrate_open = hydrating ? hydrate_node : null;
      /** @type {BoundaryProps} */
      #props;
      /** @type {((anchor: Node) => void)} */
      #children;
      /** @type {Effect} */
      #effect;
      /** @type {Effect | null} */
      #main_effect = null;
      /** @type {Effect | null} */
      #pending_effect = null;
      /** @type {Effect | null} */
      #failed_effect = null;
      /** @type {DocumentFragment | null} */
      #offscreen_fragment = null;
      #local_pending_count = 0;
      #pending_count = 0;
      #pending_count_update_queued = false;
      /** @type {Set<Effect>} */
      #dirty_effects = /* @__PURE__ */ new Set();
      /** @type {Set<Effect>} */
      #maybe_dirty_effects = /* @__PURE__ */ new Set();
      /**
      * A source containing the number of pending async deriveds/expressions.
      * Only created if `$effect.pending()` is used inside the boundary,
      * otherwise updating the source results in needless `Batch.ensure()`
      * calls followed by no-op flushes
      * @type {Source<number> | null}
      */
      #effect_pending = null;
      #effect_pending_subscriber = createSubscriber(() => {
        this.#effect_pending = source(this.#local_pending_count);
        return () => {
          this.#effect_pending = null;
        };
      });
      /**
      * @param {TemplateNode} node
      * @param {BoundaryProps} props
      * @param {((anchor: Node) => void)} children
      * @param {((error: unknown) => unknown) | undefined} [transform_error]
      */
      constructor(node, props, children, transform_error) {
        this.#anchor = node;
        this.#props = props;
        this.#children = (anchor) => {
          var effect = active_effect;
          effect.b = this;
          effect.f |= 128;
          children(anchor);
        };
        this.parent = active_effect.b;
        this.transform_error = transform_error ?? this.parent?.transform_error ?? ((e) => e);
        this.#effect = block(() => {
          if (hydrating) {
            const comment = this.#hydrate_open;
            hydrate_next();
            const server_rendered_pending = comment.data === "[!";
            if (comment.data.startsWith("[?")) {
              const serialized_error = JSON.parse(comment.data.slice(2));
              this.#hydrate_failed_content(serialized_error);
            } else if (server_rendered_pending) this.#hydrate_pending_content();
            else this.#hydrate_resolved_content();
          } else this.#render();
        }, flags);
        if (hydrating) this.#anchor = hydrate_node;
      }
      #hydrate_resolved_content() {
        try {
          this.#main_effect = branch(() => this.#children(this.#anchor));
        } catch (error) {
          this.error(error);
        }
      }
      /**
      * @param {unknown} error The deserialized error from the server's hydration comment
      */
      #hydrate_failed_content(error) {
        const failed = this.#props.failed;
        if (!failed) return;
        this.#failed_effect = branch(() => {
          failed(this.#anchor, () => error, () => () => {
          });
        });
      }
      #hydrate_pending_content() {
        const pending = this.#props.pending;
        if (!pending) return;
        this.is_pending = true;
        this.#pending_effect = branch(() => pending(this.#anchor));
        queue_micro_task(() => {
          var fragment = this.#offscreen_fragment = document.createDocumentFragment();
          var anchor = create_text();
          fragment.append(anchor);
          this.#main_effect = this.#run(() => {
            return branch(() => this.#children(anchor));
          });
          if (this.#pending_count === 0) {
            this.#anchor.before(fragment);
            this.#offscreen_fragment = null;
            pause_effect(this.#pending_effect, () => {
              this.#pending_effect = null;
            });
            this.#resolve(current_batch);
          }
        });
      }
      #render() {
        try {
          this.is_pending = this.has_pending_snippet();
          this.#pending_count = 0;
          this.#local_pending_count = 0;
          this.#main_effect = branch(() => {
            this.#children(this.#anchor);
          });
          if (this.#pending_count > 0) {
            var fragment = this.#offscreen_fragment = document.createDocumentFragment();
            move_effect(this.#main_effect, fragment);
            const pending = this.#props.pending;
            this.#pending_effect = branch(() => pending(this.#anchor));
          } else this.#resolve(current_batch);
        } catch (error) {
          this.error(error);
        }
      }
      /**
      * @param {Batch} batch
      */
      #resolve(batch) {
        this.is_pending = false;
        batch.transfer_effects(this.#dirty_effects, this.#maybe_dirty_effects);
      }
      /**
      * Defer an effect inside a pending boundary until the boundary resolves
      * @param {Effect} effect
      */
      defer_effect(effect) {
        defer_effect(effect, this.#dirty_effects, this.#maybe_dirty_effects);
      }
      /**
      * Returns `false` if the effect exists inside a boundary whose pending snippet is shown
      * @returns {boolean}
      */
      is_rendered() {
        return !this.is_pending && (!this.parent || this.parent.is_rendered());
      }
      has_pending_snippet() {
        return !!this.#props.pending;
      }
      /**
      * @template T
      * @param {() => T} fn
      */
      #run(fn) {
        var previous_effect = active_effect;
        var previous_reaction = active_reaction;
        var previous_ctx = component_context;
        set_active_effect(this.#effect);
        set_active_reaction(this.#effect);
        set_component_context(this.#effect.ctx);
        try {
          Batch.ensure();
          return fn();
        } catch (e) {
          handle_error(e);
          return null;
        } finally {
          set_active_effect(previous_effect);
          set_active_reaction(previous_reaction);
          set_component_context(previous_ctx);
        }
      }
      /**
      * Updates the pending count associated with the currently visible pending snippet,
      * if any, such that we can replace the snippet with content once work is done
      * @param {1 | -1} d
      * @param {Batch} batch
      */
      #update_pending_count(d, batch) {
        if (!this.has_pending_snippet()) {
          if (this.parent) this.parent.#update_pending_count(d, batch);
          return;
        }
        this.#pending_count += d;
        if (this.#pending_count === 0) {
          this.#resolve(batch);
          if (this.#pending_effect) pause_effect(this.#pending_effect, () => {
            this.#pending_effect = null;
          });
          if (this.#offscreen_fragment) {
            this.#anchor.before(this.#offscreen_fragment);
            this.#offscreen_fragment = null;
          }
        }
      }
      /**
      * Update the source that powers `$effect.pending()` inside this boundary,
      * and controls when the current `pending` snippet (if any) is removed.
      * Do not call from inside the class
      * @param {1 | -1} d
      * @param {Batch} batch
      */
      update_pending_count(d, batch) {
        this.#update_pending_count(d, batch);
        this.#local_pending_count += d;
        if (!this.#effect_pending || this.#pending_count_update_queued) return;
        this.#pending_count_update_queued = true;
        queue_micro_task(() => {
          this.#pending_count_update_queued = false;
          if (this.#effect_pending) internal_set(this.#effect_pending, this.#local_pending_count);
        });
      }
      get_effect_pending() {
        this.#effect_pending_subscriber();
        return get(this.#effect_pending);
      }
      /** @param {unknown} error */
      error(error) {
        if (!this.#props.onerror && !this.#props.failed) throw error;
        if (current_batch?.is_fork) {
          if (this.#main_effect) current_batch.skip_effect(this.#main_effect);
          if (this.#pending_effect) current_batch.skip_effect(this.#pending_effect);
          if (this.#failed_effect) current_batch.skip_effect(this.#failed_effect);
          current_batch.on_fork_commit(() => {
            this.#handle_error(error);
          });
        } else this.#handle_error(error);
      }
      /**
      * @param {unknown} error
      */
      #handle_error(error) {
        if (this.#main_effect) {
          destroy_effect(this.#main_effect);
          this.#main_effect = null;
        }
        if (this.#pending_effect) {
          destroy_effect(this.#pending_effect);
          this.#pending_effect = null;
        }
        if (this.#failed_effect) {
          destroy_effect(this.#failed_effect);
          this.#failed_effect = null;
        }
        if (hydrating) {
          set_hydrate_node(this.#hydrate_open);
          next();
          set_hydrate_node(skip_nodes());
        }
        var onerror = this.#props.onerror;
        let failed = this.#props.failed;
        var did_reset = false;
        var calling_on_error = false;
        const reset = () => {
          if (did_reset) {
            svelte_boundary_reset_noop();
            return;
          }
          did_reset = true;
          if (calling_on_error) svelte_boundary_reset_onerror();
          if (this.#failed_effect !== null) pause_effect(this.#failed_effect, () => {
            this.#failed_effect = null;
          });
          this.#run(() => {
            this.#render();
          });
        };
        const handle_error_result = (transformed_error) => {
          try {
            calling_on_error = true;
            onerror?.(transformed_error, reset);
            calling_on_error = false;
          } catch (error2) {
            invoke_error_boundary(error2, this.#effect && this.#effect.parent);
          }
          if (failed) this.#failed_effect = this.#run(() => {
            try {
              return branch(() => {
                var effect = active_effect;
                effect.b = this;
                effect.f |= 128;
                failed(this.#anchor, () => transformed_error, () => reset);
              });
            } catch (error2) {
              invoke_error_boundary(error2, this.#effect.parent);
              return null;
            }
          });
        };
        queue_micro_task(() => {
          var result;
          try {
            result = this.transform_error(error);
          } catch (e) {
            invoke_error_boundary(e, this.#effect && this.#effect.parent);
            return;
          }
          if (result !== null && typeof result === "object" && typeof result.then === "function")
            result.then(
              handle_error_result,
              /** @param {unknown} e */
              (e) => invoke_error_boundary(e, this.#effect && this.#effect.parent)
            );
          else handle_error_result(result);
        });
      }
    };
    eager_effects = /* @__PURE__ */ new Set();
    old_values = /* @__PURE__ */ new Map();
    eager_effects_deferred = false;
    is_updating_effect = false;
    is_destroying_effect = false;
    active_reaction = null;
    untracking = false;
    active_effect = null;
    current_sources = null;
    new_deps = null;
    skipped_deps = 0;
    untracked_writes = null;
    write_version = 1;
    read_version = 0;
    update_version = read_version;
    DOM_BOOLEAN_ATTRIBUTES = [
      "allowfullscreen",
      "async",
      "autofocus",
      "autoplay",
      "checked",
      "controls",
      "default",
      "disabled",
      "formnovalidate",
      "indeterminate",
      "inert",
      "ismap",
      "loop",
      "multiple",
      "muted",
      "nomodule",
      "novalidate",
      "open",
      "playsinline",
      "readonly",
      "required",
      "reversed",
      "seamless",
      "selected",
      "webkitdirectory",
      "defer",
      "disablepictureinpicture",
      "disableremoteplayback"
    ];
    PASSIVE_EVENTS = ["touchstart", "touchmove"];
    INVALID_ATTR_NAME_CHAR_REGEX = /[\s'">/=\u{FDD0}-\u{FDEF}\u{FFFE}\u{FFFF}\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}]/u;
    obfuscated_import = (module_name) => import(
      /* @vite-ignore */
      module_name
    );
    Renderer = class Renderer2 {
      /**
      * The contents of the renderer.
      * @type {RendererItem[]}
      */
      #out = [];
      /**
      * Any `onDestroy` callbacks registered during execution of this renderer.
      * @type {(() => void)[] | undefined}
      */
      #on_destroy = void 0;
      /**
      * Whether this renderer is a component body.
      * @type {boolean}
      */
      #is_component_body = false;
      /**
      * If set, this renderer is an error boundary. When async collection
      * of the children fails, the failed snippet is rendered instead.
      * @type {{
      * 	failed: (renderer: Renderer, error: unknown, reset: () => void) => void;
      * 	transformError: (error: unknown) => unknown;
      * 	context: SSRContext | null;
      * } | null}
      */
      #boundary = null;
      /**
      * The type of string content that this renderer is accumulating.
      * @type {RendererType}
      */
      type;
      /** @type {Renderer | undefined} */
      #parent;
      /**
      * Asynchronous work associated with this renderer
      * @type {Promise<void> | undefined}
      */
      promise = void 0;
      /**
      * State which is associated with the content tree as a whole.
      * It will be re-exposed, uncopied, on all children.
      * @type {SSRState}
      * @readonly
      */
      global;
      /**
      * State that is local to the branch it is declared in.
      * It will be shallow-copied to all children.
      *
      * @type {{ select_value: string | undefined }}
      */
      local;
      /**
      * @param {SSRState} global
      * @param {Renderer | undefined} [parent]
      */
      constructor(global, parent) {
        this.#parent = parent;
        this.global = global;
        this.local = parent ? { ...parent.local } : { select_value: void 0 };
        this.type = parent ? parent.type : "body";
      }
      /**
      * @param {(renderer: Renderer) => void} fn
      */
      head(fn) {
        const head = new Renderer2(this.global, this);
        head.type = "head";
        this.#out.push(head);
        head.child(fn);
      }
      /**
      * @param {Array<Promise<void>>} blockers
      * @param {(renderer: Renderer) => void} fn
      */
      async_block(blockers, fn) {
        this.#out.push(BLOCK_OPEN);
        this.async(blockers, fn);
        this.#out.push(BLOCK_CLOSE);
      }
      /**
      * @param {Array<Promise<void>>} blockers
      * @param {(renderer: Renderer) => void} fn
      */
      async(blockers, fn) {
        let callback = fn;
        if (blockers.length > 0) {
          const context2 = ssr_context;
          callback = (renderer) => {
            return Promise.all(blockers).then(() => {
              const previous_context = ssr_context;
              try {
                set_ssr_context(context2);
                return fn(renderer);
              } finally {
                set_ssr_context(previous_context);
              }
            });
          };
        }
        this.child(callback);
      }
      /**
      * @param {Array<() => void>} thunks
      */
      run(thunks) {
        const context2 = ssr_context;
        let promise = Promise.resolve(thunks[0]());
        const promises = [promise];
        for (const fn of thunks.slice(1)) {
          promise = promise.then(() => {
            const previous_context = ssr_context;
            set_ssr_context(context2);
            try {
              return fn();
            } finally {
              set_ssr_context(previous_context);
            }
          });
          promises.push(promise);
        }
        promise.catch(noop);
        this.promise = promise;
        return promises;
      }
      /**
      * @param {(renderer: Renderer) => MaybePromise<void>} fn
      */
      child_block(fn) {
        this.#out.push(BLOCK_OPEN);
        this.child(fn);
        this.#out.push(BLOCK_CLOSE);
      }
      /**
      * Create a child renderer. The child renderer inherits the state from the parent,
      * but has its own content.
      * @param {(renderer: Renderer) => MaybePromise<void>} fn
      */
      child(fn) {
        const child = new Renderer2(this.global, this);
        this.#out.push(child);
        const parent = ssr_context;
        set_ssr_context({
          ...ssr_context,
          p: parent,
          c: null,
          r: child
        });
        const result = fn(child);
        set_ssr_context(parent);
        if (result instanceof Promise) {
          result.catch(noop);
          result.finally(() => set_ssr_context(null)).catch(noop);
          if (child.global.mode === "sync") await_invalid();
          child.promise = result;
        }
        return child;
      }
      /**
      * Render children inside an error boundary. If the children throw and the API-level
      * `transformError` transform handles the error (doesn't re-throw), the `failed` snippet is
      * rendered instead. Otherwise the error propagates.
      *
      * @param {{ failed?: (renderer: Renderer, error: unknown, reset: () => void) => void }} props
      * @param {(renderer: Renderer) => MaybePromise<void>} children_fn
      */
      boundary(props, children_fn) {
        const child = new Renderer2(this.global, this);
        this.#out.push(child);
        const parent_context = ssr_context;
        if (props.failed) child.#boundary = {
          failed: props.failed,
          transformError: this.global.transformError,
          context: parent_context
        };
        set_ssr_context({
          ...ssr_context,
          p: parent_context,
          c: null,
          r: child
        });
        try {
          const result = children_fn(child);
          set_ssr_context(parent_context);
          if (result instanceof Promise) {
            if (child.global.mode === "sync") await_invalid();
            result.catch(noop);
            child.promise = result;
          }
        } catch (error) {
          set_ssr_context(parent_context);
          const failed_snippet = props.failed;
          if (!failed_snippet) throw error;
          const result = this.global.transformError(error);
          child.#out.length = 0;
          child.#boundary = null;
          if (result instanceof Promise) {
            if (this.global.mode === "sync") await_invalid();
            child.promise = result.then((transformed) => {
              set_ssr_context(parent_context);
              child.#out.push(Renderer2.#serialize_failed_boundary(transformed));
              failed_snippet(child, transformed, noop);
              child.#out.push(BLOCK_CLOSE);
            });
            child.promise.catch(noop);
          } else {
            child.#out.push(Renderer2.#serialize_failed_boundary(result));
            failed_snippet(child, result, noop);
            child.#out.push(BLOCK_CLOSE);
          }
        }
      }
      /**
      * Create a component renderer. The component renderer inherits the state from the parent,
      * but has its own content. It is treated as an ordering boundary for ondestroy callbacks.
      * @param {(renderer: Renderer) => MaybePromise<void>} fn
      * @param {Function} [component_fn]
      * @returns {void}
      */
      component(fn, component_fn) {
        push$1();
        const child = this.child(fn);
        child.#is_component_body = true;
        pop$1();
      }
      /**
      * @param {Record<string, any>} attrs
      * @param {(renderer: Renderer) => void} fn
      * @param {string | undefined} [css_hash]
      * @param {Record<string, boolean> | undefined} [classes]
      * @param {Record<string, string> | undefined} [styles]
      * @param {number | undefined} [flags]
      * @param {boolean | undefined} [is_rich]
      * @returns {void}
      */
      select(attrs, fn, css_hash, classes, styles, flags2, is_rich) {
        const { value, ...select_attrs } = attrs;
        this.push(`<select${attributes(select_attrs, css_hash, classes, styles, flags2)}>`);
        this.child((renderer) => {
          renderer.local.select_value = value;
          fn(renderer);
        });
        this.push(`${is_rich ? "<!>" : ""}</select>`);
      }
      /**
      * @param {Record<string, any>} attrs
      * @param {string | number | boolean | ((renderer: Renderer) => void)} body
      * @param {string | undefined} [css_hash]
      * @param {Record<string, boolean> | undefined} [classes]
      * @param {Record<string, string> | undefined} [styles]
      * @param {number | undefined} [flags]
      * @param {boolean | undefined} [is_rich]
      */
      option(attrs, body, css_hash, classes, styles, flags2, is_rich) {
        this.#out.push(`<option${attributes(attrs, css_hash, classes, styles, flags2)}`);
        const close = (renderer, value, { head, body: body2 }) => {
          if (has_own_property.call(attrs, "value")) value = attrs.value;
          if (value === this.local.select_value) renderer.#out.push(' selected=""');
          renderer.#out.push(`>${body2}${is_rich ? "<!>" : ""}</option>`);
          if (head) renderer.head((child) => child.push(head));
        };
        if (typeof body === "function") this.child((renderer) => {
          const r2 = new Renderer2(this.global, this);
          body(r2);
          if (this.global.mode === "async") return r2.#collect_content_async().then((content) => {
            close(renderer, content.body.replaceAll("<!---->", ""), content);
          });
          else {
            const content = r2.#collect_content();
            close(renderer, content.body.replaceAll("<!---->", ""), content);
          }
        });
        else close(this, body, { body: escape_html(body) });
      }
      /**
      * @param {(renderer: Renderer) => void} fn
      */
      title(fn) {
        const path = this.get_path();
        const close = (head) => {
          this.global.set_title(head, path);
        };
        this.child((renderer) => {
          const r2 = new Renderer2(renderer.global, renderer);
          fn(r2);
          if (renderer.global.mode === "async") return r2.#collect_content_async().then((content) => {
            close(content.head);
          });
          else close(r2.#collect_content().head);
        });
      }
      /**
      * @param {string | (() => Promise<string>)} content
      */
      push(content) {
        if (typeof content === "function") this.child(async (renderer) => renderer.push(await content()));
        else this.#out.push(content);
      }
      /**
      * @param {() => void} fn
      */
      on_destroy(fn) {
        (this.#on_destroy ??= []).push(fn);
      }
      /**
      * @returns {number[]}
      */
      get_path() {
        return this.#parent ? [...this.#parent.get_path(), this.#parent.#out.indexOf(this)] : [];
      }
      /**
      * @deprecated this is needed for legacy component bindings
      */
      copy() {
        const copy = new Renderer2(this.global, this.#parent);
        copy.#out = this.#out.map((item) => item instanceof Renderer2 ? item.copy() : item);
        copy.promise = this.promise;
        return copy;
      }
      /**
      * @param {Renderer} other
      * @deprecated this is needed for legacy component bindings
      */
      subsume(other) {
        if (this.global.mode !== other.global.mode) throw new Error("invariant: A renderer cannot switch modes. If you're seeing this, there's a compiler bug. File an issue!");
        this.local = other.local;
        this.#out = other.#out.map((item, i) => {
          const current = this.#out[i];
          if (current instanceof Renderer2 && item instanceof Renderer2) {
            current.subsume(item);
            return current;
          }
          return item;
        });
        this.promise = other.promise;
        this.type = other.type;
      }
      get length() {
        return this.#out.length;
      }
      /**
      * Creates the hydration comment that marks the start of a failed boundary.
      * The error is JSON-serialized and embedded inside an HTML comment for the client
      * to parse during hydration. The JSON is escaped to prevent `-->` or `<!--` sequences
      * from breaking out of the comment (XSS). Uses unicode escapes which `JSON.parse()`
      * handles transparently.
      * @param {unknown} error
      * @returns {string}
      */
      static #serialize_failed_boundary(error) {
        return `<!--[?${JSON.stringify(error).replace(/>/g, "\\u003e").replace(/</g, "\\u003c")}-->`;
      }
      /**
      * Only available on the server and when compiling with the `server` option.
      * Takes a component and returns an object with `body` and `head` properties on it, which you can use to populate the HTML when server-rendering your app.
      * @template {Record<string, any>} Props
      * @param {Component<Props>} component
      * @param {{ props?: Omit<Props, '$$slots' | '$$events'>; context?: Map<any, any>; idPrefix?: string; csp?: Csp }} [options]
      * @returns {RenderOutput}
      */
      static render(component2, options2 = {}) {
        let sync;
        const result = {};
        Object.defineProperties(result, {
          html: { get: () => {
            return (sync ??= Renderer2.#render(component2, options2)).body;
          } },
          head: { get: () => {
            return (sync ??= Renderer2.#render(component2, options2)).head;
          } },
          body: { get: () => {
            return (sync ??= Renderer2.#render(component2, options2)).body;
          } },
          hashes: { value: { script: "" } },
          then: { value: (onfulfilled, onrejected) => {
            {
              const result2 = sync ??= Renderer2.#render(component2, options2);
              const user_result = onfulfilled({
                head: result2.head,
                body: result2.body,
                html: result2.body,
                hashes: { script: [] }
              });
              return Promise.resolve(user_result);
            }
          } }
        });
        return result;
      }
      /**
      * Collect all of the `onDestroy` callbacks registered during rendering. In an async context, this is only safe to call
      * after awaiting `collect_async`.
      *
      * Child renderers are "porous" and don't affect execution order, but component body renderers
      * create ordering boundaries. Within a renderer, callbacks run in order until hitting a component boundary.
      * @returns {Iterable<() => void>}
      */
      *#collect_on_destroy() {
        for (const component2 of this.#traverse_components()) yield* component2.#collect_ondestroy();
      }
      /**
      * Performs a depth-first search of renderers, yielding the deepest components first, then additional components as we backtrack up the tree.
      * @returns {Iterable<Renderer>}
      */
      *#traverse_components() {
        for (const child of this.#out) if (typeof child !== "string") yield* child.#traverse_components();
        if (this.#is_component_body) yield this;
      }
      /**
      * @returns {Iterable<() => void>}
      */
      *#collect_ondestroy() {
        if (this.#on_destroy) for (const fn of this.#on_destroy) yield fn;
        for (const child of this.#out) if (child instanceof Renderer2 && !child.#is_component_body) yield* child.#collect_ondestroy();
      }
      /**
      * Render a component. Throws if any of the children are performing asynchronous work.
      *
      * @template {Record<string, any>} Props
      * @param {Component<Props>} component
      * @param {{ props?: Omit<Props, '$$slots' | '$$events'>; context?: Map<any, any>; idPrefix?: string }} options
      * @returns {AccumulatedContent}
      */
      static #render(component2, options2) {
        var previous_context = ssr_context;
        try {
          const renderer = Renderer2.#open_render("sync", component2, options2);
          const content = renderer.#collect_content();
          return Renderer2.#close_render(content, renderer);
        } finally {
          abort();
          set_ssr_context(previous_context);
        }
      }
      /**
      * Render a component.
      *
      * @template {Record<string, any>} Props
      * @param {Component<Props>} component
      * @param {{ props?: Omit<Props, '$$slots' | '$$events'>; context?: Map<any, any>; idPrefix?: string; csp?: Csp }} options
      * @returns {Promise<AccumulatedContent & { hashes: { script: Sha256Source[] } }>}
      */
      static async #render_async(component2, options2) {
        const previous_context = ssr_context;
        try {
          const renderer = Renderer2.#open_render("async", component2, options2);
          const content = await renderer.#collect_content_async();
          const hydratables = await renderer.#collect_hydratables();
          if (hydratables !== null) content.head = hydratables + content.head;
          return Renderer2.#close_render(content, renderer);
        } finally {
          set_ssr_context(previous_context);
          abort();
        }
      }
      /**
      * Collect all of the code from the `out` array and return it as a string, or a promise resolving to a string.
      * @param {AccumulatedContent} content
      * @returns {AccumulatedContent}
      */
      #collect_content(content = {
        head: "",
        body: ""
      }) {
        for (const item of this.#out) if (typeof item === "string") content[this.type] += item;
        else if (item instanceof Renderer2) item.#collect_content(content);
        return content;
      }
      /**
      * Collect all of the code from the `out` array and return it as a string.
      * @param {AccumulatedContent} content
      * @returns {Promise<AccumulatedContent>}
      */
      async #collect_content_async(content = {
        head: "",
        body: ""
      }) {
        await this.promise;
        for (const item of this.#out) if (typeof item === "string") content[this.type] += item;
        else if (item instanceof Renderer2) if (item.#boundary) {
          const boundary_content = {
            head: "",
            body: ""
          };
          try {
            await item.#collect_content_async(boundary_content);
            content.head += boundary_content.head;
            content.body += boundary_content.body;
          } catch (error) {
            const { context: context2, failed, transformError } = item.#boundary;
            set_ssr_context(context2);
            let transformed = await transformError(error);
            const failed_renderer = new Renderer2(item.global, item);
            failed_renderer.type = item.type;
            failed_renderer.#out.push(Renderer2.#serialize_failed_boundary(transformed));
            failed(failed_renderer, transformed, noop);
            failed_renderer.#out.push(BLOCK_CLOSE);
            await failed_renderer.#collect_content_async(content);
          }
        } else await item.#collect_content_async(content);
        return content;
      }
      async #collect_hydratables() {
        const ctx = get_render_context().hydratable;
        for (const [_, key] of ctx.unresolved_promises) unresolved_hydratable(key, ctx.lookup.get(key)?.stack ?? "<missing stack trace>");
        for (const comparison of ctx.comparisons) await comparison;
        return await this.#hydratable_block(ctx);
      }
      /**
      * @template {Record<string, any>} Props
      * @param {'sync' | 'async'} mode
      * @param {import('svelte').Component<Props>} component
      * @param {{ props?: Omit<Props, '$$slots' | '$$events'>; context?: Map<any, any>; idPrefix?: string; csp?: Csp; transformError?: (error: unknown) => unknown }} options
      * @returns {Renderer}
      */
      static #open_render(mode, component2, options2) {
        if (options2.idPrefix?.includes("--")) invalid_id_prefix();
        var previous_context = ssr_context;
        try {
          const renderer = new Renderer2(new SSRState(mode, options2.idPrefix ? options2.idPrefix + "-" : "", options2.csp, options2.transformError));
          set_ssr_context({
            p: null,
            c: options2.context ?? null,
            r: renderer
          });
          renderer.push(BLOCK_OPEN);
          component2(renderer, options2.props ?? {});
          renderer.push(BLOCK_CLOSE);
          return renderer;
        } finally {
          set_ssr_context(previous_context);
        }
      }
      /**
      * @param {AccumulatedContent} content
      * @param {Renderer} renderer
      * @returns {AccumulatedContent & { hashes: { script: Sha256Source[] } }}
      */
      static #close_render(content, renderer) {
        for (const cleanup of renderer.#collect_on_destroy()) cleanup();
        let head = content.head + renderer.global.get_title();
        let body = content.body;
        for (const { hash, code } of renderer.global.css) head += `<style id="${hash}">${code}</style>`;
        return {
          head,
          body,
          hashes: { script: renderer.global.csp.script_hashes }
        };
      }
      /**
      * @param {HydratableContext} ctx
      */
      async #hydratable_block(ctx) {
        if (ctx.lookup.size === 0) return null;
        let entries = [];
        let has_promises = false;
        for (const [k, v] of ctx.lookup) {
          if (v.promises) {
            has_promises = true;
            for (const p of v.promises) await p;
          }
          entries.push(`[${uneval(k)},${v.serialized}]`);
        }
        let prelude = `const h = (window.__svelte ??= {}).h ??= new Map();`;
        if (has_promises) prelude = `const r = (v) => Promise.resolve(v);
				${prelude}`;
        const body = `
			{
				${prelude}

				for (const [k, v] of [
					${entries.join(",\n					")}
				]) {
					h.set(k, v);
				}
			}
		`;
        let csp_attr = "";
        if (this.global.csp.nonce) csp_attr = ` nonce="${this.global.csp.nonce}"`;
        else if (this.global.csp.hash) {
          const hash = await sha256(body);
          this.global.csp.script_hashes.push(`sha256-${hash}`);
        }
        return `
		<script${csp_attr}>${body}</script>`;
      }
    };
    SSRState = class {
      /** @readonly @type {Csp & { script_hashes: Sha256Source[] }} */
      csp;
      /** @readonly @type {'sync' | 'async'} */
      mode;
      /** @readonly @type {() => string} */
      uid;
      /** @readonly @type {Set<{ hash: string; code: string }>} */
      css = /* @__PURE__ */ new Set();
      /**
      * `transformError` passed to `render`. Called when an error boundary catches an error.
      * Throws by default if unset in `render`.
      * @type {(error: unknown) => unknown}
      */
      transformError;
      /** @type {{ path: number[], value: string }} */
      #title = {
        path: [],
        value: ""
      };
      /**
      * @param {'sync' | 'async'} mode
      * @param {string} id_prefix
      * @param {Csp} csp
      * @param {((error: unknown) => unknown) | undefined} [transformError]
      */
      constructor(mode, id_prefix = "", csp = { hash: false }, transformError) {
        this.mode = mode;
        this.csp = {
          ...csp,
          script_hashes: []
        };
        this.transformError = transformError ?? ((error) => {
          throw error;
        });
        let uid2 = 1;
        this.uid = () => `${id_prefix}s${uid2++}`;
      }
      get_title() {
        return this.#title.value;
      }
      /**
      * Performs a depth-first (lexicographic) comparison using the path. Rejects sets
      * from earlier than or equal to the current value.
      * @param {string} value
      * @param {number[]} path
      */
      set_title(value, path) {
        const current = this.#title.path;
        let i = 0;
        let l = Math.min(path.length, current.length);
        while (i < l && path[i] === current[i]) i += 1;
        if (path[i] === void 0) return;
        if (current[i] === void 0 || path[i] > current[i]) {
          this.#title.path = path;
          this.#title.value = value;
        }
      }
    };
  }
});

// build/server/chunks/index-DBqjc0Yf.js
var init_index_DBqjc0Yf = __esm({
  "build/server/chunks/index-DBqjc0Yf.js"() {
    "use strict";
  }
});

// build/server/chunks/internal-CWmLilQ4.js
function validator(expected) {
  function validate(module, file) {
    if (!module) return;
    for (const key in module) {
      if (key[0] === "_" || expected.has(key)) continue;
      const values = [...expected.values()];
      const hint = hint_for_supported_files(key, file?.slice(file.lastIndexOf("."))) ?? `valid exports are ${values.join(", ")}, or anything with a '_' prefix`;
      throw new Error(`Invalid export '${key}'${file ? ` in ${file}` : ""} (${hint})`);
    }
  }
  return validate;
}
function hint_for_supported_files(key, ext = ".js") {
  const supported_files = [];
  if (valid_layout_exports.has(key)) supported_files.push(`+layout${ext}`);
  if (valid_page_exports.has(key)) supported_files.push(`+page${ext}`);
  if (valid_layout_server_exports.has(key)) supported_files.push(`+layout.server${ext}`);
  if (valid_page_server_exports.has(key)) supported_files.push(`+page.server${ext}`);
  if (valid_server_exports.has(key)) supported_files.push(`+server${ext}`);
  if (supported_files.length > 0) return `'${key}' is a valid export in ${supported_files.slice(0, -1).join(", ")}${supported_files.length > 1 ? " or " : ""}${supported_files.at(-1)}`;
}
function handle_event_propagation(event) {
  var handler_element = this;
  var owner_document = handler_element.ownerDocument;
  var event_name = event.type;
  var path = event.composedPath?.() || [];
  var current_target = path[0] || event.target;
  last_propagated_event = event;
  var path_idx = 0;
  var handled_at = last_propagated_event === event && event[event_symbol];
  if (handled_at) {
    var at_idx = path.indexOf(handled_at);
    if (at_idx !== -1 && (handler_element === document || handler_element === window)) {
      event[event_symbol] = handler_element;
      return;
    }
    var handler_idx = path.indexOf(handler_element);
    if (handler_idx === -1) return;
    if (at_idx <= handler_idx) path_idx = at_idx;
  }
  current_target = path[path_idx] || event.target;
  if (current_target === handler_element) return;
  define_property(event, "currentTarget", {
    configurable: true,
    get() {
      return current_target || owner_document;
    }
  });
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  set_active_reaction(null);
  set_active_effect(null);
  try {
    var throw_error;
    var other_errors = [];
    while (current_target !== null) {
      var parent_element = current_target.assignedSlot || current_target.parentNode || current_target.host || null;
      try {
        var delegated = current_target[event_symbol]?.[event_name];
        if (delegated != null && (!current_target.disabled || event.target === current_target)) delegated.call(current_target, event);
      } catch (error) {
        if (throw_error) other_errors.push(error);
        else throw_error = error;
      }
      if (event.cancelBubble || parent_element === handler_element || parent_element === null) break;
      current_target = parent_element;
    }
    if (throw_error) {
      for (let error of other_errors) queueMicrotask(() => {
        throw error;
      });
      throw throw_error;
    }
  } finally {
    event[event_symbol] = handler_element;
    delete event.currentTarget;
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
  }
}
function assign_nodes(start, end) {
  var effect = active_effect;
  if (effect.nodes === null) effect.nodes = {
    start,
    end,
    a: null,
    t: null
  };
}
function mount(component2, options2) {
  return _mount(component2, options2);
}
function hydrate(component2, options2) {
  init_operations();
  options2.intro = options2.intro ?? false;
  const target = options2.target;
  const was_hydrating = hydrating;
  const previous_hydrate_node = hydrate_node;
  try {
    var anchor = get_first_child(target);
    while (anchor && (anchor.nodeType !== 8 || anchor.data !== "[")) anchor = get_next_sibling(anchor);
    if (!anchor) throw HYDRATION_ERROR;
    set_hydrating(true);
    set_hydrate_node(anchor);
    const instance = _mount(component2, {
      ...options2,
      anchor
    });
    set_hydrating(false);
    return instance;
  } catch (error) {
    if (error instanceof Error && error.message.split("\n").some((line) => line.startsWith("https://svelte.dev/e/"))) throw error;
    if (error !== HYDRATION_ERROR) console.warn("Failed to hydrate: ", error);
    if (options2.recover === false) hydration_failed();
    init_operations();
    clear_text_content(target);
    set_hydrating(false);
    return mount(component2, options2);
  } finally {
    set_hydrating(was_hydrating);
    set_hydrate_node(previous_hydrate_node);
  }
}
function _mount(Component, { target, anchor, props = {}, events, context: context2, intro = true, transformError }) {
  init_operations();
  var component2 = void 0;
  var unmount3 = component_root(() => {
    var anchor_node = anchor ?? target.appendChild(create_text());
    boundary(anchor_node, { pending: () => {
    } }, (anchor_node2) => {
      push({});
      var ctx = component_context;
      if (context2) ctx.c = context2;
      if (events)
        props.$$events = events;
      if (hydrating) assign_nodes(anchor_node2, null);
      component2 = Component(anchor_node2, props) || {};
      if (hydrating) {
        active_effect.nodes.end = hydrate_node;
        if (hydrate_node === null || hydrate_node.nodeType !== 8 || hydrate_node.data !== "]") {
          hydration_mismatch();
          throw HYDRATION_ERROR;
        }
      }
      pop();
    }, transformError);
    var registered_events = /* @__PURE__ */ new Set();
    var event_handle = (events2) => {
      for (var i = 0; i < events2.length; i++) {
        var event_name = events2[i];
        if (registered_events.has(event_name)) continue;
        registered_events.add(event_name);
        var passive = is_passive_event(event_name);
        for (const node of [target, document]) {
          var counts = listeners.get(node);
          if (counts === void 0) {
            counts = /* @__PURE__ */ new Map();
            listeners.set(node, counts);
          }
          var count = counts.get(event_name);
          if (count === void 0) {
            node.addEventListener(event_name, handle_event_propagation, { passive });
            counts.set(event_name, 1);
          } else counts.set(event_name, count + 1);
        }
      }
    };
    event_handle(array_from(all_registered_events));
    root_event_handles.add(event_handle);
    return () => {
      for (var event_name of registered_events) for (const node of [target, document]) {
        var counts = listeners.get(node);
        var count = counts.get(event_name);
        if (--count == 0) {
          node.removeEventListener(event_name, handle_event_propagation);
          counts.delete(event_name);
          if (counts.size === 0) listeners.delete(node);
        } else counts.set(event_name, count);
      }
      root_event_handles.delete(event_handle);
      if (anchor_node !== anchor) anchor_node.parentNode?.removeChild(anchor_node);
    };
  });
  mounted_components.set(component2, unmount3);
  return component2;
}
function unmount(component2, options2) {
  const fn = mounted_components.get(component2);
  if (fn) {
    mounted_components.delete(component2);
    return fn(options2);
  }
  return Promise.resolve();
}
function asClassComponent$1(component2) {
  return class extends Svelte4Component {
    /** @param {any} options */
    constructor(options2) {
      super({
        component: component2,
        ...options2
      });
    }
  };
}
function asClassComponent(component2) {
  const component_constructor = asClassComponent$1(component2);
  const _render = (props, { context: context2, csp, transformError } = {}) => {
    const result = render(component2, {
      props,
      context: context2,
      csp,
      transformError
    });
    const munged = Object.defineProperties({}, {
      css: { value: {
        code: "",
        map: null
      } },
      head: { get: () => result.head },
      html: { get: () => result.body },
      then: {
        /**
        * this is not type-safe, but honestly it's the best I can do right now, and it's a straightforward function.
        *
        * @template TResult1
        * @template [TResult2=never]
        * @param { (value: LegacyRenderResult) => TResult1 } onfulfilled
        * @param { (reason: unknown) => TResult2 } onrejected
        */
        value: (onfulfilled, onrejected) => {
          {
            const user_result = onfulfilled({
              css: munged.css,
              head: munged.head,
              html: munged.html
            });
            return Promise.resolve(user_result);
          }
        }
      }
    });
    return munged;
  };
  component_constructor.render = _render;
  return component_constructor;
}
function Root($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { stores, page: page2, constructors, components = [], form, data_0 = null, data_1 = null, data_2 = null } = $$props;
    setContext("__svelte__", stores);
    stores.page.set(page2);
    const Pyramid_2 = derived(() => constructors[2]);
    if (constructors[1]) {
      $$renderer2.push("<!--[0-->");
      const Pyramid_0 = constructors[0];
      if (Pyramid_0) {
        $$renderer2.push("<!--[-->");
        Pyramid_0($$renderer2, {
          data: data_0,
          form,
          params: page2.params,
          children: ($$renderer3) => {
            if (constructors[2]) {
              $$renderer3.push("<!--[0-->");
              const Pyramid_1 = constructors[1];
              if (Pyramid_1) {
                $$renderer3.push("<!--[-->");
                Pyramid_1($$renderer3, {
                  data: data_1,
                  form,
                  params: page2.params,
                  children: ($$renderer4) => {
                    if (Pyramid_2()) {
                      $$renderer4.push("<!--[-->");
                      Pyramid_2()($$renderer4, {
                        data: data_2,
                        form,
                        params: page2.params
                      });
                      $$renderer4.push("<!--]-->");
                    } else {
                      $$renderer4.push("<!--[!-->");
                      $$renderer4.push("<!--]-->");
                    }
                  },
                  $$slots: { default: true }
                });
                $$renderer3.push("<!--]-->");
              } else {
                $$renderer3.push("<!--[!-->");
                $$renderer3.push("<!--]-->");
              }
            } else {
              $$renderer3.push("<!--[-1-->");
              const Pyramid_1 = constructors[1];
              if (Pyramid_1) {
                $$renderer3.push("<!--[-->");
                Pyramid_1($$renderer3, {
                  data: data_1,
                  form,
                  params: page2.params
                });
                $$renderer3.push("<!--]-->");
              } else {
                $$renderer3.push("<!--[!-->");
                $$renderer3.push("<!--]-->");
              }
            }
            $$renderer3.push(`<!--]-->`);
          },
          $$slots: { default: true }
        });
        $$renderer2.push("<!--]-->");
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push("<!--]-->");
      }
    } else {
      $$renderer2.push("<!--[-1-->");
      const Pyramid_0 = constructors[0];
      if (Pyramid_0) {
        $$renderer2.push("<!--[-->");
        Pyramid_0($$renderer2, {
          data: data_0,
          form,
          params: page2.params
        });
        $$renderer2.push("<!--]-->");
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push("<!--]-->");
      }
    }
    $$renderer2.push(`<!--]--> `);
    $$renderer2.push("<!--[-1-->");
    $$renderer2.push(`<!--]-->`);
  });
}
var buffer, text_encoder2, IN_WEBCONTAINER, als2, internal, valid_layout_exports, valid_page_exports, valid_layout_server_exports, valid_page_server_exports, valid_server_exports, validate_layout_exports, validate_page_exports, validate_layout_server_exports, validate_page_server_exports, event_symbol, all_registered_events, root_event_handles, last_propagated_event, listeners, mounted_components, Svelte4Component, options;
var init_internal_CWmLilQ4 = __esm({
  "build/server/chunks/internal-CWmLilQ4.js"() {
    "use strict";
    init_index_DBqjc0Yf();
    init_dev_DRV_q2AU();
    buffer = typeof process === "object" && process.versions?.node !== void 0;
    text_encoder2 = new TextEncoder();
    IN_WEBCONTAINER = !!globalThis.process?.versions?.webcontainer;
    import("node:async_hooks").then((hooks) => als2 = new hooks.AsyncLocalStorage()).catch(() => {
    });
    internal = new URL("sveltekit-internal://");
    valid_layout_exports = /* @__PURE__ */ new Set([
      "load",
      "prerender",
      "csr",
      "ssr",
      "trailingSlash",
      "config"
    ]);
    valid_page_exports = /* @__PURE__ */ new Set([...valid_layout_exports, "entries"]);
    valid_layout_server_exports = /* @__PURE__ */ new Set([...valid_layout_exports]);
    valid_page_server_exports = /* @__PURE__ */ new Set([
      ...valid_layout_server_exports,
      "actions",
      "entries"
    ]);
    valid_server_exports = /* @__PURE__ */ new Set([
      "GET",
      "POST",
      "PATCH",
      "PUT",
      "DELETE",
      "OPTIONS",
      "HEAD",
      "fallback",
      "prerender",
      "trailingSlash",
      "config",
      "entries"
    ]);
    validate_layout_exports = validator(valid_layout_exports);
    validate_page_exports = validator(valid_page_exports);
    validate_layout_server_exports = validator(valid_layout_server_exports);
    validate_page_server_exports = validator(valid_page_server_exports);
    event_symbol = /* @__PURE__ */ Symbol("events");
    all_registered_events = /* @__PURE__ */ new Set();
    root_event_handles = /* @__PURE__ */ new Set();
    last_propagated_event = null;
    listeners = /* @__PURE__ */ new Map();
    mounted_components = /* @__PURE__ */ new WeakMap();
    Svelte4Component = class {
      /** @type {any} */
      #events;
      /** @type {Record<string, any>} */
      #instance;
      /**
      * @param {ComponentConstructorOptions & {
      *  component: any;
      * }} options
      */
      constructor(options2) {
        var sources = /* @__PURE__ */ new Map();
        var add_source = (key, value) => {
          var s = mutable_source(value, false, false);
          sources.set(key, s);
          return s;
        };
        const props = new Proxy({
          ...options2.props || {},
          $$events: {}
        }, {
          get(target, prop) {
            return get(sources.get(prop) ?? add_source(prop, Reflect.get(target, prop)));
          },
          has(target, prop) {
            if (prop === LEGACY_PROPS) return true;
            get(sources.get(prop) ?? add_source(prop, Reflect.get(target, prop)));
            return Reflect.has(target, prop);
          },
          set(target, prop, value) {
            set(sources.get(prop) ?? add_source(prop, value), value);
            return Reflect.set(target, prop, value);
          }
        });
        this.#instance = (options2.hydrate ? hydrate : mount)(options2.component, {
          target: options2.target,
          anchor: options2.anchor,
          props,
          context: options2.context,
          intro: options2.intro ?? false,
          recover: options2.recover,
          transformError: options2.transformError
        });
        if (!options2?.props?.$$host || options2.sync === false) flushSync();
        this.#events = props.$$events;
        for (const key of Object.keys(this.#instance)) {
          if (key === "$set" || key === "$destroy" || key === "$on") continue;
          define_property(this, key, {
            get() {
              return this.#instance[key];
            },
            /** @param {any} value */
            set(value) {
              this.#instance[key] = value;
            },
            enumerable: true
          });
        }
        this.#instance.$set = (next2) => {
          Object.assign(props, next2);
        };
        this.#instance.$destroy = () => {
          unmount(this.#instance);
        };
      }
      /** @param {Record<string, any>} props */
      $set(props) {
        this.#instance.$set(props);
      }
      /**
      * @param {string} event
      * @param {(...args: any[]) => any} callback
      * @returns {any}
      */
      $on(event, callback) {
        this.#events[event] = this.#events[event] || [];
        const cb = (...args) => callback.call(this, ...args);
        this.#events[event].push(cb);
        return () => {
          this.#events[event] = this.#events[event].filter(
            /** @param {any} fn */
            (fn) => fn !== cb
          );
        };
      }
      $destroy() {
        this.#instance.$destroy();
      }
    };
    options = {
      app_template_contains_nonce: false,
      async: false,
      csp: {
        "mode": "auto",
        "directives": {
          "upgrade-insecure-requests": false,
          "block-all-mixed-content": false
        },
        "reportOnly": {
          "upgrade-insecure-requests": false,
          "block-all-mixed-content": false
        }
      },
      csrf_check_origin: true,
      csrf_trusted_origins: [],
      embedded: false,
      env_public_prefix: "PUBLIC_",
      env_private_prefix: "",
      hash_routing: false,
      hooks: null,
      preload_strategy: "modulepreload",
      root: asClassComponent(Root),
      service_worker: false,
      service_worker_options: void 0,
      server_error_boundaries: false,
      templates: {
        app: ({ head, body, assets, nonce, env }) => '<!doctype html>\n<html lang="en">\n\n<head>\n	<meta charset="utf-8" />\n	<link rel="icon" href="' + assets + '/favicon.svg" />\n	<link rel="apple-touch-icon" href="' + assets + '/favicon.ico" />\n	<meta name="viewport" content="width=device-width, initial-scale=1" />\n	' + head + `
	<!-- Font Awesome Free via jsDelivr (all.min.css + webfonts from same host) -->
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@7.1.0/css/all.min.css"
		integrity="sha256-4rTIfo5GQTi/7UJqoyUJQKzxW8VN/YBH31+Cy+vTZj4=" crossorigin="anonymous" media="print"
		onload="this?.setAttribute('media','all')" />
	<noscript>
		<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@7.1.0/css/all.min.css"
			crossorigin="anonymous" />
	</noscript>
</head>

<body data-sveltekit-preload-data="hover">
	<div>` + body + "</div>\n</body>\n\n</html>",
        error: ({ status, message }) => '<!doctype html>\n<html lang="en">\n	<head>\n		<meta charset="utf-8" />\n		<title>' + message + `</title>

		<style>
			body {
				--bg: white;
				--fg: #222;
				--divider: #ccc;
				background: var(--bg);
				color: var(--fg);
				font-family:
					system-ui,
					-apple-system,
					BlinkMacSystemFont,
					'Segoe UI',
					Roboto,
					Oxygen,
					Ubuntu,
					Cantarell,
					'Open Sans',
					'Helvetica Neue',
					sans-serif;
				display: flex;
				align-items: center;
				justify-content: center;
				height: 100vh;
				margin: 0;
			}

			.error {
				display: flex;
				align-items: center;
				max-width: 32rem;
				margin: 0 1rem;
			}

			.status {
				font-weight: 200;
				font-size: 3rem;
				line-height: 1;
				position: relative;
				top: -0.05rem;
			}

			.message {
				border-left: 1px solid var(--divider);
				padding: 0 0 0 1rem;
				margin: 0 0 0 1rem;
				min-height: 2.5rem;
				display: flex;
				align-items: center;
			}

			.message h1 {
				font-weight: 400;
				font-size: 1em;
				margin: 0;
			}

			@media (prefers-color-scheme: dark) {
				body {
					--bg: #222;
					--fg: #ddd;
					--divider: #666;
				}
			}
		</style>
	</head>
	<body>
		<div class="error">
			<span class="status">` + status + '</span>\n			<div class="message">\n				<h1>' + message + "</h1>\n			</div>\n		</div>\n	</body>\n</html>\n"
      },
      version_hash: "8gfajj"
    };
  }
});

// build/server/chunks/client-Bx1jeKXJ.js
function hydratable(key, fn) {
  experimental_async_required();
  const { hydratable: hydratable2 } = get_render_context();
  let entry = hydratable2.lookup.get(key);
  if (entry !== void 0) return entry.value;
  const value = fn();
  entry = encode(key, value, hydratable2.unresolved_promises);
  hydratable2.lookup.set(key, entry);
  return value;
}
function encode(key, value, unresolved) {
  const entry = {
    value,
    serialized: ""
  };
  let uid2 = 1;
  entry.serialized = uneval(entry.value, (value2, uneval2) => {
    if (is_promise(value2)) {
      const placeholder = `"${uid2++}"`;
      const p = value2.then((v) => {
        entry.serialized = entry.serialized.replace(placeholder, `r(${uneval2(v)})`);
      }).catch((devalue_error) => hydratable_serialization_failed(key, serialization_stack(entry.stack, devalue_error?.stack)));
      p.catch(() => {
      }).finally(() => unresolved?.delete(p));
      (entry.promises ??= []).push(p);
      return placeholder;
    }
  });
  return entry;
}
function is_promise(value) {
  return Object.prototype.toString.call(value) === "[object Promise]";
}
function serialization_stack(root_stack, uneval_stack) {
  let out = "";
  if (root_stack) out += root_stack + "\n";
  if (uneval_stack) out += "Caused by:\n" + uneval_stack + "\n";
  return out || "<missing stack trace>";
}
function createRawSnippet(fn) {
  return (renderer, ...args) => {
    var getters = args.map((value) => () => value);
    renderer.push(fn(...getters).render().trim());
  };
}
function onDestroy(fn) {
  ssr_context.r.on_destroy(fn);
}
function createEventDispatcher() {
  return noop;
}
function mount2() {
  lifecycle_function_unavailable("mount");
}
function hydrate2() {
  lifecycle_function_unavailable("hydrate");
}
function unmount2() {
  lifecycle_function_unavailable("unmount");
}
function fork() {
  lifecycle_function_unavailable("fork");
}
async function tick$1() {
}
async function settled() {
}
var __defProp2, __exportAll, index_server_exports, is_legacy, placeholder_url, onMount, tick;
var init_client_Bx1jeKXJ = __esm({
  "build/server/chunks/client-Bx1jeKXJ.js"() {
    "use strict";
    init_dev_DRV_q2AU();
    init_internal_CWmLilQ4();
    __defProp2 = Object.defineProperty;
    __exportAll = (all, no_symbols) => {
      let target = {};
      for (var name in all) __defProp2(target, name, {
        get: all[name],
        enumerable: true
      });
      __defProp2(target, Symbol.toStringTag, { value: "Module" });
      return target;
    };
    index_server_exports = __exportAll({
      afterUpdate: () => noop,
      beforeUpdate: () => noop,
      createContext: () => createContext,
      createEventDispatcher: () => createEventDispatcher,
      createRawSnippet: () => createRawSnippet,
      flushSync: () => noop,
      fork: () => fork,
      getAbortSignal: () => getAbortSignal,
      getAllContexts: () => getAllContexts,
      getContext: () => getContext,
      hasContext: () => hasContext,
      hydratable: () => hydratable,
      hydrate: () => hydrate2,
      mount: () => mount2,
      onDestroy: () => onDestroy,
      onMount: () => noop,
      setContext: () => setContext,
      settled: () => settled,
      tick: () => tick$1,
      unmount: () => unmount2,
      untrack: () => run
    });
    is_legacy = noop.toString().includes("$$") || /function \w+\(\) \{\}/.test(noop.toString());
    placeholder_url = "a:";
    if (is_legacy) {
      ({
        data: {},
        form: null,
        error: null,
        params: {},
        route: { id: null },
        state: {},
        status: -1,
        url: new URL(placeholder_url)
      });
    }
    ({ onMount, tick } = index_server_exports);
  }
});

// build/server/chunks/error.svelte-Cxb_zkeY.js
var error_svelte_Cxb_zkeY_exports = {};
__export(error_svelte_Cxb_zkeY_exports, {
  default: () => Error$1
});
function context() {
  return getContext("__request__");
}
function Error$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<h1>${escape_html(page.status)}</h1> <p>${escape_html(page.error?.message)}</p>`);
  });
}
var page;
var init_error_svelte_Cxb_zkeY = __esm({
  "build/server/chunks/error.svelte-Cxb_zkeY.js"() {
    "use strict";
    init_dev_DRV_q2AU();
    init_client_Bx1jeKXJ();
    init_internal_CWmLilQ4();
    init_index_DBqjc0Yf();
    page = {
      get error() {
        return context().page.error;
      },
      get status() {
        return context().page.status;
      }
    };
  }
});

// build/server/chunks/1-CcH5mYJ4.js
var index = 1;
var component_cache;
var component = async () => component_cache ??= (await Promise.resolve().then(() => (init_error_svelte_Cxb_zkeY(), error_svelte_Cxb_zkeY_exports))).default;
var imports = ["_app/immutable/nodes/1.tYHZR0zm.js", "_app/immutable/chunks/DhkMvD30.js", "_app/immutable/chunks/CWEq1J-G.js", "_app/immutable/chunks/D1h2OxpE.js", "_app/immutable/chunks/CP97kCR3.js"];
var stylesheets = [];
var fonts = [];
export {
  component,
  fonts,
  imports,
  index,
  stylesheets
};
