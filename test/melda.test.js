/**
 * Les plugins MeldaProduction dans une chaîne Reaper.
 *
 * Leur état n'est pas un bloc opaque : c'est un arbre nommé, compressé en
 * zlib. Trois choses se vérifient ici, et chacune a déjà cassé quelque chose :
 *
 *   - la décompression maison lit bien ce que zlib écrit — sinon tout le reste
 *     est construit sur du sable ;
 *   - une valeur qu'on n'a pas touchée repart telle quelle, au flottant près ;
 *   - l'en-tête du conteneur VST annonce la vraie taille du bloc. Il la portait
 *     en dur depuis le gabarit : un ReaEQ de quatre bandes s'exportait avec
 *     « 238 » pour 156 octets réels, et Reaper lisait à côté.
 *
 * Copyright (C) 2026 fuzzinvaders
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const RFX = require("../public/rfxchain.js");

let echecs = 0;
function check(nom, ok, vu) {
  if (ok) { console.log("  ok    " + nom); return; }
  echecs++;
  console.log("  ÉCHEC " + nom + (vu === undefined ? "" : " — " + vu));
}

console.log("codec MeldaProduction");

/* ------------------------------------------------------------------ zlib */

let zOk = 0, zKo = 0;
for (let n = 0; n < 200; n++) {
  const len = Math.floor(Math.random() * 3000);
  const b = Buffer.alloc(len);
  for (let i = 0; i < len; i++) {
    /* quatre textures : bruit, motif, creux, demi-octets — les trois types de
       bloc deflate (stocké, Huffman fixe, Huffman dynamique) sont atteints */
    b[i] = n % 4 === 0 ? Math.floor(Math.random() * 256)
         : n % 4 === 1 ? 65 + (i % 4)
         : n % 4 === 2 ? (Math.random() < 0.8 ? 0 : Math.floor(Math.random() * 256))
         : Math.floor(Math.random() * 64);
  }
  for (const niveau of [0, 1, 6, 9]) {
    const relu = Buffer.from(RFX.zlibInflate(new Uint8Array(zlib.deflateSync(b, { level: niveau }))));
    relu.equals(b) ? zOk++ : zKo++;
  }
  /* et ce qu'on écrit doit se relire ailleurs */
  if (!zlib.inflateSync(Buffer.from(RFX.zlibStore(new Uint8Array(b)))).equals(b)) zKo++;
}
check("la décompression maison suit zlib", zKo === 0, zKo + " écarts sur " + (zOk + zKo));

for (const n of [0, 1, 65535, 65536, 140000]) {
  const b = Buffer.alloc(n);
  for (let i = 0; i < n; i++) b[i] = i & 0xff;
  const ok = zlib.inflateSync(Buffer.from(RFX.zlibStore(new Uint8Array(b)))).equals(b);
  check("compression maison relue par zlib (" + n + " octets)", ok);
}

/* --------------------------------------------------------- lecture réelle */

const brut = fs.readFileSync(path.join(__dirname, "fixtures", "melda.RfxChain"), "utf8");
const lu = RFX.parse(brut);

check("les trois plugins sont décodés",
  lu.fx.map((f) => f.name + ":" + f.decoded).join(" ") ===
  "MTuner:melda MCompressor:melda MSaturator:melda",
  lu.fx.map((f) => f.name + ":" + f.decoded).join(" "));

check("aller-retour sans modification à l'octet près",
  RFX.build(lu) === brut.replace(/\r\n/g, "\n"));

const chaine = RFX.toChain(lu);
const comp = chaine[1].p, sat = chaine[2].p;
check("seuil du MCompressor lu en décibels", Math.abs(comp.threshold + 9.033) < 0.001, comp.threshold);
check("taux lu", Math.abs(comp.ratio - 4) < 0.01, comp.ratio);
check("attaque lue en millisecondes", comp.attack === 15, comp.attack);
check("rétablissement lu en millisecondes", comp.release === 90, comp.release);
check("gain d'entrée du MSaturator lu en décibels", sat.input === 5, sat.input);
check("gain de sortie lu", sat.output === -3, sat.output);
check("dosage lu en pourcentage", sat.drywet === 25, sat.drywet);
check("écrêtage lu", sat.clip === false, sat.clip);
check("l'accordeur désactivé le reste", chaine[0].on === false, chaine[0].on);

/* ------------------------------------------ une valeur intacte reste intacte */

function etatDe(fx) {
  return RFX.parseMelda(RFX.zlibInflate(Buffer.from(fx.chunk64, "base64").slice(8)));
}
const refait = RFX.parse(RFX.fromChain(chaine));
for (let i = 0; i < lu.fx.length; i++) {
  check("état de " + lu.fx[i].name + " inchangé après un aller-retour par les réglages",
    JSON.stringify(etatDe(lu.fx[i])) === JSON.stringify(etatDe(refait.fx[i])));
}

/* ------------------------------------------------------ écriture de zéro */

const neuve = RFX.fromChain([
  { plugin: "MCompressor", on: true,
    p: { threshold: -12, ratio: 3, attack: 8, release: 120, rms: 4 } },
  { plugin: "MSaturator", on: true, p: { input: 2, output: -2, drywet: 40, clip: true } },
  { plugin: "MTuner", on: false, p: {} }
]);
const neuveLue = RFX.parse(neuve);
check("une chaîne Melda se fabrique sans import", neuveLue.fx.length === 3, neuveLue.fx.length);
check("les identités sont celles du plugin",
  neuveLue.fx.map((f) => f.name).join(",") === "MCompressor,MSaturator,MTuner",
  neuveLue.fx.map((f) => f.name).join(","));
