/**
 * DOM minimal pour exécuter le script de la page hors navigateur.
 * Renvoie le bac à sable, où l'on peut lire les nœuds et la couture __pb.
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class El {
  constructor(id, tag = "div") {
    this.id = id;
    this.tagName = String(tag).toUpperCase();
    this._html = "";
    this._text = "";
    this.value = "";
    this.attrs = {};
    this.children = [];
    this.files = null;
    const set = new Set();
    this.classList = {
      add: (c) => set.add(c),
      remove: (c) => set.delete(c),
      contains: (c) => set.has(c),
      toggle: (c) => (set.has(c) ? set.delete(c) : set.add(c)),
    };
    Object.defineProperty(this, "className", { set() {}, get: () => [...set].join(" ") });
  }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v); }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  hasAttribute(k) { return k in this.attrs; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener() {}
  removeEventListener() {}
  appendChild(c) { this.children.push(c); return c; }
  removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  closest() { return null; }
  focus() {}
  select() {}
  click() {}
}

/** Exécute le script de `file` et renvoie le bac à sable. */
function run(file, options = {}) {
  const html = fs.readFileSync(file, "utf8");
  const m = html.match(/<script>\n([\s\S]*?)\n<\/script>/);
  if (!m) throw new Error("aucun script en ligne dans " + file);

  const nodes = new Map();
  const document = {
    getElementById: (id) => {
      if (!nodes.has(id)) nodes.set(id, new El(id));
      return nodes.get(id);
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (t) => new El(null, t),
    addEventListener: () => {},
    body: new El("body", "body"),
    documentElement: new El("html", "html"),
    readyState: "complete",
  };

  const sandbox = {
    document, console, URLSearchParams, Promise, Math, JSON, Date,
    isFinite, parseFloat, parseInt, String, Number, Object, Array, Boolean,
    Error, RegExp, TypeError, Uint8Array, DataView, ArrayBuffer, Buffer,
    encodeURIComponent, decodeURIComponent, atob, btoa,
    navigator: { clipboard: null },
    location: { search: options.search || "", href: "http://test/", reload() {} },
    fetch: () => Promise.reject(new Error("réseau indisponible dans le bac à sable")),
    setTimeout, clearTimeout, setInterval, clearInterval,
    URL: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
    Blob: class {},
    FileReader: class { readAsText() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  if (options.RFX) sandbox.RFX = options.RFX;

  vm.createContext(sandbox);
  vm.runInContext(m[1], sandbox, { filename: path.basename(file) + " (script)" });
  sandbox.__nodes = nodes;
  return sandbox;
}

module.exports = { run, El };
