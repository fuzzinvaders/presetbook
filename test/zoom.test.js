/**
 * Le Zoom B2 FOUR : le catalogue tiré des documents de Zoom, les règles de
 * l'appareil, l'import et l'export des fiches et des banques, et l'aller-retour
 * par le serveur.
 *   node test/zoom.test.js
 *
 * Copyright (C) 2026 fuzzinvaders
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
"use strict";
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const Z = require("../public/zoom-b2four.js");
const { run } = require("./sandbox.js");

let failed = 0;
function check(label, ok, detail) {
  if (ok) console.log("  ok    " + label);
  else { failed++; console.log("  ÉCHEC " + label + (detail === undefined ? "" : " — " + detail)); }
}
const page = path.join(__dirname, "..", "public", "index.html");
const EX = path.join(__dirname, "..", "docs", "exemples");
const lireJson = (f) => JSON.parse(fs.readFileSync(path.join(EX, f), "utf8"));
const copie = (x) => JSON.parse(JSON.stringify(x));
console.log("Zoom B2 FOUR");

/* --- le catalogue, tel que le document de Zoom le publie --------------------
 * « B2 FOUR Effect Types and Parameters » (Z2I-4875-01) : 104 effets en douze
 * catégories. Un compte faux voudrait dire un effet oublié ou inventé. */
const parCat = {};
Z.ORDER.forEach((n) => { parCat[Z.FX[n].cat] = (parCat[Z.FX[n].cat] || 0) + 1; });
check("104 effets, le compte annoncé par Zoom", Z.ORDER.length === 104, String(Z.ORDER.length));
const attendu = { DYNAMICS: 10, FILTER: 14, DRIVE: 13, PREAMP: 11, MODULATION: 11, "PITCH SHIFT": 6,
  SYNTH: 3, DELAY: 7, REVERB: 8, SFX: 4, PEDAL: 6, "BASS AMP": 11 };
check("la répartition par catégorie est celle du document",
  JSON.stringify(parCat) === JSON.stringify(attendu), JSON.stringify(parCat));
check("des noms tels qu'imprimés", ["ZTRON FILTER", "NEW YORK MUFF FUZZ", "BASS TS DRIVE", "D.I PLUS PREAMP",
  "TS+BOOST DRIVE", "PHASER+DISTORTION", "BRGHT HALL REVERB", "MINI MARK-B", "AMPG SVT"].every((n) => Z.FX[n]));
check("onze modèles d'ampli, baffle compris",
  Z.ORDER.filter((n) => Z.FX[n].cat === "BASS AMP").join(",") ===
  "FLIPTOP,AMPG SVT,AG 750,SMR400,EBH360,MINI MARK-B,TE400SMX,B-MAN100,AC 370,SUN CB,MONOTONE");
let bornesOk = true, sansDefaut = true;
Z.ORDER.forEach((n) => Z.FX[n].params.forEach((d) => {
  if (!d.opts && d.t !== "text" && !(d.min < d.max)) bornesOk = false;
  if (d.d !== undefined) sansDefaut = false;
}));
check("chaque paramètre a ses bornes ou sa liste", bornesOk);
check("aucune valeur par défaut inventée : le document n'en publie pas", sansDefaut);
const sansDoublon = Z.ORDER.every((n) => {
  const k = Z.FX[n].params.map((d) => d.k);
  return new Set(k).size === k.length;
});
check("pas deux paramètres du même nom dans un effet", sansDoublon);
check("les plages relevées : 160 COMPRESSOR, THRSHLD −60 à 0, RATIO au dixième",
  Z.paramDef("160 COMPRESSOR", "THRSHLD").min === -60 && Z.paramDef("160 COMPRESSOR", "RATIO").step === 0.1);
check("les fréquences en Hz, bornes du document",
  Z.paramDef("AMPG SVT", "MID-FREQ").min === 32 && Z.paramDef("AMPG SVT", "MID-FREQ").max === 6300 &&
  Z.fmtHz(6300) === "6.3 kHz" && Z.fmtHz(640) === "640 Hz");
