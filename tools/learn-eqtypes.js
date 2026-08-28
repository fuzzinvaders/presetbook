#!/usr/bin/env node
/**
 * Établit la table des types de bande de ReaEQ à partir d'une chaîne témoin.
 *
 * Mode opératoire dans Reaper : un ReaEQ seul, autant de bandes que d'entrées
 * au menu, et on attribue à la bande n le n-ième type du menu, dans l'ordre.
 * On exporte la chaîne, puis :
 *
 *   node tools/learn-eqtypes.js temoin.RfxChain
 *
 * L'outil lit les entiers dans l'ordre des bandes et affiche la table à
 * recopier dans public/rfxchain.js. Il ne devine rien : si le nombre de bandes
 * ne correspond pas au menu, il le dit et s'arrête.
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const RFX = require(path.join(__dirname, "..", "public", "rfxchain.js"));

const file = process.argv[2];
if (!file) {
  console.error("usage : node tools/learn-eqtypes.js <temoin.RfxChain>");
  process.exit(2);
}

const parsed = RFX.parse(fs.readFileSync(file, "latin1"));
const eq = parsed.fx.find((f) => f.decoded === "reaeq");
if (!eq) {
  console.error("Aucun ReaEQ décodable dans ce fichier.");
  process.exit(1);
}

const names = RFX.EQ_TYPE_NAMES;
const bands = eq.bands;
console.log(bands.length + " bandes lues, " + names.length + " types au menu.\n");

bands.forEach((b, i) => {
  const attendu = names[i] || "(au-delà du menu)";
  const connu = RFX.EQ_TYPES[b.type];
  const accord = connu ? (connu === attendu ? "  ✓ concorde" : "  ⚠ contredit « " + connu + " »") : "";
  console.log("  bande " + String(i + 1).padStart(2) + " → entier " + String(b.type).padStart(3) +
    "   " + attendu + accord);
});

if (bands.length !== names.length) {
  console.log("\nLe nombre de bandes ne correspond pas au menu : la table serait incomplète " +
    "ou décalée. Reprends la chaîne témoin avec exactement " + names.length + " bandes, " +
    "une par type, dans l'ordre du menu.");
  process.exit(1);
}

const contradiction = bands.some((b, i) => RFX.EQ_TYPES[b.type] && RFX.EQ_TYPES[b.type] !== names[i]);
if (contradiction) {
  console.log("\nUne bande contredit une correspondance déjà établie : vérifie que les types " +
    "sont bien dans l'ordre du menu avant de recopier la table.");
  process.exit(1);
}

console.log("\nÀ recopier dans public/rfxchain.js :\n");
console.log("  var EQ_TYPES = {");
console.log(bands.map((b, i) => '    ' + b.type + ': "' + names[i] + '"').join(",\n"));
console.log("  };");
console.log("  var EQ_TYPE_IDS = {");
console.log(bands.map((b, i) => '    "' + names[i] + '": ' + b.type).join(",\n"));
console.log("  };");
console.log("\nPense aussi à EQ_NO_GAIN : les types sans gain (Low Pass, High Pass, All Pass,");
console.log("Notch, Band Pass) doivent y figurer par leur entier.");
