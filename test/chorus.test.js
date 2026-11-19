/**
 * Une chaîne réelle avec le chorus livré avec Reaper, et le seuil de
 * MCompressor lu comme le plugin l'affiche.
 *   node test/chorus.test.js
 *
 * Les valeurs attendues sont celles relevées à l'écran du plugin pour CETTE
 * chaîne, pas celles qu'on calcule : c'est ce qui a montré que le seuil était
 * lu en 20·log10 (−10,3 dB) là où MCompressor affiche −20,6 dB.
 *
 * Copyright (C) 2026 fuzzinvaders
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const RFX = require("../public/rfxchain.js");
const { run } = require("./sandbox.js");

let failed = 0;
function check(label, ok, detail) {
  if (ok) console.log("  ok    " + label);
  else { failed++; console.log("  ÉCHEC " + label + (detail === undefined ? "" : " — " + detail)); }
}
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-6);

console.log("Chorus JS et seuil de MCompressor");
const brut = fs.readFileSync(path.join(__dirname, "fixtures", "chorus.RfxChain"), "latin1");
const lu = RFX.parse(brut);
const chaine = RFX.toChain(lu);

check("six effets, dans l'ordre de Reaper",
  chaine.map((s) => s.plugin).join(",") === "MTuner,ReaEQ,TSE BOD,ReaEQ,MCompressor,JS: Chorus",
  chaine.map((s) => s.plugin).join(","));
check("l'accordeur en tête, hors circuit", chaine[0].on === false);

/* --- MCompressor, relevé à l'écran : −20,6 dB, 3:1, 25 ms, 120 ms, 5 ms --- */
const mc = chaine[4].p;
check("seuil −20,6 dB comme dans le plugin", mc.thr === -20.573, String(mc.thr));
check("taux 3:1", mc.ratio === 3, String(mc.ratio));
check("attaque 25 ms, relâchement 120 ms, RMS 5 ms",
  mc.attack === 25 && mc.release === 120 && mc.rms === 5, JSON.stringify(mc));
check("plus de clé « threshold » à double sens", mc.threshold === undefined);

/* --- le chorus, relevé à l'écran : 15 / 1 / 0,6 / 0,7 / −15 / 0 --- */
const ch = chaine[5].p;
check("Chorus Length 15 ms", ch.length === 15, String(ch.length));
check("une voix", ch.voices === 1, String(ch.voices));
check("Rate 0,6 Hz", ch.rate === 0.6, String(ch.rate));
check("Pitch Fudge Factor 0,7", ch.fudge === 0.7, String(ch.fudge));
check("Wet −15 dB, Dry 0 dB", ch.wet === -15 && ch.dry === 0, ch.wet + " / " + ch.dry);
check("aucun curseur baptisé « drive » par erreur", ch.drive === undefined);

/* --- aller-retour : rien ne bouge tant qu'on ne touche à rien --- */
/* Seul le saut de ligne final manque : fromChain reconstruit la chaîne
   depuis les maillons, comme pour les autres chaînes de référence. */
check("la chaîne se réécrit à l'octet près",
  RFX.fromChain(chaine) === brut.replace(/\r\n/g, "\n").replace(/\n+$/, ""));

/* --- une modification n'atteint que son curseur --- */
const modif = RFX.toChain(lu);
modif[5].p.wet = -9;
modif[5].p.rate = 1.2;
const sl = RFX.parse(RFX.fromChain(modif)).fx[5].sliders;
check("Wet et Rate écrits à leur place", sl[4] === "-9" && sl[2] === "1.2", sl.slice(0, 6).join(" "));
check("les autres curseurs intacts", sl[0] === "15" && sl[1] === "1" && sl[3] === "0.7" && sl[5] === "0",
  sl.slice(0, 6).join(" "));

/* --- un chorus saisi à la main s'ouvre comme le plugin --- */
const neuf = RFX.parse(RFX.fromChain([{ plugin: "JS: Chorus", on: true, p: { wet: -12 } }]));
check("le gabarit écrit le chemin du JSFX", neuf.fx[0].path === "guitar/chorus", neuf.fx[0].path);
check("les curseurs non saisis prennent les défauts du plugin",
  neuf.fx[0].sliders.slice(0, 6).join(" ") === "15 1 0.5 0.7 -12 -6", neuf.fx[0].sliders.slice(0, 6).join(" "));

