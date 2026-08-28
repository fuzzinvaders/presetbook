/**
 * Pédales et pédaliers : registre, dessin, chaînage.
 *   node test/pedals.test.js
 */
"use strict";
const path = require("node:path");
const { run } = require("./sandbox.js");

const pb = run(path.join(__dirname, "..", "public", "index.html")).__pb;

let failed = 0;
function check(label, ok, detail) {
  if (ok) console.log("  ok    " + label);
  else { failed++; console.log("  ÉCHEC " + label + (detail ? " — " + detail : "")); }
}

console.log("Pédales et pédaliers");

const familles = Object.keys(pb.PEDALS);
check("au moins quinze familles", familles.length >= 15, String(familles.length));
check("chaque famille a un modèle et des commandes",
  familles.every((k) => pb.PEDALS[k].model && Array.isArray(pb.PEDALS[k].controls)));
check("chaque famille a une couleur de boîtier",
  familles.every((k) => /^#[0-9A-Fa-f]{6}$/.test(pb.PEDALS[k].color)),
  familles.filter((k) => !/^#[0-9A-Fa-f]{6}$/.test(pb.PEDALS[k].color)).join(","));
check("les pédales entrent dans le registre général",
  familles.every((k) => pb.GEAR[k] && pb.GEAR[k].kind === "pedal"));
check("l'accordeur n'a aucun réglage", pb.GEAR["pd-tuner"].controls.length === 0);
check("l'égaliseur graphique a sept bandes",
  pb.GEAR["pd-eq"].controls.filter((c) => c.t === "slider").length === 7);

/* --- le dessin découle de la description --- */
const od = pb.GEAR["pd-od"];
const art = pb.pedalArt(od, { gain: 8, tone: 5, level: 6 }, {});
check("le dessin est un SVG", /^<svg viewBox="0 0 \d+ \d+"/.test(art), art.slice(0, 40));
check("un bouton par commande", (art.match(/r="12\.5"/g) || []).length === od.controls.length,
  String((art.match(/r="12\.5"/g) || []).length) + " boutons pour " + od.controls.length + " commandes");
check("le nom est sérigraphié", art.indexOf("OVERDRIVE") >= 0);
check("le repère suit la valeur", /rotate\(9[0-9.]+ /.test(art), "rotation attendue vers la droite");
check("témoin allumé par défaut", art.indexOf('fill="#E24A3A"') >= 0);
check("témoin éteint si la pédale est coupée",
  pb.pedalArt(od, {}, { off: true }).indexOf('fill="#E24A3A"') < 0);

const eqArt = pb.pedalArt(pb.GEAR["pd-eq"], { b100: 6, b400: -6 }, {});
check("les curseurs sont dessinés en peigne", (eqArt.match(/rx="1\.6"/g) || []).length === 7,
  String((eqArt.match(/rx="1\.6"/g) || []).length));

/* --- lisibilité du texte selon la couleur du boîtier --- */
check("boîtier clair, texte sombre", pb.luma("#E9D53F") > 0.6);
check("boîtier sombre, texte clair", pb.luma("#3C4A5A") < 0.6);
check("texte adapté au boîtier sombre",
  pb.pedalArt(pb.GEAR["pd-preamp"], {}, {}).indexOf('fill="#F4F4F0"') >= 0);

/* --- pédalier --- */
const bd = {
  kind: "board", slots: [
    { gear: "pd-comp", on: true, v: { sustain: 6 } },
    { gear: "pd-od", on: false, v: {} },
    { gear: "pd-eq", on: true, v: {} }
  ]
};
const html = pb.boardArt(bd);
check("une pédale dessinée par emplacement", (html.match(/<svg /g) || []).length === 3,
  String((html.match(/<svg /g) || []).length));
check("les câbles relient les pédales", (html.match(/class="cable"/g) || []).length === 2);
check("l'ordre est numéroté", html.indexOf("1. Compresseur") >= 0 && html.indexOf("3. Égaliseur") >= 0);
check("une pédale coupée est signalée", html.indexOf("· coupée") >= 0);
check("un pédalier vide le dit", pb.boardArt({ kind: "board", slots: [] }).indexOf("Pédalier vide") >= 0);

/* --- une pédale employée dans un pédalier compte comme utilisée --- */
const avant = pb.getState();
pb.setState({ v: 1, custom: [{ id: "u-b", kind: "board", name: "essai", slots: [{ gear: "pd-fuzz", on: true, v: {} }] }],
              overrides: {}, gear: {}, hidden: [] });
check("la pédale d'un pédalier est comptée", pb.gearUsage("pd-fuzz") >= 1, String(pb.gearUsage("pd-fuzz")));
check("une pédale absente des pédaliers n'est pas comptée à tort",
  pb.gearUsage("pd-trem") === 0, String(pb.gearUsage("pd-trem")));
pb.setState(avant);

console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
process.exit(failed ? 1 : 0);
