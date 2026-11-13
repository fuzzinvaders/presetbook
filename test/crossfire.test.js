/**
 * Aller-retour complet sur une chaîne réelle à plugins Melda : Reaper vers
 * Presetbook, puis Presetbook vers Reaper — depuis l'import, et depuis une
 * fiche du catalogue qui n'a jamais vu le fichier.
 *   node test/crossfire.test.js
 *
 * La chaîne : ReaEQ, TSE BOD, ReaEQ, MCompressor, MTuner hors circuit.
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const RFX = require("../public/rfxchain.js");
const { run } = require("./sandbox.js");

const original = fs.readFileSync(path.join(__dirname, "fixtures", "crossfire.RfxChain"), "latin1");
const norm = (t) => t.replace(/\r\n/g, "\n").replace(/\n+$/, "");

let failed = 0;
function check(label, ok, detail) {
  if (ok) console.log("  ok    " + label);
  else { failed++; console.log("  ÉCHEC " + label + (detail ? " — " + detail : "")); }
}
function near(a, b, eps) { return Math.abs(a - b) <= (eps === undefined ? 1e-6 : eps); }

/* Ce que le plugin fait réellement du signal, effet par effet. La disposition
   de la fenêtre et les panneaux repliés n'en font pas partie ; l'ordre des
   attributs Melda non plus. Les flottants sont comparés à quatre chiffres
   significatifs : un seuil relu au millième de dB reste le même seuil. */
const UI_ONLY = new Set(["EditorSize", "LRSplitterSize1", "LRSplitterSize2", "PluginToolbarCollapsed",
  "#TunerCollapsed", "#PolyTunerCollapsed", "#AdvancedCollapsed", "#MIDIOutputCollapsed"]);
function meldaSound(node) {
  return {
    name: node.name,
    attrs: node.attrs.filter((a) => !UI_ONLY.has(a.k))
      .map((a) => [a.k, a.t, typeof a.v === "number" ? +a.v.toPrecision(4) : a.v])
      .sort((x, y) => (x[0] < y[0] ? -1 : 1)),
    kids: node.kids.map(meldaSound)
  };
}
function sound(fx) {
  const s = { name: fx.name, bypassed: fx.bypassed, decoded: fx.decoded };
  if (fx.decoded === "bod") s.v = RFX.BOD_KEYS.map((k) => [k, +Number(fx.params[k]).toFixed(3)]);
  if (fx.decoded === "reaeq") s.v = fx.bands.map((b) => [b.type, b.on, +b.freq.toFixed(2), +b.gainDb.toFixed(2), +b.bw.toFixed(3)]);
  if (fx.decoded === "melda") s.v = meldaSound(fx.meldaTree);
  return JSON.stringify(s);
}
const fb = (b) => [b.t, b.f, b.g, b.bw].join("/");

const orig = RFX.parse(original);

console.log("Import Reaper → Presetbook");
const chain = RFX.toChain(orig);
check("cinq maillons, dans l'ordre",
  chain.map((c) => c.plugin).join(",") === "ReaEQ,TSE BOD,ReaEQ,MCompressor,MTuner", chain.map((c) => c.plugin).join(","));
check("le MTuner seul hors circuit", chain.map((c) => c.on).join(",") === "true,true,true,true,false");
const bod = chain[1].p;
check("BOD : input 0,701, drive 0,077, blend 0,55",
  bod.input === 0.701 && bod.drive === 0.077 && bod.blend === 0.55, JSON.stringify(bod));
check("BOD : bass 0,55, treble 0,481, presence 0,417, level 0,848, output 0,899",
  bod.bass === 0.55 && bod.treble === 0.481 && bod.presence === 0.417 && bod.level === 0.848 && bod.output === 0.899);
check("EQ d'entrée : passe-haut 35 Hz, 100 / 300 / 1000 Hz",
  chain[0].bands.map(fb).join(" ") === "High Pass/35/0/1 Band/100/1/1.5 Band/300/-1/1.2 Band/1000/0.5/1.2",
  chain[0].bands.map(fb).join(" "));
check("EQ de sortie : sept bandes, de 35 Hz à 7 kHz",
  chain[2].bands.map(fb).join(" ") ===
    "High Pass/35/0/1 Band/80/1.5/1.5 Band/160/1/1.4 Band/350/-0.5/1.3 Band/750/2.5/1.2 Band/1800/1.5/1.1 Low Pass/7000/0/1",
  chain[2].bands.map(fb).join(" "));
