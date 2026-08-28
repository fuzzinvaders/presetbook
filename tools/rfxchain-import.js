#!/usr/bin/env node
/**
 * Lit une chaîne d'effets de Reaper et en sort un maillonnage Presetbook.
 *
 *   node tools/rfxchain-import.js chaine.RfxChain
 *   node tools/rfxchain-import.js chaine.RfxChain --json > chaine.json
 *
 * Sans --json, affiche un résumé lisible de ce qui a été décodé et ce qui a
 * seulement été conservé. Avec --json, sort le tableau de maillons à coller
 * dans un preset (champ `chain`).
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const RFX = require(path.join(__dirname, "..", "public", "rfxchain.js"));

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const file = args.find((a) => !a.startsWith("--"));

if (!file) {
  console.error("usage : node tools/rfxchain-import.js <fichier.RfxChain> [--json]");
  process.exit(2);
}

const parsed = RFX.parse(fs.readFileSync(file, "latin1"));
const chain = RFX.toChain(parsed);

if (asJson) {
  process.stdout.write(JSON.stringify(chain, null, 1) + "\n");
  process.exit(0);
}

const fmt = (v) => String(v).replace(".", ",");
console.log(path.basename(file) + " — " + chain.length + " effets\n");

parsed.fx.forEach((fx, i) => {
  const s = chain[i];
  const etat = { bod: "XML décodé", reaeq: "bandes décodées", reacomp: "flottants décodés",
                 reaverbate: "flottants décodés", js: "curseurs en clair",
                 opaque: "conservé tel quel" };
  console.log(
    String(i + 1).padStart(2) + ". " + s.plugin.padEnd(16) +
    (fx.bypassed ? " [hors circuit]" : "              ") +
    "  " + (etat[fx.decoded] || fx.decoded)
  );

  if (fx.decoded === "bod") {
    console.log("      " + RFX.BOD_KEYS.filter((k) => fx.params[k] !== undefined)
      .map((k) => k + " " + fmt(Number(fx.params[k]).toFixed(3))).join("  "));
  } else if (fx.decoded === "reaeq") {
    fx.bands.forEach((b, bi) => {
      const gain = /Pass$/.test(b.typeName) ? "—" : (b.gainDb > 0 ? "+" : "") + fmt(b.gainDb.toFixed(1)) + " dB";
      console.log("      " + (bi + 1) + ". " + b.typeName.padEnd(10) +
        String(Math.round(b.freq)).padStart(6) + " Hz  " + gain.padStart(8) +
        "  BW " + fmt(b.bw.toFixed(2)) + (b.on ? "" : "  (bande désactivée)"));
    });
  } else if (fx.decoded === "reacomp") {
    const p = fx.params;
    console.log("      Threshold " + fmt(p.threshold) + " dB   Ratio " + fmt(p.ratio) + ":1   " +
      "Attack " + fmt(p.attack) + " ms   Release " + fmt(p.release) + " ms");
    console.log("      Knee " + fmt(p.knee) + " dB   RMS " + fmt(p.rms) + " ms   " +
      "Wet " + fmt(p.wet) + " dB   Dry " + (p.dry <= -150 ? "-inf" : fmt(p.dry)) + " dB   " +
      "Detector " + p.detector);
  } else if (fx.decoded === "reaverbate") {
    const p = fx.params;
    console.log("      Wet " + fmt(p.wet) + " dB   Dry " + fmt(p.dry) + " dB   " +
      "Room " + fmt(p.room) + "   Dampening " + fmt(p.damp) + "   Width " + fmt(p.width));
    console.log("      Lowpass " + fmt(p.lowpass) + " Hz   Hipass " + fmt(p.hipass) + " Hz");
  } else if (fx.decoded === "js") {
    const used = fx.sliders.filter((v) => v !== "-");
    console.log("      " + fx.path + " — curseurs utilisés : " + (used.join(" ") || "aucun"));
  } else {
    console.log("      " + fx.chunkLen + " octets d'état binaire, réécrits à l'identique");
  }
});

const opaques = parsed.fx.filter((f) => f.decoded === "opaque").map((f) => f.name);
if (opaques.length) {
  console.log("\nValeurs non modifiables depuis Presetbook : " + opaques.join(", ") + ".");
  console.log("Elles repartent intactes vers Reaper, mais il faut les régler dans le plugin.");
}