check("les six DI et OFF", Z.DI_MODELS.length === 7 && Z.DI_MODELS.indexOf("SOLID STATE 3") > 0);
check("300 patchs, numérotés à partir de 001", Z.LIMITS.patchMin === 1 && Z.LIMITS.patchMax === 300);

/* --- les règles de l'appareil ------------------------------------------- */
function fiche(chain, extra) {
  return Object.assign({ id: "u-t", kind: "zoom", gear: "b2four", name: "TEST", chain: chain }, extra || {});
}
const b = (fx, p) => ({ fx: fx, on: true, p: p || {} });
const v = (p) => Z.validatePreset(p);
check("cinq effets passent", v(fiche([b("DELAY"), b("HALL REVERB"), b("TREMOLO"), b("PHASER"), b("AMPG SVT")])).errors.length === 0);
check("six effets sont refusés",
  v(fiche([b("DELAY"), b("HALL REVERB"), b("TREMOLO"), b("PHASER"), b("AMPG SVT"), b("LOW EQ")])).errors.length === 1);
check("deux amplis sont refusés", v(fiche([b("AMPG SVT"), b("FLIPTOP")])).errors.length === 1);
check("deux pédales sont refusées", v(fiche([b("BASS WAH"), b("PEDAL VOLUME")])).errors.length === 1);
check("deux préamplis passent : la limite ne vise qu'ampli et pédale",
  v(fiche([b("BASS DRIVER PREAMP"), b("DARK PREAMP")])).errors.length === 0);
check("un effet inconnu est refusé, nommé",
  /effet inconnu/.test(v(fiche([b("FUZZ IMAGINAIRE")])).errors.map((e) => e.m).join()));
const inconnu = v(fiche([b("TREMOLO", { DEPTH: 50, COULEUR: 3 })]));
check("un paramètre inconnu est signalé sans refuser", inconnu.errors.length === 0 && inconnu.warnings.length === 1);
check("une valeur hors plage est signalée", v(fiche([b("TREMOLO", { DEPTH: 150 })])).warnings.length === 1);
check("une valeur hors liste est signalée", v(fiche([b("TREMOLO", { WAVE: "SINE" })])).warnings.length === 1);
check("SENSE ne prend pas 0 (« -10 – -1, 1 – 10 »)", v(fiche([b("BASS AUTO WAH", { SENSE: 0 })])).warnings.length === 1);
check("SHIFT prend 24 en plus de −12 à 12", v(fiche([b("PITCHSHIFT", { SHIFT: 24 })])).warnings.length === 0);
check("OFF est permis là où le document l'imprime", v(fiche([b("DJENT PREAMP", { LOCUT: "OFF" })])).warnings.length === 0 &&
  v(fiche([b("DJENT PREAMP", { HIBOOST: "OFF" })])).warnings.length === 0);
check("et refusé ailleurs", v(fiche([b("TREMOLO", { DEPTH: "OFF" })])).warnings.length === 1);
check("trop de décimales pour le pas", v(fiche([b("160 COMPRESSOR", { RATIO: 4.25 })])).warnings.length === 1);
check("en mode métronome, le temps d'un delay se lit en valeur de note",
  v(fiche([b("DELAY", { MODE: "METRONOME", TIME: "♩" })])).warnings.length === 0);
check("le GAIN du LOW EQ est sans effet en HPF",
  Z.isInactive(Z.paramDef("LOW EQ", "GAIN"), { TYPE: "HPF" }) && !Z.isInactive(Z.paramDef("LOW EQ", "GAIN"), { TYPE: "SHELF" }));
check("un patch hors 001–300 est signalé", v(fiche([], { patch: 301 })).warnings.length === 1);
check("un caractère que l'appareil n'affiche pas est signalé", v(fiche([], { name: "ÉTÉ" })).warnings.length === 1);
check("un nom de plus de 14 caractères est signalé", v(fiche([], { name: "UN NOM BIEN TROP LONG" })).warnings.length === 1);
check("un autre catalogue est signalé", v(fiche([], { catalog: "B2FOUR-FX/AUTRE" })).warnings.length === 1);

