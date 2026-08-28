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
  function round(v, n) { var f = Math.pow(10, n); return Math.round(v * f) / f; }

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
      }
      var lines = [fx.header64].concat(wrap64(chunk64)).concat([fx.name64]);
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
  var TEMPLATES = {
    "TSE BOD": {kind:"vst",
      head:"\"VST: BOD (TSE AUDIO)\" BOD_x64.dll 0 \"\" 1414742596<56535454534244626F64000000000000> \"\"",
      header64:"REJTVO5e7f4CAAAAAQAAAAAAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAAAAAAARwIAAAEAAAAAAACA",
      name64:"AFByb2dyYW0gMQAAAAAA"},
    "ReaEQ": {kind:"vst",
      head:"\"VST: ReaEQ (Cockos)\" reaeq.dll 0 \"\" 1919247729<56535472656571726561657100000000> \"\"",
      header64:"cWVlcu5e7f4CAAAAAQAAAAAAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAAAAAAA7gAAAAEAAAAAABAA",
      name64:"AAAQAAAA"},
    "ReaComp": {kind:"vst",
      head:"\"VST: ReaComp (Cockos)\" reacomp.dll 0 \"\" 1919247213<5653547265636D726561636F6D700000> \"\"",
      header64:"bWNlcu9e7f4EAAAAAQAAAAAAAAACAAAAAAAAAAQAAAAAAAAACAAAAAAAAAACAAAAAQAAAAAAAAACAAAAAAAAAFwAAAAAAAAAAAAQAA==",
      name64:"AFByb2dyYW0gMQAQAAAA"},
    "JS: Saturation": {kind:"js", head:"loser/Saturation \"\"", sliders:64},
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
      } else if (fx.decoded === "reacomp" || fx.decoded === "reaverbate") {
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
                : plugin === "ReaVerbate" ? "reaverbate" : "js";
    var o = {
      kind: t.kind, head: t.head, bypass: "0 0", decoded: decoded,
      extra: ["FXID " + newFxId(), "WAK 0 0"]
    };
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
        fx.eqTail = o.eqTail ? b64ToBytes(o.eqTail) : undefined;
      } else if (o.decoded === "reacomp" || o.decoded === "reaverbate") {
        fx.params = s.p || {};
        fx.raw = o.rawParams;
        fx.magic = o.magic;
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
    eqTypeId: eqTypeId, BOD_KEYS: BOD_KEYS
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RFX = api;
})(typeof window !== "undefined" ? window : this);