const n2 = RFX.toChain(neuveLue);
check("seuil relu", n2[0].p.threshold === -12, n2[0].p.threshold);
check("taux relu", Math.abs(n2[0].p.ratio - 3) < 1e-9, n2[0].p.ratio);
check("attaque relue", n2[0].p.attack === 8, n2[0].p.attack);
check("dosage relu", n2[1].p.drywet === 40, n2[1].p.drywet);
check("écrêtage relu", n2[1].p.clip === true, n2[1].p.clip);
check("l'accordeur reste désactivé", n2[2].on === false, n2[2].on);
check("le nom de programme accompagne les plugins VST3",
  (neuve.match(/PRESETNAME 0/g) || []).length === 3,
  String((neuve.match(/PRESETNAME 0/g) || []).length));

/* La courbe de compression se déduit du seuil et du taux : à 0 dB d'entrée,
   la sortie vaut seuil × (1 − 1/taux) en décibels. Relevé au bit près sur une
   chaîne réelle ; sans elle, le seuil n'aurait aucun effet dans le plugin.   */
const arbre = etatDe(neuveLue.fx[0]);
const graphe = arbre.kids.filter((k) => k.name === "graph")[0];
check("la courbe de compression est écrite", !!graphe && graphe.kids.length === 3,
  graphe ? graphe.kids.length : "absente");
if (graphe && graphe.kids.length === 3) {
  const attr = (nd, k) => (nd.attrs.filter((a) => a.k === k)[0] || {}).v;
  const seuil = Math.pow(10, -12 / 20);
  check("le coude est sur la diagonale, au seuil",
    Math.abs(attr(graphe.kids[1], "x") - seuil) < 1e-12 &&
    Math.abs(attr(graphe.kids[1], "y") - seuil) < 1e-12);
  check("la pente suit le taux",
    Math.abs(attr(graphe.kids[2], "y") - Math.pow(seuil, 1 - 1 / 3)) < 1e-12,
    attr(graphe.kids[2], "y"));
}

/* ------------------------------- la taille annoncée est la taille écrite */

/** Les douze derniers octets de l'en-tête portent la taille de l'état. */
function tailleAnnoncee(fx) {
  const h = Buffer.from(fx.header64, "base64");
  return h.readUInt32LE(h.length - 12);
}
function enTetesCoherents(texte) {
  const p = RFX.parse(texte), faux = [];
  for (const fx of p.fx) {
    if (fx.kind !== "vst") continue;
    if (tailleAnnoncee(fx) !== fx.chunkLen) faux.push(fx.name + " : " + tailleAnnoncee(fx) + " ≠ " + fx.chunkLen);
  }
  return faux;
}
check("en-têtes cohérents sur une chaîne Melda fabriquée", enTetesCoherents(neuve).length === 0,
  enTetesCoherents(neuve).join(", "));

/* Le cas qui a mis le défaut au jour : un ReaEQ bâti de zéro n'a pas le même
   nombre de bandes que le gabarit, donc pas la même taille d'état. */
const eq = RFX.fromChain([{ plugin: "ReaEQ", on: true, bands: [
  { t: "High Pass", f: 40, g: 0, bw: 1, on: true },
  { t: "Band", f: 100, g: 1, bw: 1.5, on: true },
  { t: "Band", f: 300, g: -2, bw: 1.2, on: true },
  { t: "Band", f: 1000, g: 1, bw: 1.2, on: true }
] }]);
check("en-tête cohérent sur un ReaEQ de quatre bandes", enTetesCoherents(eq).length === 0,
  enTetesCoherents(eq).join(", "));
check("en-tête cohérent sur un TSE BOD réécrit",
  enTetesCoherents(RFX.fromChain([{ plugin: "TSE BOD", on: true,
    p: { input: 0.69, drive: 0.18, blend: 0.65, bass: 0.52, treble: 0.58,
         presence: 0.55, level: 0.85, output: 0.9 } }])).length === 0);

/* La queue du bloc ReaEQ suit les bandes et ne porte aucun réglage : sans
   elle, Reaper lisait une chaîne amputée. */
const eqLu = RFX.parse(eq).fx[0];
check("le ReaEQ fabriqué porte la queue du bloc", eqLu.eqTail && eqLu.eqTail.length === 32,
  eqLu.eqTail ? eqLu.eqTail.length : "absente");

/* --------------------------- les clés inconnues repartent avec la chaîne */

const avecInconnu = RFX.toChain(lu);
avecInconnu[1].p.threshold = -15;                 /* on change un seul réglage */
const apres = etatDe(RFX.parse(RFX.fromChain(avecInconnu)).fx[1]);
const cles = apres.attrs.map((a) => a.k);
check("les clés qu'on ne sait pas nommer sont conservées",
  cles.indexOf("#kneemode") >= 0 && cles.indexOf("EditorSize") >= 0, cles.join(" "));
check("le réglage modifié est bien écrit",
  Math.abs(RFX.toChain(RFX.parse(RFX.fromChain(avecInconnu)))[1].p.threshold + 15) < 0.001);

console.log(echecs ? "\n" + echecs + " échec(s)" : "\ntout est vert");
process.exit(echecs ? 1 : 0);
