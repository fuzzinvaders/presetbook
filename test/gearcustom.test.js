/**
 * Façades créées par l'utilisateur : registre fusionné, comptage d'usage,
 * conservation dans les données.
 *   node test/gearcustom.test.js
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

console.log("Façades créées ici");

const maFacade = {
  kind: "amp", brand: "Ampeg", model: "SVT-3 Pro", face: "plain",
  note: "Trois bandes plus deux contours.",
  controls: [
    { k: "gain", t: "scale", l: "Gain", min: 1, max: 10, step: 0.5, d: 5 },
    { k: "c.ultra-lo", t: "switch", l: "Ultra Lo" },
    { k: "eq.b", t: "scale", l: "Bass", min: 1, max: 10, step: 0.5, d: 5 },
    { k: "c.graphique", t: "scale", l: "Graphique", min: 1, max: 10, step: 0.5, d: 5,
      needs: "c.ultra-lo" }
  ]
};

const avant = pb.getState();
pb.setState({ v: 1, custom: [], overrides: {}, gear: { "g-svt": maFacade }, hidden: [] });

const amps = pb.gearList("amp");
check("la façade créée apparaît dans la liste", amps.some((x) => x.id === "g-svt"), amps.length + " amplis");
check("elle est marquée comme personnelle", (amps.find((x) => x.id === "g-svt") || {}).own === true);
check("les façades livrées passent avant", amps[0].own === false, String(amps[0].own));
check("nom composé marque + modèle", pb.gearName(maFacade) === "Ampeg SVT-3 Pro", pb.gearName(maFacade));

const fiche = { kind: "amp", gear: "g-svt", eq: {} };
check("une fiche la retrouve", pb.gearOf(fiche) === maFacade);
pb.applyGearDefaults(fiche);
/* une clé pointée est un chemin : « c.ultra-lo » se range sous fiche.c */
check("ses défauts s'appliquent",
  fiche.gain === 5 && fiche.eq.b === 5 && pb.getPath(fiche, "c.ultra-lo") === false,
  JSON.stringify(fiche));
check("une dépendance est respectée",
  pb.ctrlOff(maFacade, fiche, pb.findCtrl(fiche, "c.graphique")) === true);
pb.setPath(fiche, "c.ultra-lo", true);
check("la dépendance se libère quand l'interrupteur est engagé",
  pb.ctrlOff(maFacade, fiche, pb.findCtrl(fiche, "c.graphique")) === false);

/* --- comptage d'usage : garde-fou avant suppression --- */
pb.setState({ v: 1, custom: [fiche2("u-1", "g-svt"), fiche2("u-2", "g-svt")],
              overrides: {}, gear: { "g-svt": maFacade }, hidden: [] });
check("deux fiches comptées sur la façade", pb.gearUsage("g-svt") === 2, String(pb.gearUsage("g-svt")));
check("aucune fiche sur une façade inutilisée", pb.gearUsage("g-inconnue") === 0);
check("les fiches du catalogue comptent pour la BB734A", pb.gearUsage("bb734a") >= 15,
  String(pb.gearUsage("bb734a")));

function fiche2(id, gear) {
  return { id: id, kind: "amp", gear: gear, name: "essai", eq: {}, tags: [] };
}

/* --- conservation dans les données --- */
const relu = pb.normalize({ custom: [], overrides: {}, gear: { "g-svt": maFacade }, hidden: [] });
check("normalize conserve les façades", !!relu.gear["g-svt"], JSON.stringify(Object.keys(relu.gear)));
check("normalize accepte l'absence de façades",
  JSON.stringify(pb.normalize({}).gear) === "{}", JSON.stringify(pb.normalize({}).gear));
check("normalize refuse un tableau à la place",
  JSON.stringify(pb.normalize({ gear: [1, 2] }).gear) === "{}");

/* --- clés engendrées à partir du libellé --- */
check("clé engendrée depuis un libellé accentué",
  pb.slugKey("Médiums graves", []) === "c.mediums-graves", pb.slugKey("Médiums graves", []));
check("clé rendue unique", pb.slugKey("Gain", ["c.gain"]) === "c.gain-2", pb.slugKey("Gain", ["c.gain"]));
check("libellé vide reste utilisable", pb.slugKey("", []) === "c.c", pb.slugKey("", []));

pb.setState(avant);
console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
process.exit(failed ? 1 : 0);
