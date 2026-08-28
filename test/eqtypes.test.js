/**
 * Types de bande ReaEQ : ce qui est établi, ce qui est refusé, ce qui survit.
 *   node test/eqtypes.test.js
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const RFX = require("../public/rfxchain.js");

const file = path.join(__dirname, "fixtures", "90srock.RfxChain");
const original = fs.readFileSync(file, "latin1");

let failed = 0;
function check(label, ok, detail) {
  if (ok) console.log("  ok    " + label);
  else { failed++; console.log("  ÉCHEC " + label + (detail ? " — " + detail : "")); }
}

console.log("Types de bande ReaEQ");

check("onze types au menu du plugin", RFX.EQ_TYPE_NAMES.length === 11, String(RFX.EQ_TYPE_NAMES.length));
check("trois correspondances établies", Object.keys(RFX.EQ_TYPE_IDS).length === 3,
  Object.keys(RFX.EQ_TYPE_IDS).join(","));
check("Band vaut 8", RFX.eqTypeId("Band") === 8, String(RFX.eqTypeId("Band")));
check("Low Pass vaut 3", RFX.eqTypeId("Low Pass") === 3, String(RFX.eqTypeId("Low Pass")));
check("High Pass vaut 4", RFX.eqTypeId("High Pass") === 4, String(RFX.eqTypeId("High Pass")));
check("un type non établi n'a pas d'entier", RFX.eqTypeId("Notch") === undefined,
  String(RFX.eqTypeId("Notch")));
check("un type conservé d'un import garde son entier", RFX.eqTypeId("type 6") === 6,
  String(RFX.eqTypeId("type 6")));

/* --- un type non établi doit faire refuser l'export, pas écrire un entier deviné --- */
const chain = RFX.toChain(RFX.parse(original));
const withUnknown = JSON.parse(JSON.stringify(chain));
withUnknown[1].bands[2].t = "Notch";
let refus = null;
try { RFX.fromChain(withUnknown); } catch (e) { refus = e.message; }
check("l'export refuse un type non établi", !!refus, "aucune erreur levée");
check("le refus nomme le type", !!refus && /Notch/.test(refus), refus || "");
check("le refus nomme la bande", !!refus && /Bande 3/.test(refus), refus || "");
check("le refus propose les types utilisables", !!refus && /Low Pass/.test(refus), refus || "");

/* --- un entier inconnu venu d'un fichier doit survivre à l'aller-retour --- */
const forged = RFX.parse(original);
forged.fx[1].bands[2].type = 6;
forged.fx[1].bands[2].typeName = "type 6";
forged.fx[1].dirty = true;
const back = RFX.parse(RFX.build(forged));
check("entier inconnu relu tel quel", back.fx[1].bands[2].type === 6, String(back.fx[1].bands[2].type));
check("entier inconnu nommé « type 6 »", back.fx[1].bands[2].typeName === "type 6",
  back.fx[1].bands[2].typeName);

const out = RFX.parse(RFX.fromChain(RFX.toChain(back)));
check("entier inconnu réécrit sans dommage", out.fx[1].bands[2].type === 6,
  String(out.fx[1].bands[2].type));
check("les bandes voisines ne bougent pas",
  Math.round(out.fx[1].bands[1].freq) === 90 && Math.round(out.fx[1].bands[3].freq) === 900,
  out.fx[1].bands.map((b) => Math.round(b.freq)).join(","));

/* --- ajouter et retirer des bandes, comme dans le plugin --- */
const grown = JSON.parse(JSON.stringify(chain));
grown[1].bands.push({ t: "Band", f: 5000, g: -1.5, bw: 0.7, on: true });
grown[1].bands.splice(0, 1);
const grownOut = RFX.parse(RFX.fromChain(grown));
check("bande ajoutée et bande retirée", grownOut.fx[1].bands.length === 6,
  String(grownOut.fx[1].bands.length));
check("la bande ajoutée est relue", Math.round(grownOut.fx[1].bands[5].freq) === 5000 &&
  Math.abs(grownOut.fx[1].bands[5].gainDb + 1.5) < 0.01,
  JSON.stringify(grownOut.fx[1].bands[5]));
check("la première bande a bien disparu", Math.round(grownOut.fx[1].bands[0].freq) === 90,
  String(Math.round(grownOut.fx[1].bands[0].freq)));

console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
process.exit(failed ? 1 : 0);