const mc = chain[3].p;
check("MCompressor : 3:1, attaque 25 ms, relâchement 110 ms, RMS 5 ms",
  mc.ratio === 3 && mc.attack === 25 && mc.release === 110 && mc.rms === 5, JSON.stringify(mc));
check("MCompressor : seuil −9,956 dB", near(mc.threshold, -9.956, 0.001), String(mc.threshold));

console.log("\nAller-retour sans modification");
const back = RFX.fromChain(chain);
const reread = RFX.parse(back);
check("le fichier réécrit est identique à l'original", norm(back) === norm(original));
reread.fx.forEach((fx, i) => {
  check(`${fx.name} : état d'origine repris à l'octet près`, fx.chunk64 === orig.fx[i].chunk64);
  check(`${fx.name} : FXID et état « bypass » conservés`,
    fx.extra.join("|") === orig.fx[i].extra.join("|") && fx.bypass === orig.fx[i].bypass);
});

console.log("\nGénération depuis une fiche, sans le fichier d'origine");
const sansOrigine = chain.map((c) => { const s = JSON.parse(JSON.stringify(c)); delete s.rfx; return s; });
const genere = RFX.parse(RFX.fromChain(sansOrigine));
check("cinq effets relus", genere.fx.length === 5, String(genere.fx.length));
genere.fx.forEach((fx, i) => {
  check(`${fx.name} : même identité de plugin que dans Reaper`,
    fx.label === orig.fx[i].label && fx.dll === orig.fx[i].dll && fx.headTail === orig.fx[i].headTail);
  check(`${fx.name} : mêmes réglages que la chaîne d'origine`, sound(fx) === sound(orig.fx[i]),
    "\n        généré  " + sound(fx) + "\n        origine " + sound(orig.fx[i]));
});
check("chaque effet reçoit son propre FXID",
  new Set(genere.fx.map((f) => f.extra.find((e) => e.indexOf("FXID") === 0))).size === 5);

console.log("\nModifier, puis exporter");
const modifie = JSON.parse(JSON.stringify(chain));
modifie[1].p.drive = 0.15;
modifie[2].bands[4].g = 3;
modifie[3].p.ratio = 4;
modifie[3].p.threshold = -14;
modifie[4].on = true;
const sortie = RFX.parse(RFX.fromChain(modifie));
check("le drive du BOD passe à 0,15", near(sortie.fx[1].params.Drive, 0.15), String(sortie.fx[1].params.Drive));
check("le reste du BOD ne bouge pas",
  near(sortie.fx[1].params.Input, 0.701) && near(sortie.fx[1].params.Output, 0.899));
check("la bande 750 Hz passe à +3 dB", near(sortie.fx[2].bands[4].gainDb, 3), String(sortie.fx[2].bands[4].gainDb));
check("les autres bandes ne bougent pas",
  sortie.fx[2].bands.every((b, i) => i === 4 || (near(b.freq, orig.fx[2].bands[i].freq) && near(b.gainDb, orig.fx[2].bands[i].gainDb))));
check("le MCompressor passe à 4:1, seuil −14 dB",
  near(sortie.fx[3].params.ratio, 4) && near(sortie.fx[3].params.threshold, -14, 0.001), JSON.stringify(sortie.fx[3].params));
check("attaque, relâchement et RMS ne bougent pas",
  sortie.fx[3].params.attack === 25 && sortie.fx[3].params.release === 110 && sortie.fx[3].params.rms === 5);
check("le MTuner revient en circuit", sortie.fx[4].bypassed === false);
check("l'EQ d'entrée, non touché, garde ses octets", sortie.fx[0].chunk64 === orig.fx[0].chunk64);

console.log("\nLa fiche Crossfire du catalogue");
const page = path.join(__dirname, "..", "public", "index.html");
const app = run(page, { search: "", RFX });
const fiche = app.__pb.library().find((p) => p.id === "r-crossfire");
check("la fiche existe et désigne le morceau",
  !!fiche && !!fiche.song && fiche.song.title === "Crossfire", fiche ? JSON.stringify(fiche.song) : "absente");
if (fiche) {
  let texte = null;
  try { texte = RFX.fromChain(fiche.chain); } catch (e) { texte = null; }
  const relu = texte ? RFX.parse(texte) : { fx: [] };
  check("elle produit une chaîne de cinq effets", relu.fx.length === 5, String(relu.fx.length));
  relu.fx.forEach((fx, i) => {
    check(`${fx.name} : la fiche rend les réglages de la chaîne d'origine`, sound(fx) === sound(orig.fx[i]),
      "\n        fiche   " + sound(fx) + "\n        origine " + sound(orig.fx[i]));
  });
}

console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
process.exit(failed ? 1 : 0);
