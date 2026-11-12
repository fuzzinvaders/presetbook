/**
 * Lecture et écriture des chaînes d'effets de Reaper (.RfxChain).
 * Copyright (C) 2026 fuzzinvaders
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Réellement décodé :
 *   - la structure : ordre des effets, état « bypass », identité du plugin ;
 *   - TSE BOD  : son état est du XML, chaque paramètre est nommé ;
 *   - ReaEQ    : bandes typées (fréquence, gain, bande passante) ;
 *   - ReaComp  : 21 flottants dans l'ordre des paramètres génériques ;
 *   - JSFX     : les curseurs sont en texte clair.
 *
 * Conservé sans être interprété : les blocs binaires des plugins dont le
 * format n'est pas établi (ReaVerbate, ReaTune…). Ils sont réécrits à l'octet
 * près, donc un aller-retour ne perd rien — mais leurs valeurs ne se règlent
 * que dans le plugin.
 *
 * Utilisable dans le navigateur (window.RFX) et sous Node (require).
 */
(function (root) {
  "use strict";

  var NUL = String.fromCharCode(0);
  var hasBuffer = typeof Buffer !== "undefined";

  function b64ToBytes(s) {
    s = String(s).replace(/\s+/g, "");
    if (hasBuffer) return new Uint8Array(Buffer.from(s, "base64"));
    var bin = atob(s), out = new Uint8Array(bin.length), i;
    for (i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function bytesToB64(u8) {
    if (hasBuffer) return Buffer.from(u8).toString("base64");
    var s = "", i;
    for (i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
  }

  function latin1(u8) {
    var s = "", i;
    for (i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return s;
  }

  function bytesOfLatin1(str) {
    var out = new Uint8Array(str.length), i;
    for (i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
    return out;
  }

  function concatBytes(list) {
    var n = 0, i;
    for (i = 0; i < list.length; i++) n += list[i].length;
    var out = new Uint8Array(n), o = 0;
    for (i = 0; i < list.length; i++) { out.set(list[i], o); o += list[i].length; }
    return out;
  }

  function wrap64(s, width) {
    var out = [], w = width || 128, i;
    for (i = 0; i < s.length; i += w) out.push(s.slice(i, i + w));
    return out;
  }

  function dv(bytes) { return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); }

  /**
   * L'en-tête du conteneur VST annonce la taille de l'état, douze octets avant
   * sa fin. Quand on réécrit l'état, il faut réécrire cette taille : sinon
   * Reaper lit à côté et refuse la chaîne. Relevé identique sur six plugins,
   * dont deux aux en-têtes de longueurs différentes.
   */
  function setChunkLen(header64, chunk64) {
    if (!header64) return header64;
    var h = b64ToBytes(header64);
    if (h.length < 16) return header64;
    var len = chunk64 ? b64ToBytes(chunk64).length : 0;
    dv(h).setUint32(h.length - 12, len, true);
    return bytesToB64(h);
  }
  function round(v, n) { var f = Math.pow(10, n); return Math.round(v * f) / f; }

  /* ----------------------------------------------- zlib, sans dépendance
     Les états MeldaProduction sont compressés. Décompresser demande un vrai
     inflate (RFC 1951) ; recompresser non : un flux fait de blocs « stockés »
     est un zlib valide, que tout décompresseur accepte. Quelques octets de
     plus, et aucune table de Huffman à écrire.                               */

  var LBASE = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
  var LEXTRA = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  var DBASE = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,
               6145,8193,12289,16385,24577];
  var DEXTRA = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  var CLORDER = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
  var fixedLit = null, fixedDist = null;

  /** Arbre de Huffman canonique, décrit par la longueur de chaque code. */
  function huffman(lengths, count) {
    var max = 0, i;
    for (i = 0; i < count; i++) if (lengths[i] > max) max = lengths[i];
    var perLen = new Int32Array(max + 2);
    for (i = 0; i < count; i++) if (lengths[i]) perLen[lengths[i]]++;
    var next = new Int32Array(max + 2), code = 0, b;
    for (b = 1; b <= max; b++) { code = (code + perLen[b - 1]) << 1; next[b] = code; }
    var map = {};
    for (i = 0; i < count; i++) if (lengths[i]) map[lengths[i] + ":" + next[lengths[i]]++] = i;
    return { map: map, max: max };
  }

  function inflateRaw(src, start) {
    var pos = start | 0, bit = 0, out = new Uint8Array(4096), len = 0;

    function push(b) {
      if (len === out.length) { var g = new Uint8Array(out.length * 2); g.set(out); out = g; }
      out[len++] = b;
    }
    function getBit() {
      if (pos >= src.length) throw new Error("flux compressé tronqué");
      var v = (src[pos] >> bit) & 1;
      if (++bit === 8) { bit = 0; pos++; }
      return v;
    }
    function getBits(k) { var v = 0, i; for (i = 0; i < k; i++) v |= getBit() << i; return v; }
    function sym(tree) {
      var code = 0, l = 0, v;
      for (;;) {
        code = (code << 1) | getBit();
        if (++l > tree.max) throw new Error("code de Huffman invalide");
        v = tree.map[l + ":" + code];
        if (v !== undefined) return v;
      }
    }
    function fixedTrees() {
      if (fixedLit) return;
      var l = new Int32Array(288), i;
      for (i = 0; i < 144; i++) l[i] = 8;
      for (; i < 256; i++) l[i] = 9;
      for (; i < 280; i++) l[i] = 7;
      for (; i < 288; i++) l[i] = 8;
      fixedLit = huffman(l, 288);
      var d = new Int32Array(30);
      for (i = 0; i < 30; i++) d[i] = 5;
      fixedDist = huffman(d, 30);
    }

    for (;;) {
      var last = getBit(), type = getBits(2), lit, dist, i;
      if (type === 0) {
        if (bit) { bit = 0; pos++; }
        var count = src[pos] | (src[pos + 1] << 8);
        pos += 4;
        for (i = 0; i < count; i++) push(src[pos++]);
      } else {
        if (type === 1) { fixedTrees(); lit = fixedLit; dist = fixedDist; }
        else if (type === 2) {
          var hlit = getBits(5) + 257, hdist = getBits(5) + 1, hclen = getBits(4) + 4;
          var clen = new Int32Array(19);
          for (i = 0; i < hclen; i++) clen[CLORDER[i]] = getBits(3);
          var ctree = huffman(clen, 19), all = new Int32Array(hlit + hdist), p = 0, prev = 0, r;
          while (p < all.length) {
            var c = sym(ctree);
            if (c < 16) all[p++] = prev = c;
            else if (c === 16) { r = getBits(2) + 3; while (r--) all[p++] = prev; }
            else if (c === 17) { r = getBits(3) + 3; while (r--) all[p++] = 0; }
            else { r = getBits(7) + 11; while (r--) all[p++] = 0; }
          }
          lit = huffman(all, hlit);
          dist = huffman(all.subarray(hlit), hdist);
        } else throw new Error("bloc deflate de type réservé");

        for (;;) {
          var v = sym(lit);
          if (v === 256) break;
          if (v < 256) { push(v); continue; }
          var li = v - 257, run = LBASE[li] + getBits(LEXTRA[li]);
          var di = sym(dist), back = len - (DBASE[di] + getBits(DEXTRA[di]));
          if (back < 0) throw new Error("distance hors fenêtre");
          for (i = 0; i < run; i++) push(out[back + i]);
        }
      }
      if (last) break;
    }
    return out.subarray(0, len);
  }

  function adler32(b) {
    var a = 1, t = 0, i;
    for (i = 0; i < b.length; i++) { a = (a + b[i]) % 65521; t = (t + a) % 65521; }
    return ((t << 16) | a) >>> 0;
  }

  function zlibInflate(bytes) {
    if (bytes.length < 6 || (bytes[0] & 0x0f) !== 8) throw new Error("ce n'est pas un flux zlib");
    return inflateRaw(bytes, 2);
  }

  /** Octets -> zlib, en blocs « stockés ». */
  function zlibStore(data) {
    var MAX = 65535, blocks = Math.max(1, Math.ceil(data.length / MAX));
    var out = new Uint8Array(2 + blocks * 5 + data.length + 4), o = 0, i, off = 0, n;
    out[o++] = 0x78; out[o++] = 0x01;
    for (i = 0; i < blocks; i++) {
      n = Math.min(MAX, data.length - off);
      out[o++] = i === blocks - 1 ? 1 : 0;
      out[o++] = n & 0xff; out[o++] = (n >> 8) & 0xff;
      out[o++] = ~n & 0xff; out[o++] = (~n >> 8) & 0xff;
      out.set(data.subarray(off, off + n), o);
      o += n; off += n;
    }
    var a = adler32(data);
    out[o++] = (a >>> 24) & 0xff; out[o++] = (a >>> 16) & 0xff;
    out[o++] = (a >>> 8) & 0xff; out[o] = a & 0xff;
    return out;
  }

  /* ------------------------------------------------------------- lecture */

  function parse(text) {
    var lines = String(text).replace(/\r\n/g, "\n").split("\n");
    var items = [], i = 0, pendingBypass = null;

    while (i < lines.length) {
      var line = lines[i];
      var mb = line.match(/^\s*BYPASS\s+(.*)$/);
      if (mb) { pendingBypass = mb[1].trim(); i++; continue; }

      var mv = line.match(/^\s*<VST\s+(.*)$/);
      var mj = line.match(/^\s*<JS\s+(.*)$/);
      if (mv || mj) {
        var head = (mv ? mv[1] : mj[1]).trim();
        var body = [];
        i++;
        while (i < lines.length && !/^\s*>\s*$/.test(lines[i])) { body.push(lines[i].trim()); i++; }
        i++;
        var fx = { kind: mv ? "vst" : "js", head: head, body: body,
                   bypass: pendingBypass === null ? "0 0" : pendingBypass, extra: [] };
        pendingBypass = null;
        while (i < lines.length &&
               /^\s*(FXID|WAK|PRESETNAME|FLOATPOS|PROGRAM|PARMLEARN|PARM|LINKEDCC)\b/.test(lines[i])) {
          fx.extra.push(lines[i]); i++;
        }
        decorate(fx);
        items.push({ type: "fx", fx: fx });
        continue;
      }

      items.push({ type: "raw", line: line });
      i++;
    }
    var fxs = [];
    for (i = 0; i < items.length; i++) if (items[i].type === "fx") fxs.push(items[i].fx);
    return { items: items, fx: fxs };
  }

  function decorate(fx) {
    fx.bypassed = /^1\b/.test(fx.bypass);

    if (fx.kind === "js") {
      var mj = fx.head.match(/^([^\s"]+)\s*(.*)$/);
      fx.path = mj ? mj[1] : fx.head;
      fx.name = fx.path.split("/").pop();
      fx.sliders = (fx.body[0] || "").trim().split(/\s+/);
      fx.decoded = "js";
      return;
    }

    var mh = fx.head.match(/^"([^"]*)"\s+(\S+)\s+(.*)$/);
    fx.label = mh ? mh[1] : fx.head;
    fx.dll = mh ? mh[2] : "";
    fx.headTail = mh ? mh[3] : "";
    fx.name = fx.label.replace(/^VST3?:\s*/, "").replace(/\s*\([^)]*\)\s*$/, "").trim();

    /* première ligne = en-tête du conteneur, dernière = nom de programme, milieu = état */
    fx.header64 = fx.body.length ? fx.body[0] : "";
    fx.name64 = fx.body.length > 1 ? fx.body[fx.body.length - 1] : "";
    fx.chunk64 = fx.body.slice(1, -1).join("");

    var bytes = fx.chunk64 ? b64ToBytes(fx.chunk64) : new Uint8Array(0);
    fx.chunkLen = bytes.length;

    if (/BOD/i.test(fx.name) && decodeBod(fx, bytes)) return;
    if (/ReaEQ/i.test(fx.name) && decodeReaEq(fx, bytes)) return;
    if (/ReaComp/i.test(fx.name) && decodeReaComp(fx, bytes)) return;
    if (/ReaVerbate/i.test(fx.name) && decodeReaVerbate(fx, bytes)) return;
    if (/\(MeldaProduction\)/.test(fx.label) && decodeMelda(fx, bytes)) return;
    fx.decoded = "opaque";
  }

  /* ----------------------------------------------------------------- BOD */

  var BOD_KEYS = ["Input", "Level", "Drive", "Bass", "Treble", "Presence", "Blend", "Bypass", "Quality", "Output"];

  function decodeBod(fx, bytes) {
    var text = latin1(bytes);
    var start = text.indexOf("<BODv");
    if (start < 0) return false;
    var close = text.indexOf("</BOD");
    var end = close < 0 ? -1 : text.indexOf(">", close);
    if (end < 0) return false;
    var xml = text.slice(start, end + 1);
    var params = {}, re = /<PARAM id="BOD_([^"]+)" value="([^"]+)"/g, m, n = 0;
    while ((m = re.exec(xml))) { params[m[1]] = Number(m[2]); n++; }
    if (!n) return false;

    fx.decoded = "bod";
    fx.params = params;
    fx.bodPrefix = text.slice(0, start);
    fx.bodSuffix = text.slice(end + 1);
    fx.bodAttrs = (xml.match(/^<BODv\d[^>]*>/) || [""])[0];
    fx.bodTag = (fx.bodAttrs.match(/^<(BODv\d)/) || ["", "BODv3"])[1];
    return true;
  }

  function encodeBod(fx) {
    var attrs = fx.bodAttrs || '<BODv3 Oversampling="0" MonoInputChannel="0" StereoMode="0">';
    var tag = fx.bodTag || "BODv3";
    var body = "", i, k, v;
    for (i = 0; i < BOD_KEYS.length; i++) {
      k = BOD_KEYS[i];
      v = fx.params[k];
      if (v === undefined || v === null) continue;
      body += '<PARAM id="BOD_' + k + '" value="' + String(Number(v)) + '"/>';
    }
    var xml = attrs + body + "</" + tag + ">";

    /* le préfixe est « VC2! » suivi de la longueur du XML, octet nul compris */
    var prefix = fx.bodPrefix || "VC2!";
    var magic = prefix.slice(0, 4);
    var middle = prefix.length > 8 ? prefix.slice(8) : "";
    var len = xml.length + 1;
    var lenBytes = new Uint8Array(4);
    lenBytes[0] = len & 0xff;
    lenBytes[1] = (len >> 8) & 0xff;
    lenBytes[2] = (len >> 16) & 0xff;
    lenBytes[3] = (len >> 24) & 0xff;

    return concatBytes([
      bytesOfLatin1(magic), lenBytes, bytesOfLatin1(middle),
      bytesOfLatin1(xml), bytesOfLatin1(fx.bodSuffix || NUL)
    ]);
  }

  /* ------------------------------------------------- état MeldaProduction
     Après décompression, « \0MBX » puis un arbre : « X » ouvre un nœud nommé,
     « / » le ferme, « ~ » ferme la racine, « A » porte un attribut nommé et
     typé — « d » double, « s » chaîne, « 1 » octet, « 2 » et « 4 » entiers.
     Relevé sur MTuner, MCompressor et MSaturator : la réécriture de l'arbre
     relu redonne l'octet près le fichier d'origine.

     Le plugin n'écrit que ce qui s'écarte de ses valeurs par défaut : un
     réglage absent n'est pas un réglage à zéro.                              */

  var MELDA_MAGIC = "\u0000MBX";

  function parseMelda(bytes) {
    var i, d = dv(bytes);
    for (i = 0; i < 4; i++) if (bytes[i] !== MELDA_MAGIC.charCodeAt(i)) return null;
    i = 4;
    if (bytes[i] !== 0x58) return null;      /* la racine est un nœud */
    i++;
    function str() { var a = i; while (i < bytes.length && bytes[i] !== 0) i++; var t = latin1(bytes.subarray(a, i)); i++; return t; }
    var root = { name: str(), attrs: [], kids: [] }, pile = [root];
    while (i < bytes.length) {
      var tag = bytes[i++], cur = pile[pile.length - 1];
      if (tag === 0x41) {                    /* A : attribut */
        var k = str(), type = String.fromCharCode(bytes[i++]), v;
        if (type === "d") { v = d.getFloat64(i, true); i += 8; }
        else if (type === "s") { v = str(); }
        else if (type === "1") { v = bytes[i++]; }
        else if (type === "2") { v = d.getInt16(i, true); i += 2; }
        else if (type === "4") { v = d.getInt32(i, true); i += 4; }
        else return null;
        cur.attrs.push({ k: k, t: type, v: v });
      } else if (tag === 0x58) {             /* X : nœud fils */
        var kid = { name: str(), attrs: [], kids: [] };
        cur.kids.push(kid); pile.push(kid);
      } else if (tag === 0x2f) {             /* / : fin de nœud */
        pile.pop();
        if (!pile.length) break;
      } else if (tag === 0x7e) break;        /* ~ : fin de la racine */
      else return null;
    }
    return root;
  }

  function buildMelda(root) {
    var parts = [];
    function put(t) { parts.push(bytesOfLatin1(t)); }
    function num(type, v) {
      var b = new Uint8Array(type === "d" ? 8 : type === "4" ? 4 : type === "2" ? 2 : 1), w = dv(b);
      if (type === "d") w.setFloat64(0, Number(v), true);
      else if (type === "4") w.setInt32(0, Number(v) | 0, true);
      else if (type === "2") w.setInt16(0, Number(v) | 0, true);
      else b[0] = Number(v) & 0xff;
      parts.push(b);
    }
    function node(nd, racine) {
      put("X" + nd.name + NUL);
      for (var i = 0; i < nd.attrs.length; i++) {
        var a = nd.attrs[i];
        put("A" + a.k + NUL + a.t);
        if (a.t === "s") put(String(a.v) + NUL); else num(a.t, a.v);
      }
      for (i = 0; i < nd.kids.length; i++) node(nd.kids[i], false);
      put(racine ? "~" : "/");
    }
    put(MELDA_MAGIC);
    node(root, true);
    return concatBytes(parts);
  }

  /* Correspondances établies entre les réglages lisibles et les clés du
     fichier. Seules celles relevées dans un état réel figurent ici : écrire
     une clé devinée ne produirait rien, en silence.                          */
  var MELDA_PARAMS = {
    "MCompressor": [
      { k: "threshold", a: "#threshold", u: "db" },
      { k: "ratio",     a: "#ratio" },
      { k: "attack",    a: "#attack",    u: "ms" },
      { k: "release",   a: "#release",   u: "ms" },
      { k: "rms",       a: "#rmslength", u: "ms" }
    ],
    "MSaturator": [
      { k: "input",  a: "#Gain" },
      { k: "output", a: "#OutputGain" },
      { k: "drywet", a: "#depth", u: "pct" },
      { k: "clip",   a: "#Clip",  u: "bool" }
    ],
    "MTuner": []
  };

  function meldaFromFile(def, v) {
    if (def.u === "db") return v > 0 ? round(20 * Math.log10(v), 3) : -120;
    if (def.u === "ms") return round(v * 1000, 4);
    if (def.u === "pct") return round(v * 100, 2);
    if (def.u === "bool") return !!v;
    return round(v, 5);
  }
  function meldaToFile(def, v) {
    if (def.u === "db") return Math.pow(10, Number(v) / 20);
    if (def.u === "ms") return Number(v) / 1000;
    if (def.u === "pct") return Number(v) / 100;
    if (def.u === "bool") return v ? 1 : 0;
    return Number(v);
  }
  function meldaType(def) { return def.u === "bool" ? "1" : "d"; }

  function findAttr(node, k) {
    for (var i = 0; i < node.attrs.length; i++) if (node.attrs[i].k === k) return node.attrs[i];
    return null;
  }
  /** Les réglages se rangent avec les autres « # », au début du nœud. */
  function setAttr(node, k, type, v) {
    var a = findAttr(node, k);
    if (a) { a.t = type; a.v = v; return; }
    var at = 0, i;
    for (i = 0; i < node.attrs.length; i++) if (node.attrs[i].k.charAt(0) === "#") at = i + 1;
    node.attrs.splice(at, 0, { k: k, t: type, v: v });
  }

  /**
   * La courbe de MCompressor est rangée à part, en points. Deux d'entre eux se
   * déduisent du seuil et du taux : le coude est sur la diagonale, et à 0 dB
   * d'entrée la sortie vaut seuil × (1 − 1/taux) en décibels. Vérifié au bit
   * près sur une chaîne réelle. Une courbe dessinée à la main dans le plugin
   * a davantage de points : on n'y touche pas.
   */
  function meldaGraph(root, thrLin, ratio) {
    if (!(thrLin > 0) || !(ratio >= 1)) return;
    var g = null, i;
    for (i = 0; i < root.kids.length; i++) if (root.kids[i].name === "graph") g = root.kids[i];
    if (!g) { g = { name: "graph", attrs: [{ k: "Mode", t: "s", v: "Normal" }], kids: [] }; root.kids.push(g); }
    var pts = g.kids.filter(function (k) { return k.name === "Point"; });
    if (pts.length > 3) return;                       /* courbe personnalisée */
    var y = Math.pow(thrLin, 1 - 1 / ratio);
    g.kids = [
      { name: "Point", attrs: [{ k: "FlagsB", t: "1", v: 143 }], kids: [] },
      { name: "Point", attrs: [{ k: "x", t: "d", v: thrLin }, { k: "y", t: "d", v: thrLin },
                               { k: "FlagsB", t: "1", v: 140 }], kids: [] },
      { name: "Point", attrs: [{ k: "x", t: "d", v: 1 }, { k: "y", t: "d", v: y },
                               { k: "FlagsB", t: "1", v: 141 }], kids: [] }
    ];
  }

  function decodeMelda(fx, bytes) {
    if (bytes.length < 10) return false;
    var state;
    try { state = zlibInflate(bytes.subarray(8)); } catch (e) { return false; }
    var tree = parseMelda(state);
    if (!tree) return false;
    fx.decoded = "melda";
    fx.meldaPrefix = bytesToB64(bytes.subarray(0, 8));
    fx.meldaTree = tree;
    var defs = MELDA_PARAMS[fx.name] || [], params = {}, i, a;
    for (i = 0; i < defs.length; i++) {
      a = findAttr(tree, defs[i].a);
      params[defs[i].k] = a ? meldaFromFile(defs[i], a.v) : null;
    }
    fx.params = params;
    return true;
  }

  function encodeMelda(fx) {
    var tree = fx.meldaTree, defs = MELDA_PARAMS[fx.name] || [], i, v, a, bouge = false;
    for (i = 0; i < defs.length; i++) {
      v = fx.params ? fx.params[defs[i].k] : undefined;
      if (v === undefined || v === null || v === "") continue;
      a = findAttr(tree, defs[i].a);
      /* identique à l'affichage près : on laisse le flottant d'origine */
      if (a && meldaFromFile(defs[i], a.v) === v) continue;
      setAttr(tree, defs[i].a, meldaType(defs[i]), meldaToFile(defs[i], v));
      if (defs[i].k === "threshold" || defs[i].k === "ratio") bouge = true;
    }
    if (fx.name === "MCompressor" && bouge) {
      var thr = findAttr(tree, "#threshold"), rat = findAttr(tree, "#ratio");
      meldaGraph(tree, thr ? thr.v : 0, rat ? rat.v : 0);
    }
    return concatBytes([b64ToBytes(fx.meldaPrefix), zlibStore(buildMelda(tree))]);
  }

  /* --------------------------------------------------------------- ReaEQ */

  /* Types confirmés sur des chaînes réelles ; les autres valeurs sont
     conservées telles quelles et affichées « type N ». */
  /* Liste affichée par le plugin, dans l'ordre du menu :
     Low Shelf, High Shelf, Band, Low Pass, High Pass, All Pass, Notch,
     Band Pass, Parallel Band Pass, Band (alt), Band (alt 2).
     L'entier stocké ne suit PAS cet ordre : 3 et 4 correspondent bien à
     Low Pass et High Pass, mais « Band » est stocké 8. Seuls ces trois-là
     sont établis ; les autres valeurs sont conservées telles quelles.       */
  /* Les onze entrées du menu, dans l'ordre d'affichage. */
  var EQ_TYPE_NAMES = [
    "Low Shelf", "High Shelf", "Band", "Low Pass", "High Pass", "All Pass",
    "Notch", "Band Pass", "Parallel Band Pass", "Band (alt)", "Band (alt 2)"
  ];
  /* Correspondances établies sur des chaînes réelles. Tout le reste est
     conservé tel quel mais ne peut pas être créé : écrire un entier deviné
     produirait un filtre faux dans Reaper, en silence. */
  var EQ_TYPES = { 3: "Low Pass", 4: "High Pass", 8: "Band" };
  var EQ_TYPE_IDS = { "Low Pass": 3, "High Pass": 4, "Band": 8 };

  /** Entier à écrire pour un nom de type, ou undefined si non établi. */
  function eqTypeId(name) {
    if (EQ_TYPE_IDS[name] !== undefined) return EQ_TYPE_IDS[name];
    var m = /^type ([0-9]+)$/.exec(String(name));      /* type conservé d'un import */
    return m ? Number(m[1]) : undefined;
  }
  var EQ_NO_GAIN = { 3: 1, 4: 1 };
  var EQ_REC = 33;   /* type(4) actif(4) fréquence(8) gain(8) largeur(8) drapeau(1) */

  function decodeReaEq(fx, bytes) {
    if (bytes.length < 16) return false;
    var d = dv(bytes);
    var version = d.getInt32(0, true);
    var count = d.getInt32(4, true);
    if (count < 0 || count > 64) return false;
    var off = 8, bands = [], i;
    for (i = 0; i < count; i++) {
      if (off + EQ_REC > bytes.length) return false;
      var type = d.getInt32(off, true);
      var enabled = d.getInt32(off + 4, true);
      var freq = d.getFloat64(off + 8, true);
      var gainLin = d.getFloat64(off + 16, true);
      var bw = d.getFloat64(off + 24, true);
      var flag = bytes[off + 32];
      off += EQ_REC;
      if (!(freq > 0 && freq < 1e6) || !(bw > 0 && bw < 1e4)) return false;
      bands.push({
        type: type, typeName: EQ_TYPES[type] || ("type " + type), on: enabled !== 0,
        freq: freq, gainDb: gainLin > 0 ? 20 * Math.log10(gainLin) : -120, bw: bw, flag: flag
      });
    }
    fx.decoded = "reaeq";
    fx.version = version;
    fx.bands = bands;
    fx.eqTail = bytes.slice(off);
    return true;
  }

  function encodeReaEq(fx) {
    var bands = fx.bands || [], i;
    var head = new Uint8Array(8), hd = dv(head);
    hd.setInt32(0, fx.version === undefined ? 33 : fx.version, true);
    hd.setInt32(4, bands.length, true);
    var parts = [head];
    for (i = 0; i < bands.length; i++) {
      var b = bands[i];
      var rec = new Uint8Array(EQ_REC), rd = dv(rec);
      var type = b.type !== undefined && b.type !== null ? b.type : eqTypeId(b.typeName);
      if (type === undefined) {
        throw new Error("Bande " + (i + 1) + " : le type « " + b.typeName +
          " » n'a pas d'équivalent connu dans le fichier. Choisis-le dans Reaper, " +
          "ou prends un type établi (" + Object.keys(EQ_TYPE_IDS).join(", ") + ").");
      }
      rd.setInt32(0, type, true);
      rd.setInt32(4, b.on === false ? 0 : 1, true);
      rd.setFloat64(8, Number(b.freq), true);
      rd.setFloat64(16, EQ_NO_GAIN[type] ? 1 : Math.pow(10, Number(b.gainDb || 0) / 20), true);
      rd.setFloat64(24, Number(b.bw), true);
      rec[32] = b.flag === undefined ? 1 : b.flag;
      parts.push(rec);
    }
    parts.push(fx.eqTail || new Uint8Array([1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 240, 63]));
    return concatBytes(parts);
  }

  /* ------------------------------------------------- plugins Cockos (Rea*)
     Ces plugins stockent une signature de 8 octets puis un flottant par
     paramètre, dans l'ordre de la vue « paramètres génériques » de Reaper.

     Pour chaque paramètre : `to` convertit le brut en valeur affichée, `from`
     fait l'inverse, `r` est l'arrondi d'affichage. Un paramètre dont la valeur
     affichée n'a pas changé est réécrit avec son flottant d'origine : sans ça,
     l'arrondi d'affichage se glisserait dans un réglage qu'on n'a pas touché.

     Échelles établies en croisant des chaînes réelles avec leurs valeurs
     connues. Les fréquences sont normalisées sur 20 kHz (vérifié : 0,15 vaut
     3000 Hz et 0,0125 vaut 250 Hz). Restent indéterminés : le délai initial de
     ReaVerbate et les paramètres sans étiquette de ReaComp, conservés bruts.  */

  var DB_FLOOR = -150;                 /* position « -inf » chez Reaper */
  var FREQ_MAX = 20000;                /* les sliders de fréquence sont normalisés sur 20 kHz */
  var COCKOS_MAGIC = "776t3g3wrd4=";   /* DE AD AE EF  0D F0 AD DE */

  function linToDb(v) { return v > 0 ? Math.max(DB_FLOOR, 20 * Math.log10(v)) : DB_FLOOR; }
  function dbToLin(db) { return Math.pow(10, Math.max(DB_FLOOR, Number(db)) / 20); }

  function scaled(max, r) {
    return { to: function (v) { return v * max; }, from: function (x) { return x / max; }, r: r };
  }
  var mapDb = { to: linToDb, from: dbToLin, r: 2 };
  var mapRatio = {
    to: function (v) { return 1 + v * 99; },
    from: function (x) { return (x - 1) / 99; }, r: 2
  };
  var mapUnit = { to: function (v) { return v; }, from: function (x) { return x; }, r: 4 };
  var mapBool = { bool: true };

  function decodeFloats(fx, bytes, order, maps, kind) {
    if (bytes.length !== 8 + order.length * 4) return false;
    var d = dv(bytes), raw = {}, i, k, m;
    for (i = 0; i < order.length; i++) raw[order[i]] = d.getFloat32(8 + i * 4, true);
    fx.decoded = kind;
    fx.raw = raw;
    fx.magic = bytesToB64(bytes.slice(0, 8));
    fx.params = {};
    for (k in maps) {
      m = maps[k];
      fx.params[k] = m.bool ? raw[k] >= 0.5 : round(m.to(raw[k]), m.r);
    }
    return true;
  }

  function encodeFloats(fx, order, maps) {
    var raw = fx.raw || {}, p = fx.params || {}, v = {}, i, k, m;
    for (i = 0; i < order.length; i++) v[order[i]] = raw[order[i]] || 0;
    for (k in maps) {
      m = maps[k];
      if (p[k] === undefined || p[k] === null) continue;
      if (m.bool) { v[k] = p[k] ? 1 : 0; continue; }
      var inchange = raw[k] !== undefined && round(m.to(raw[k]), m.r) === Number(p[k]);
      v[k] = inchange ? raw[k] : m.from(Number(p[k]));
    }
    var out = new Uint8Array(8 + order.length * 4);
    out.set(b64ToBytes(fx.magic || COCKOS_MAGIC), 0);
    var od = dv(out);
    for (i = 0; i < order.length; i++) od.setFloat32(8 + i * 4, v[order[i]], true);
    return out;
  }

  /* ReaComp : 21 paramètres */
  var COMP_ORDER = [
    "threshold", "ratio", "attack", "release", "precomp", "resvd",
    "lowpass", "hipass", "signIn", "audIn", "dry", "wet", "preview",
    "rms", "knee", "makeup", "autorel", "legacy", "deprecated", "multi", "metering"
  ];
  var COMP_MAPS = {
    threshold: mapDb, ratio: mapRatio,
    attack: scaled(500, 2), release: scaled(5000, 1), precomp: scaled(500, 2),
    lowpass: scaled(FREQ_MAX, 1), hipass: scaled(FREQ_MAX, 1),
    dry: mapDb, wet: mapDb, rms: scaled(100, 2), knee: scaled(24, 2),
    preview: mapBool, makeup: mapBool, autorel: mapBool
  };

  function decodeReaComp(fx, bytes) {
    if (!decodeFloats(fx, bytes, COMP_ORDER, COMP_MAPS, "reacomp")) return false;
    fx.params.detector = fx.raw.audIn >= 0.5 ? "Auxiliary inputs" : "Main inputs";
    return true;
  }

  function encodeReaComp(fx) {
    var bytes = encodeFloats(fx, COMP_ORDER, COMP_MAPS);
    if (fx.params && fx.params.detector !== undefined) {
      var aux = /aux/i.test(String(fx.params.detector)) ? 1 : 0;
      dv(bytes).setFloat32(8 + COMP_ORDER.indexOf("audIn") * 4, aux, true);
    }
    return bytes;
  }

  /* ReaVerbate : 8 paramètres */
  var VERB_ORDER = ["wet", "dry", "room", "damp", "width", "delay", "lowpass", "hipass"];
  var VERB_MAPS = {
    wet: mapDb, dry: mapDb, room: scaled(100, 1), damp: scaled(100, 1),
    width: mapUnit, delay: mapUnit,
    lowpass: scaled(FREQ_MAX, 1), hipass: scaled(FREQ_MAX, 1)
  };

  function decodeReaVerbate(fx, bytes) {
    return decodeFloats(fx, bytes, VERB_ORDER, VERB_MAPS, "reaverbate");
  }
  function encodeReaVerbate(fx) {
    return encodeFloats(fx, VERB_ORDER, VERB_MAPS);
  }

  /* ------------------------------------------------------------- écriture */

  function fxToText(fx) {
    var out = [], i;
    out.push("BYPASS " + fx.bypass);

    if (fx.kind === "js") {
      out.push("<JS " + fx.head);
      out.push("  " + (fx.sliders ? fx.sliders.join(" ") : (fx.body && fx.body[0]) || ""));
      out.push(">");
    } else {
      out.push('<VST "' + fx.label + '" ' + fx.dll + " " + fx.headTail);
      /* on ne réencode que si les valeurs ont changé : sinon l'état d'origine
         repart à l'octet près et un aller-retour ne perd rien */
      var chunk64 = fx.chunk64;
      if (fx.dirty || !chunk64) {
        if (fx.decoded === "bod" && fx.params) chunk64 = bytesToB64(encodeBod(fx));
        else if (fx.decoded === "reaeq" && fx.bands) chunk64 = bytesToB64(encodeReaEq(fx));
        else if (fx.decoded === "reacomp" && fx.params) chunk64 = bytesToB64(encodeReaComp(fx));
        else if (fx.decoded === "reaverbate" && fx.params) chunk64 = bytesToB64(encodeReaVerbate(fx));
        else if (fx.decoded === "melda" && fx.meldaTree) chunk64 = bytesToB64(encodeMelda(fx));
      }
      var lines = [setChunkLen(fx.header64, chunk64)].concat(wrap64(chunk64)).concat([fx.name64]);
      for (i = 0; i < lines.length; i++) if (lines[i]) out.push("  " + lines[i]);
      out.push(">");
    }
    for (i = 0; i < (fx.extra || []).length; i++) out.push(fx.extra[i]);
    return out;
  }

  function build(parsed) {
    var out = [], i;
    for (i = 0; i < parsed.items.length; i++) {
      var it = parsed.items[i];
      if (it.type === "raw") out.push(it.line);
      else out = out.concat(fxToText(it.fx));
    }
    return out.join("\n");
  }

  /* --------------------------------------------------- gabarits d'identité
     Pour écrire une chaîne qui ne vient pas d'un import, il faut la ligne
     d'identité du plugin et son bloc de configuration — ni l'une ni l'autre
     ne portent de réglage. Ceux-ci ont été relevés sur une chaîne réelle.   */
  /* Queue du bloc ReaEQ : identique sur toutes les chaînes relevées. Elle
     suit les bandes et ne porte aucun réglage de bande. */
  var REAEQ_TAIL = "AQAAAAEAAAAAAAAAAADwPwAAAAD9AQAAXAEAAAIAAQA=";

  /* Gabarit d'un plugin Melda : identité, préfixe du bloc, et l'arbre tel
     qu'il sort du plugin une fois les réglages sonores retirés. Les attributs
     qui restent décrivent la version et la fenêtre, pas le son. */
  function meldaTemplate(root, extra) {
    var attrs = [{ k: "#", t: "1", v: 1 }].concat(extra || []).concat([
      { k: "Version", t: "4", v: 1116672 },
      { k: "MIDIProgramChangeEnable", t: "1", v: 0 },
      { k: "ProgramChangeCategorizer", t: "1", v: 0 },
      { k: "ControllersEnabled", t: "1", v: 0 },
      { k: "PianoViewCollapsed", t: "1", v: 255 },
      { k: "MaxLFOBlockSize", t: "1", v: 32 }
    ]);
    return { name: root, attrs: attrs, kids: [] };
  }

  var TEMPLATES = {
    "TSE BOD": {kind:"vst",
      head:"\"VST: BOD (TSE AUDIO)\" BOD_x64.dll 0 \"\" 1414742596<56535454534244626F64000000000000> \"\"",
      header64:"REJTVO5e7f4CAAAAAQAAAAAAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAAAAAAARwIAAAEAAAAAAACA",
      name64:"AFByb2dyYW0gMQAAAAAA"},
    "ReaEQ": {kind:"vst",
      head:"\"VST: ReaEQ (Cockos)\" reaeq.dll 0 \"\" 1919247729<56535472656571726561657100000000> \"\"",
      header64:"cWVlcu5e7f4CAAAAAQAAAAAAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAAAAAAA7gAAAAEAAAAAABAA",
      name64:"AFByb2dyYW0gMQAQAAAA", eqTail:REAEQ_TAIL},
    "ReaComp": {kind:"vst",
      head:"\"VST: ReaComp (Cockos)\" reacomp.dll 0 \"\" 1919247213<5653547265636D726561636F6D700000> \"\"",
      header64:"bWNlcu9e7f4EAAAAAQAAAAAAAAACAAAAAAAAAAQAAAAAAAAACAAAAAAAAAACAAAAAQAAAAAAAAACAAAAAAAAAFwAAAAAAAAAAAAQAA==",
      name64:"AFByb2dyYW0gMQAQAAAA"},
    "JS: Saturation": {kind:"js", head:"loser/Saturation \"\"", sliders:64},
    "MTuner": {kind:"vst",
      head:"\"VST3: MTuner (MeldaProduction)\" MTuner.vst3 0 \"\" 1332983745{4D656C646170726F4D54756E4D54756E} \"\"",
      header64:"wbdzT+5e7f4CAAAAAQAAAAAAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAAAAAAAEAIAAAEAAAAAAAAA",
      name64:"ADAAAAAAAA==", extra:["PRESETNAME 0"],
      meldaPrefix:"AAEAAAEAAAA=", melda:function(){ return meldaTemplate("MTunersettings"); }},
    "MCompressor": {kind:"vst",
      head:"\"VST3: MCompressor (MeldaProduction)\" MCompressor.vst3 0 \"\" 886559297{4D656C646170726F4D4165314D416531} \"\"",
      header64:"QdLXNO5e7f4EAAAAAQAAAAAAAAACAAAAAAAAAAQAAAAAAAAACAAAAAAAAAACAAAAAQAAAAAAAAACAAAAAAAAABAEAAABAAAAAAAAAA==",
      name64:"ADAAAAAAAA==", extra:["PRESETNAME 0"],
      meldaPrefix:"AAIAAAEAAAA=",
      /* « kneemode » est relevé tel quel : son autre valeur n'est pas établie. */
      melda:function(){ return meldaTemplate("MCompressorsettings", [{k:"#kneemode", t:"s", v:"Soft"}]); }},
    "MSaturator": {kind:"vst",
      head:"\"VST3: MSaturator (MeldaProduction)\" MSaturator.vst3 0 \"\" 1093031185{4D656C646170726F4D4165344D416534} \"\"",
      header64:"EVUmQe5e7f4CAAAAAQAAAAAAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAAAAAAAEAQAAAEAAAAAAAAA",
      name64:"ADAAAAAAAA==", extra:["PRESETNAME 0"],
      meldaPrefix:"AAIAAAEAAAA=", melda:function(){ return meldaTemplate("MSaturatorsettings"); }},
    "ReaVerbate": {kind:"vst",
      head:"\"VST: ReaVerbate (Cockos)\" reaverbate.dll 0 \"\" 1920361016<56535472766238726561766572626174> \"\"",
      header64:"OGJ2cu9e7f4CAAAAAQAAAAAAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAAAAAAAKAAAAAAAAAAAABAA",
      name64:"AFByb2dyYW0gMQAQAAAA"}
  };

  /** Identifiant d'effet, au format attendu par Reaper. */
  function newFxId(){
    var hex = "0123456789ABCDEF", s = "", i;
    for (i = 0; i < 32; i++) s += hex.charAt(Math.floor(Math.random() * 16));
    return "{" + s.slice(0,8) + "-" + s.slice(8,12) + "-" + s.slice(12,16) +
           "-" + s.slice(16,20) + "-" + s.slice(20) + "}";
  }

  /* --------------------------------- conversion vers/depuis un preset --- */

  function pbName(fx) {
    if (fx.kind === "js") return "JS: " + fx.name;
    if (/^BOD$/i.test(fx.name)) return "TSE BOD";
    return fx.name;
  }

  function keepRfx(fx) {
    return {
      kind: fx.kind, head: fx.head, bypass: fx.bypass, extra: fx.extra,
      header64: fx.header64, chunk64: fx.chunk64, name64: fx.name64,
      label: fx.label, dll: fx.dll, headTail: fx.headTail, decoded: fx.decoded,
      sliders: fx.sliders, version: fx.version,
      meldaPrefix: fx.meldaPrefix, meldaTree: fx.meldaTree,
      eqTail: fx.eqTail ? bytesToB64(fx.eqTail) : undefined,
      bodPrefix: fx.bodPrefix, bodSuffix: fx.bodSuffix, bodAttrs: fx.bodAttrs, bodTag: fx.bodTag,
      magic: fx.magic, rawParams: fx.raw
    };
  }

  /** Chaîne Reaper -> maillons Presetbook. */
  function toChain(parsed) {
    var out = [], i;
    for (i = 0; i < parsed.fx.length; i++) {
      var fx = parsed.fx[i];
      var s = { plugin: pbName(fx), role: "", on: !fx.bypassed, p: {}, settings: "" };

      if (fx.decoded === "bod") {
        var p = fx.params;
        s.p = {
          input: round(p.Input, 3), drive: round(p.Drive, 3), blend: round(p.Blend, 3),
          bass: round(p.Bass, 3), treble: round(p.Treble, 3), presence: round(p.Presence, 3),
          level: round(p.Level, 3), output: round(p.Output, 3)
        };
      } else if (fx.decoded === "reaeq") {
        s.bands = fx.bands.map(function (b) {
          return { t: b.typeName, f: round(b.freq, 2),
                   g: EQ_NO_GAIN[b.type] ? 0 : round(b.gainDb, 2),
                   bw: round(b.bw, 3), on: b.on };
        });
      } else if (fx.decoded === "reacomp" || fx.decoded === "reaverbate" || fx.decoded === "melda") {
        s.p = fx.params;
      } else if (fx.decoded === "js") {
        var used = [], k;
        for (k = 0; k < fx.sliders.length; k++) if (fx.sliders[k] !== "-") used.push(fx.sliders[k]);
        if (used.length) s.p = { drive: Number(used[0]) };
        s.settings = "Curseurs : " + used.join(" ");
      } else {
        s.settings = "État conservé tel quel (" + fx.chunkLen + " octets) — non modifiable ici.";
      }
      s.rfx = keepRfx(fx);
      out.push(s);
    }
    return out;
  }

  /** Origine synthétique : identité du plugin, état laissé à construire. */
  function fromTemplate(plugin, index) {
    var t = TEMPLATES[plugin];
    if (!t) {
      throw new Error(
        "Maillon " + (index + 1) + " : « " + plugin + " » n'a pas de gabarit connu. " +
        "Importe une chaîne contenant ce plugin, ou choisis-en un parmi : " +
        Object.keys(TEMPLATES).join(", ") + "."
      );
    }
    var decoded = plugin === "TSE BOD" ? "bod"
                : plugin === "ReaEQ" ? "reaeq"
                : plugin === "ReaComp" ? "reacomp"
                : plugin === "ReaVerbate" ? "reaverbate"
                : t.melda ? "melda" : "js";
    var o = {
      kind: t.kind, head: t.head, bypass: "0 0", decoded: decoded,
      extra: ["FXID " + newFxId()].concat(t.extra || []).concat(["WAK 0 0"])
    };
    if (t.melda) { o.meldaPrefix = t.meldaPrefix; o.meldaTree = t.melda(); }
    if (t.eqTail) o.eqTail = t.eqTail;
    if (t.kind === "js") {
      o.sliders = [];
      for (var k = 0; k < t.sliders; k++) o.sliders.push("-");
    } else {
      var mh = t.head.match(/^"([^"]*)"\s+(\S+)\s+(.*)$/);
      o.label = mh ? mh[1] : t.head;
      o.dll = mh ? mh[2] : "";
      o.headTail = mh ? mh[3] : "";
      o.header64 = t.header64;
      o.name64 = t.name64;
      o.chunk64 = "";                       /* rien à conserver : tout est reconstruit */
    }
    return o;
  }

  /** Maillons Presetbook -> chaîne Reaper. Une origine importée est réutilisée,
      sinon le gabarit du plugin sert de point de départ. */
  function fromChain(slots) {
    var items = [], i;
    for (i = 0; i < slots.length; i++) {
      var s = slots[i], o = s.rfx;
      if (!o) o = fromTemplate(s.plugin, i);      /* maillon saisi à la main */
      var rest = String(o.bypass || "0 0").split(/\s+/).slice(1).join(" ");
      var fx = {
        kind: o.kind, head: o.head, label: o.label, dll: o.dll, headTail: o.headTail,
        header64: o.header64, chunk64: o.chunk64, name64: o.name64,
        extra: o.extra || [], decoded: o.decoded, version: o.version, dirty: true,
        bypass: (s.on === false ? "1" : "0") + (rest ? " " + rest : " 0")
      };
      if (o.decoded === "bod") {
        fx.params = {
          Input: s.p.input, Level: s.p.level, Drive: s.p.drive, Bass: s.p.bass,
          Treble: s.p.treble, Presence: s.p.presence, Blend: s.p.blend,
          Bypass: s.on === false ? 1 : 0, Quality: 0, Output: s.p.output
        };
        fx.bodPrefix = o.bodPrefix; fx.bodSuffix = o.bodSuffix;
        fx.bodAttrs = o.bodAttrs; fx.bodTag = o.bodTag;
      } else if (o.decoded === "reaeq") {
        fx.bands = (s.bands || []).map(function (b) {
          return { type: eqTypeId(b.t), typeName: b.t, on: b.on !== false,
                   freq: b.f, gainDb: b.g, bw: b.bw };
        });
        fx.eqTail = b64ToBytes(o.eqTail || REAEQ_TAIL);
      } else if (o.decoded === "reacomp" || o.decoded === "reaverbate") {
        fx.params = s.p || {};
        fx.raw = o.rawParams;
        fx.magic = o.magic;
      } else if (o.decoded === "melda") {
        fx.name = s.plugin;
        fx.params = s.p || {};
        fx.meldaPrefix = o.meldaPrefix;
        fx.meldaTree = JSON.parse(JSON.stringify(o.meldaTree));   /* l'origine reste intacte */
      } else if (o.kind === "js") {
        fx.sliders = (o.sliders || []).slice();
        if (s.p && s.p.drive !== undefined && s.p.drive !== null) fx.sliders[0] = String(s.p.drive);
      } else if (o.chunk64) {
        fx.dirty = false;                     /* bloc opaque : réécrit tel quel */
      } else {
        throw new Error(
          "Maillon " + (i + 1) + " : impossible de fabriquer l'état de « " + s.plugin + " »."
        );
      }
      items.push({ type: "fx", fx: fx });
    }
    return build({ items: items });
  }

  var api = {
    parse: parse, build: build, toChain: toChain, fromChain: fromChain,
    TEMPLATES: TEMPLATES, canWrite: function (plugin) { return !!TEMPLATES[plugin]; },
    EQ_TYPES: EQ_TYPES, EQ_TYPE_IDS: EQ_TYPE_IDS, EQ_TYPE_NAMES: EQ_TYPE_NAMES,
    eqTypeId: eqTypeId, BOD_KEYS: BOD_KEYS,
    MELDA_PARAMS: MELDA_PARAMS, zlibInflate: zlibInflate, zlibStore: zlibStore,
    parseMelda: parseMelda, buildMelda: buildMelda
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RFX = api;
})(typeof window !== "undefined" ? window : this);