/* --- les exemples livrés ------------------------------------------------- */
const exFiche = lireJson("reptilia.presetbook.json");
const exBanque = lireJson("yaserock64-exemple.b2four-bank.json");
const rEx = v(exFiche.preset);
check("REPTILIA est conforme, sans un avertissement", rEx.errors.length === 0 && rEx.warnings.length === 0,
  JSON.stringify(rEx));
check("REPTILIA tient dans l'appareil : 4 effets dont un ampli",
  exFiche.preset.chain.length === 4 && exFiche.preset.chain.filter((x) => Z.FX[x.fx].cat === "BASS AMP").length === 1);
check("REPTILIA prend un patch libre, hors des patchs d'usine",
  exFiche.preset.patch > Z.LIMITS.factoryMax && exFiche.preset.patch <= Z.LIMITS.patchMax);
check("REPTILIA est de la famille Indie Drive, et sert Reptilia",
  exFiche.preset.family === "Indie Drive" && exFiche.preset.song === null &&
  JSON.stringify(exFiche.preset.songs) === JSON.stringify([{ title: "Reptilia", artist: "The Strokes" }]));
const rBk = Z.validateBank(exBanque);
check("la banque d'exemple est conforme", rBk.errors.length === 0 && rBk.warnings.length === 0 &&
  rBk.presets.every((x) => !x.errors.length && !x.warnings.length), JSON.stringify(rBk.presets.map((x) => x.warnings)));
check("une famille, pas un patch par morceau : pas de variante inventée",
  exBanque.presets.length === 1 && !exBanque.presets[0].variantOf);
check("la banque refuse un format plus récent", Z.validateBank(Object.assign(copie(exBanque), { v: 2 })).errors.length === 1);
check("et un autre appareil", Z.validateBank(Object.assign(copie(exBanque), { device: "zoom-b1four" })).errors.length === 1);

/* Une banque de test : deux familles bien distinctes et une variante qui
   change vraiment quelque chose. Les morceaux sont inventés pour le test. */
const S1 = { title: "Morceau A", artist: "Groupe X" }, S2 = { title: "Morceau B", artist: "Groupe Y" };
const S3 = { title: "Morceau C", artist: "Groupe X" }, S4 = { title: "Morceau D", artist: "Groupe Z" };
const cle = (m) => m.title + " — " + m.artist;
const indie = Object.assign(copie(exFiche.preset), { songs: [copie(exFiche.preset.songs[0]), S1, S3] });
const punk = Object.assign(copie(exFiche.preset), {
  id: "u-punk", name: "Punk Attack", patchName: "PUNK ATTACK", patch: 252, family: "Punk Attack", songs: [S2],
  chain: [{ fx: "BASS OVER DRIVE", on: true, p: { GAIN: 70, TONE: 60, BALANCE: 60, VOL: 50 } },
          { fx: "FLIPTOP", on: true, p: { BRIGHT: "ON", GAIN: 60, VOL: 70, BLEND: 100 } }] });
const indieRefrain = Object.assign(copie(indie), {
  id: "u-indie-refrain", name: "Indie Drive — refrain", patchName: "INDIE REF", patch: 253,
  variant: "refrain", variantOf: "u-reptilia", songs: [S3] });
indieRefrain.chain[1].p.GAIN = 55;
const banqueTest = Z.bankEnvelope("Test", { di: "TUBE 1" }, [indie, punk, indieRefrain], {});
const rT = Z.validateBank(banqueTest);
check("deux familles distinctes et une vraie variante : rien à redire",
  rT.presets.every((x) => !x.errors.length && !x.warnings.length), JSON.stringify(rT.presets.map((x) => x.warnings)));
const doublon = copie(banqueTest); doublon.presets[1].patch = doublon.presets[0].patch;
check("deux fiches sur le même patch sont signalées",
  Z.validateBank(doublon).presets[1].warnings.some((w) => /déjà pris/.test(w.m)));