/* --- un JSFX inconnu garde ses curseurs, sans nom inventé --- */
const inconnu = RFX.toChain(RFX.parse("<JS truc/machin \"\"\n  3 4 - -\n>\nWAK 0 0\n"))[0];
check("un JSFX inconnu n'a pas de « drive »", !inconnu.p || inconnu.p.drive === undefined,
  JSON.stringify(inconnu.p));
check("ses curseurs restent lisibles", inconnu.settings === "Curseurs : 3 4", inconnu.settings);

/* --- les seuils écrits avant : même octet, chiffre du plugin --- */
const ancien = { plugin: "MCompressor", on: true, p: { threshold: -10.287, ratio: 3 } };
const migre = RFX.migreMaillon(ancien);
check("un seuil d'avant est doublé", migre.p.thr === -20.574 && migre.p.threshold === undefined,
  JSON.stringify(migre.p));
check("l'original n'est pas touché", ancien.p.threshold === -10.287 && ancien.p.thr === undefined);
const octetAvant = Math.pow(10, -10.287 / 20);
const ecrit = RFX.parse(RFX.fromChain([ancien])).fx[0];
const att = ecrit.meldaTree.attrs.filter((a) => a.k === "#threshold")[0];
check("et le fichier écrit garde le même octet : le son ne bouge pas",
  att && near(att.v, octetAvant, 1e-9), att && att.v + " / " + octetAvant);

const page = path.join(__dirname, "..", "public", "index.html");
const w = run(page, { search: "" });
const pb = w.__pb;
const fiche = { id: "u-x", kind: "reaper", name: "x", chain: [JSON.parse(JSON.stringify(ancien))] };
pb.migreFiche(fiche);
check("la page convertit aussi", fiche.chain[0].p.thr === -20.574, JSON.stringify(fiche.chain[0].p));
pb.migreFiche(fiche);
check("deux passages ne doublent pas deux fois", fiche.chain[0].p.thr === -20.574,
  JSON.stringify(fiche.chain[0].p));

const etat = pb.normalize({ custom: [{ id: "u-y", kind: "reaper", name: "y",
  chain: [{ plugin: "MCompressor", p: { threshold: -5 } }] }],
  overrides: { "r-crossfire": { id: "r-crossfire", kind: "reaper",
    chain: [{ plugin: "MCompressor", p: { threshold: -9.956 } }] } },
  trash: [{ at: new Date().toISOString(), preset: { id: "u-z", kind: "reaper",
    chain: [{ plugin: "MCompressor", p: { threshold: -6 } }] } }] });
check("au chargement : fiches, retouches et corbeille converties",
  etat.custom[0].chain[0].p.thr === -10 && etat.overrides["r-crossfire"].chain[0].p.thr === -19.912 &&
  etat.trash[0].preset.chain[0].p.thr === -12,
  [etat.custom[0].chain[0].p.thr, etat.overrides["r-crossfire"].chain[0].p.thr,
   etat.trash[0].preset.chain[0].p.thr].join(" / "));

/* un fichier exporté avant la correction, importé après */
const avant = pb.library().length;
pb.addPreset({ v: 1, presetbook: "preset", gear: {},
  preset: { id: "u-vieux", kind: "reaper", name: "Vieux", tags: [],
            chain: [{ plugin: "MCompressor", on: true, p: { threshold: -7 } }] } });
const vieux = pb.findPreset("u-vieux");
check("un fichier d'avant s'importe converti", pb.library().length === avant + 1 &&
  vieux && vieux.chain[0].p.thr === -14, vieux && JSON.stringify(vieux.chain[0].p));

/* la fiche livrée affiche ce que montre Reaper */
const cf = pb.findPreset("r-crossfire");
const mcCf = cf.chain.filter((s) => s.plugin === "MCompressor")[0];
check("Crossfire : seuil −19,9 dB, le chiffre du plugin",
  pb.fmtParam(pb.pluginDef("MCompressor").params[0], mcCf.p.thr) === "-19,9 dB",
  pb.fmtParam(pb.pluginDef("MCompressor").params[0], mcCf.p.thr));
check("le chorus a sa fiche technique", pb.pluginDef("JS: Chorus").params.length === 6);

console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
process.exit(failed ? 1 : 0);