/* --- les doublons et les différences artificielles ------------------------ */
const avis = (presets) => Z.validateBank(Z.bankEnvelope("T", {}, presets, {})).presets
  .map((x) => x.warnings.map((w) => w.m).join(" | ")).join(" || ");
const jumeau = Object.assign(copie(indie), { id: "u-jumeau", name: "Jumeau", patch: 260, songs: [S4] });
check("deux presets aux mêmes réglages : un seul patch suffit", /exactement les réglages/.test(avis([indie, jumeau])));
const presque = copie(jumeau); presque.chain[2].p.VOL = 75; presque.chain[0].p.TONE = 60;
check("deux presets qui ne diffèrent que de peu : une seule famille suffirait",
  /petits réglages/.test(avis([indie, presque])));
const autre = copie(jumeau); autre.chain[1].p.GAIN = 70;
check("une vraie différence de son n'est pas signalée", avis([indie, autre]) === " || ", avis([indie, autre]));
const autreChaine = copie(jumeau); autreChaine.chain.pop();
check("une autre chaîne n'est jamais un doublon", avis([indie, autreChaine]) === " || ");
const varianteVide = Object.assign(copie(indie), { id: "u-v", name: "Variante vide", patch: 261, variantOf: "u-reptilia", songs: [S1] });
check("une variante qui ne change rien est signalée", /ne change rien/.test(avis([indie, varianteVide])));
const varianteMince = copie(varianteVide); varianteMince.chain[2].p.VOL = 72;
check("une variante qui change à peine est questionnée", /est-elle utile/.test(avis([indie, varianteMince])));
const concurrent = Object.assign(copie(punk), { id: "u-concurrent", name: "Concurrent", patch: 262, songs: [S1] });
check("deux presets principaux pour un même morceau sont signalés", /déjà couvert/.test(avis([indie, concurrent])));
check("une fréquence à un quart d'octave près reste « proche »",
  Z.procheDe({ chain: [{ fx: "AMPG SVT", p: { "MID-FREQ": 500 } }] }, { chain: [{ fx: "AMPG SVT", p: { "MID-FREQ": 560 } }] }).proche &&
  !Z.procheDe({ chain: [{ fx: "AMPG SVT", p: { "MID-FREQ": 500 } }] }, { chain: [{ fx: "AMPG SVT", p: { "MID-FREQ": 800 } }] }).proche);

/* --- la liste des effets et le schéma se déduisent du catalogue ----------- */
const gen = require("../tools/zoom-docs.js").tout();
const lu = (f) => fs.readFileSync(path.join(__dirname, "..", "docs", f), "utf8").replace(/\r\n/g, "\n");
check("la liste des effets est à jour (node tools/zoom-docs.js)", lu("zoom-b2four-effets.md") === gen.liste);
check("le schéma est à jour (node tools/zoom-docs.js)", lu("zoom-b2four.schema.json") === gen.schema);
const sch = JSON.parse(gen.schema);
check("le schéma connaît exactement les effets du catalogue",
  sch.$defs.bloc.properties.fx.enum.join() === Z.ORDER.join() && sch.$defs.bloc.allOf.length === 104);
check("le schéma borne la chaîne à cinq blocs, un ampli, une pédale",
  sch.$defs.fiche.properties.chain.maxItems === 5 &&
  sch.$defs.fiche.properties.chain.allOf.every((x) => x.maxContains === 1));

/* --- dans la page -------------------------------------------------------- */
const w = run(page, { search: "", ZB2F: Z });
const pb = w.__pb;
const avant = pb.library().length;
pb.addPreset(copie(exFiche));
const rep = pb.findPreset("u-reptilia");
check("REPTILIA s'importe", pb.library().length === avant + 1 && !!rep);
check("la fiche importée est identique au fichier", JSON.stringify(rep) === JSON.stringify(exFiche.preset));

const carte = pb.zoomBody(rep);
const chemin = carte.slice(carte.indexOf('class="zpath"'));
check("la carte montre la chaîne dans l'ordre, de IN à OUT",
  chemin.indexOf("IN") < chemin.indexOf("DYNAMIC COMPRESSOR") &&
  chemin.indexOf("DYNAMIC COMPRESSOR") < chemin.indexOf("BASS DRIVER PREAMP") &&
  chemin.indexOf("BASS DRIVER PREAMP") < chemin.indexOf("AMPG SVT") &&
  chemin.indexOf("AMPG SVT") < chemin.indexOf("LOW EQ") && chemin.indexOf("LOW EQ") < chemin.indexOf("OUT"));
check("l'ampli est repéré dans la chaîne", /class="zb amp"[^>]*>[\s\S]{0,120}AMPG SVT/.test(carte));
check("le numéro de patch sur trois chiffres", carte.indexOf("Patch 251") >= 0);
check("les fréquences s'écrivent comme sur le document", carte.indexOf("500 Hz") >= 0 && carte.indexOf("1.0 kHz") >= 0);
check("le GAIN du LOW EQ en HPF est dit sans effet", /sans effet ici/.test(carte));
check("le niveau reste à vérifier, il n'est pas calculé", carte.indexOf("Niveau à vérifier aux essais") >= 0);
check("la basse se lit sur sa propre façade", carte.indexOf("Yamaha BB734A") >= 0 && carte.indexOf("45-105") >= 0);
check("l'aperçu replié dit patch, famille, effets et ampli",
  pb.apercuFiche(rep) === "251 · Indie Drive · 4 effets · AMPG SVT", pb.apercuFiche(rep));
check("la carte nomme la famille", /Zoom B2 FOUR · <b>Indie Drive<\/b>/.test(carte));
check("et les morceaux servis", carte.indexOf("Pour 1 morceau") >= 0 && carte.indexOf("Reptilia") >= 0);

pb.openEditor(rep, false);
const ed = w.__nodes.get("veil").innerHTML;
check("l'éditeur a un bloc par effet", (ed.match(/data-zi="/g) || []).length === 4);
check("l'éditeur demande la famille, avec celles déjà nommées", /data-f="family"/.test(ed) && /<datalist id="zfamilles">/.test(ed));
check("l'éditeur liste les morceaux servis, un par ligne", (ed.match(/data-zs="/g) || []).length === 1 &&
  /data-zsact="add"/.test(ed));
check("le champ « morceau » unique a disparu pour une famille", !/data-f="song.title"/.test(ed));
check("chaque paramètre a son champ", (ed.match(/data-zp="/g) || []).length ===
  rep.chain.reduce((a, s) => a + Z.FX[s.fx].params.length, 0));
check("l'éditeur dit la fiche conforme", /Conforme au B2 FOUR : 4 effets sur 5/.test(ed));
check("à quatre, on peut encore ajouter un effet", !/data-zadd disabled/.test(ed));
check("un second ampli ne se propose pas tant qu'il y en a un",
  /<option value="FLIPTOP" disabled>/.test(pb.zoomEditor(pb.getDraft())));
const dPlein = pb.getDraft();
dPlein.chain.push({ fx: "TREMOLO", on: true, p: {} }, { fx: "PHASER", on: true, p: {} });
check("à cinq, l'ajout est désactivé", /data-zadd disabled/.test(pb.zoomEditor(dPlein)));
dPlein.chain.push({ fx: "HALL REVERB", on: true, p: {} });
pb.commit();
check("une chaîne de six ne s'enregistre pas", pb.findPreset("u-reptilia").chain.length === 4);
dPlein.chain.splice(4);
dPlein.chain.push({ fx: "FLIPTOP", on: true, p: {} });
check("deux amplis sont signalés dans l'éditeur", /Un seul effet BASS AMP par patch/.test(pb.zCheckHtml(dPlein)));

/* une variante : même morceau, son propre patch */
pb.creerVariante("u-reptilia");
const va = pb.getDraft();
check("une variante pointe vers sa fiche d'origine", va.variantOf === "u-reptilia" && va.patch === null && va.id !== "u-reptilia");
va.name = "Reptilia sans sat"; va.variant = "couplet"; va.patch = 253;
pb.commit();
check("et s'enregistre à côté", !!pb.findPreset(va.id) && pb.findPreset(va.id).variantOf === "u-reptilia");

/* la comparaison descend jusqu'aux réglages qui diffèrent */
const sat = copie(rep); sat.id = "u-cmp"; sat.chain[1].p.GAIN = 55;
const lignes = pb.compareRows(rep, sat);
check("comparer deux fiches Zoom montre le réglage qui change",
  lignes.some((l) => l.l === "2. GAIN" && l.a === "35" && l.b === "55"));

/* --- l'export d'une fiche, puis son retour sans perte --------------------- */
const sortie = JSON.parse(pb.presetFile(rep));
const w2 = run(page, { search: "", ZB2F: Z });
w2.__pb.addPreset(sortie);
check("une fiche exportée revient à l'identique",
  JSON.stringify(w2.__pb.findPreset("u-reptilia")) === JSON.stringify(rep));

/* --- une banque ---------------------------------------------------------- */
const w3 = run(page, { search: "", ZB2F: Z });
const p3 = w3.__pb;
p3.importerBanque(copie(banqueTest));
const sets3 = p3.getState().sets;
check("une banque importe toutes ses fiches",
  ["u-reptilia", "u-punk", "u-indie-refrain"].every((id) => !!p3.findPreset(id)));
check("sa configuration devient une setlist, avec chaque morceau une fois",
  sets3.length === 1 && sets3[0].name === "Test" && sets3[0].di === "TUBE 1" &&
  sets3[0].songs.join("|") === ["Reptilia — The Strokes", cle(S1), cle(S3), cle(S2)].join("|"), JSON.stringify(sets3));
sets3[0].songs.push(cle(S4));
sets3[0].songs = [cle(S1), cle(S2), cle(S3), cle(S4)];
const cv = p3.couverture(sets3[0]);
check("chaque morceau a son preset principal, pas une variante",
  cv.lignes[2].principal.id === "u-reptilia" && cv.lignes[2].variantes[0].id === "u-indie-refrain");
check("un morceau sans preset se voit", cv.sans === 1 && cv.lignes[3].principal === null);
check("le set compte ses changements de patch", cv.changements === 2 && cv.presets === 3, JSON.stringify(cv));
const section = p3.zoomBankSection(sets3[0]);
check("la banque le dit en une ligne", /3 presets pour 4 morceaux · 2 changements de patch sur le set/.test(section) &&
  /1 morceau\(x\) sans preset/.test(section));
check("une famille paraît sous chacun de ses morceaux quand on range par morceau",
  (() => { p3.ui().group = "song"; p3.render(); const h = w3.__nodes.get("list").innerHTML;
           return (h.match(/data-id="u-reptilia"/g) || []).length === 3; })());
check("ouvrir la setlist garde une famille dès qu'un de ses morceaux y est",
  (() => { p3.ui().group = "kind"; p3.setlistOuvre(sets3[0].id);
           return p3.matches(p3.findPreset("u-punk")) && p3.matches(p3.findPreset("u-reptilia")); })());
sets3[0].di = "TUBE 2";
const env3 = p3.enveloppeBanque(sets3[0]);
check("la banque exportée garde le DI MODEL au niveau de la banque",
  env3.config.di === "TUBE 2" && env3.presets.every((x) => x.di === undefined));
check("chaque famille une seule fois, dans l'ordre des patchs", env3.presets.map((x) => x.patch).join() === "251,252,253");
check("l'enveloppe se décrit : format, appareil, catalogue",
  env3.v === 1 && env3.presetbook === "bank" && env3.device === "zoom-b2four" && env3.catalog === Z.CATALOG);
const w4 = run(page, { search: "", ZB2F: Z });
w4.__pb.importerBanque(copie(env3));
check("réimportée ailleurs, la banque revient sans perte",
  ["u-reptilia", "u-punk", "u-indie-refrain"].every((id) =>
    JSON.stringify(w4.__pb.findPreset(id)) === JSON.stringify(p3.findPreset(id))));
check("avec son DI MODEL", w4.__pb.getState().sets[0].di === "TUBE 2");

/* réimportée dans la même bibliothèque : rien n'est écrasé, les liens suivent */
p3.importerBanque(copie(env3));
const copies = p3.library().filter((x) => x.kind === "zoom");
const neuveSat = copies.find((x) => x.id !== "u-indie-refrain" && x.name.indexOf("refrain") >= 0);
const neuveRep = copies.find((x) => x.id !== "u-reptilia" && x.family === "Indie Drive" && !x.variantOf);
check("réimportée sur elle-même, elle s'ajoute sans rien écraser", copies.length === 6);
check("et la variante suit sa fiche d'origine renommée",
  !!neuveSat && !!neuveRep && neuveSat.variantOf === neuveRep.id, neuveSat && neuveSat.variantOf);

/* une banque refusée n'ajoute rien, et dit pourquoi */
const w5 = run(page, { search: "", ZB2F: Z });
const n5 = w5.__pb.library().length;
w5.__pb.importerBanque(Object.assign(copie(banqueTest), { v: 9 }));
check("une banque d'un format plus récent n'ajoute rien", w5.__pb.library().length === n5);
check("et un compte-rendu dit pourquoi", /plus récent/.test(w5.__nodes.get("veil").innerHTML));
const mauvaise = copie(banqueTest);
mauvaise.presets[0].chain.push({ fx: "FLIPTOP", on: true, p: {} });
w5.__pb.importerBanque(mauvaise);
check("une fiche invalide est écartée, les autres entrent",
  w5.__pb.library().length === n5 + 2 && !!w5.__pb.findPreset("u-punk") && !w5.__pb.findPreset("u-reptilia"));

/* le même JSON passe aussi par le bloc de sauvegarde et par un dépôt */
const w6 = run(page, { search: "", ZB2F: Z });
w6.FileReader = function () {
  this.readAsText = function (file) { this.result = file.__texte; if (this.onload) this.onload(); };
};
w6.__pb.deposerFichier({ name: "yaserock64.b2four-bank.json", __texte: JSON.stringify(exBanque) });
check("une banque déposée sur la page s'importe", !!w6.__pb.findPreset("u-reptilia"));

/* une fiche écrite en 1.14 portait un seul morceau : il passe dans la liste */
const ancienne = copie(exFiche.preset);
ancienne.id = "u-114"; ancienne.song = { title: "Reptilia", artist: "The Strokes" }; delete ancienne.songs; delete ancienne.family;
w6.__pb.addPreset({ v: 1, presetbook: "preset", preset: ancienne, gear: {} });
const convertie = w6.__pb.findPreset("u-114");
check("une fiche 1.14 garde son morceau, rangé dans la liste",
  !!convertie && convertie.song === null && convertie.songs.length === 1 && convertie.songs[0].title === "Reptilia");

/* les filtres : la marque de la basse ramène aussi le patch */
check("la fiche Zoom compte la marque de sa basse et celle de l'appareil",
  JSON.stringify(pb.brandsOf(rep)) === JSON.stringify(["Zoom", "Yamaha"]), JSON.stringify(pb.brandsOf(rep)));

/* sans catalogue (miroir publié), une fiche Zoom reste lisible */
const nu = run(page, { search: "" });
nu.__pb.getState().custom.push(copie(exFiche.preset));
let lisible = true;
try { nu.__pb.render(); } catch (e) { lisible = false; }
check("sans catalogue, la carte s'affiche quand même",
  lisible && nu.__nodes.get("list").innerHTML.indexOf("AMPG SVT") >= 0);

/* Un fieldset ne rétrécit pas sous la largeur de son contenu : la liste des
   effets, aux noms longs, poussait la feuille hors d'un écran de téléphone. */
const css = fs.readFileSync(page, "utf8");
check("sur téléphone, la feuille d'édition ne déborde pas",
  /fieldset\{[^}]*min-width:0/.test(css) && /select\[data-zfx\]\{[^}]*min-width:0/.test(css));

/* --- en anglais : aucune trace de français -------------------------------- */
const en = run(page, { search: "?lang=en", ZB2F: Z });
en.__pb.addPreset(copie(exFiche));
const francais = /[éèêëàâçùûôîïœ]|\b(les|des|une|aucun|avec|dans|pour|cette|sur|par|est|sont|qui|que|fiche|fiches|Niveau|Variante|Basse|Jeu|Cordes|Tirant)\b/;
function visibles(html) {
  return (String(html).match(/>[^<>]+</g) || []).map((r) => r.slice(1, -1).replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 2);
}
const fEn = en.__pb.findPreset("u-reptilia");
const ecrans = {
  "la carte": en.__pb.tHtml(en.__pb.zoomBody(fEn)),
  "l'éditeur": (() => { en.__pb.openEditor(fEn, false); return en.__nodes.get("veil").innerHTML; })(),
  "la banque": en.__pb.tHtml(en.__pb.zoomBankSection({ id: "s-x", name: "X", songs: ["Reptilia — The Strokes"], di: null }))
};
Object.keys(ecrans).forEach((nom) => {
  /* Les notes et le jeu sont du texte saisi : ils ne se traduisent pas. */
  const restes = visibles(ecrans[nom]).filter((s) => francais.test(s) &&
    s.indexOf(fEn.notes.slice(0, 20)) < 0 && s.indexOf(fEn.level.note.slice(0, 15)) < 0 &&
    s.indexOf("Dunlop") < 0 && s.indexOf("Rondes") < 0 && s.indexOf("rock") < 0);
  check("aucun français dans " + nom + " en anglais", restes.length === 0, restes.slice(0, 6).join(" | "));
});

/* --- l'aller-retour par le serveur --------------------------------------- */
(async function () {
  /* Le compte-rendu d'une banque importée s'ouvre une fois l'enregistrement fait. */
  await new Promise((r) => setTimeout(r, 50));
  check("le compte-rendu nomme la fiche refusée", /Refusée/.test(w5.__nodes.get("veil").innerHTML));
  const PORT = 8650 + (process.pid % 50);
  const BASE = "http://127.0.0.1:" + PORT;
  const dossier = await fsp.mkdtemp(path.join(os.tmpdir(), "presetbook-zoom-"));
  const serveur = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1", DATA_DIR: dossier }, stdio: "ignore" });
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    for (let i = 0; i < 60; i++) { try { await fetch(BASE + "/healthz"); break; } catch { await attendre(100); } }
    const r = await fetch(BASE + "/api/register", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "zoom", password: "un-mot-de-passe-long" }) });
    const cookie = (r.headers.get("set-cookie") || "").split(";")[0];
    const etat = p3.getState();
    await fetch(BASE + "/api/presets", { method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(etat) });
    const relu = await (await fetch(BASE + "/api/presets", { headers: { Cookie: cookie } })).json();
    const zr = (relu.custom || []).filter((x) => x.kind === "zoom");
    check("le serveur garde les fiches Zoom telles quelles",
      zr.length === 6 && JSON.stringify(zr[0]) === JSON.stringify(etat.custom.filter((x) => x.kind === "zoom")[0]));
    check("et le DI MODEL de la banque", (relu.sets || []).some((x) => x.di === "TUBE 2"), JSON.stringify(relu.sets));
  } catch (e) {
    failed++; console.log("  ÉCHEC serveur — " + e.message);
  } finally {
    serveur.kill(); await attendre(200);
    await fsp.rm(dossier, { recursive: true, force: true }).catch(() => {});
  }
  console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
  process.exit(failed ? 1 : 0);
})();
