/**
 * Comparer deux fiches : ce qui est compté comme un écart, et ce qui ne l'est pas.
 *   node test/comparer.test.js
 */
"use strict";
const path = require("node:path");
const { run } = require("./sandbox.js");

let failed = 0;
function check(label, ok, detail) {
  if (ok) console.log("  ok    " + label);
  else { failed++; console.log("  ÉCHEC " + label + (detail ? " — " + detail : "")); }
}

const page = path.join(__dirname, "..", "public", "index.html");
const w = run(page, { search: "" });
const pb = w.__pb;
const L = pb.library();
console.log("Comparaison");

const par = (k) => L.filter((p) => p.kind === k);
const ligne = (rows, l) => rows.filter((r) => r.l === l)[0];

/* --- deux amplis sur la même façade --- */
const motown = L.filter((p) => p.id === "a-motown")[0];
const jazz = L.filter((p) => p.id === "a-jazz")[0];
const rows = pb.compareRows(motown, jazz);
check("chaque commande de la façade a sa ligne",
  rows.length >= pb.allGear().rumble40.controls.length, String(rows.length));
check("un réglage différent est marqué", ligne(rows, "Gain").diff === true,
  JSON.stringify(ligne(rows, "Gain")));
check("un réglage identique ne l'est pas", ligne(rows, "Low-Mid").diff === false,
  JSON.stringify(ligne(rows, "Low-Mid")));
check("les valeurs sont celles qu'affichent les cartes",
  ligne(rows, "Gain").a === "6,0" && ligne(rows, "Gain").b === "5,0",
  JSON.stringify(ligne(rows, "Gain")));
check("une même fiche n'a aucun écart",
  pb.compareRows(motown, motown).every((r) => !r.diff));

/* --- une commande hors circuit se lit « — » des deux côtés, sans écart --- */
check("deux commandes hors circuit ne font pas un écart",
  ligne(rows, "Drive").a === "—" && ligne(rows, "Drive").b === "—" &&
  ligne(rows, "Drive").diff === false, JSON.stringify(ligne(rows, "Drive")));

/* --- deux façades différentes --- */
const amp = par("amp");
const rumble = amp.filter((p) => !p.gear)[0];
const laney = amp.filter((p) => p.gear === "lionheart20")[0];
const croise = pb.compareRows(rumble, laney);
check("le matériel est signalé en tête",
  croise[0].l === "Matériel" && croise[0].diff === true, JSON.stringify(croise[0]));
check("une commande absente de l'autre façade est notée",
  ligne(croise, "Contour").note.indexOf("absente") >= 0, JSON.stringify(ligne(croise, "Contour")));
check("et **pas** comptée comme un écart",
  ligne(croise, "Contour").diff === false,
  "une commande qui n'existe pas ailleurs serait un faux écart");
check("une commande présente des deux côtés se compare quand même",
  ligne(croise, "Bright").note === "" && typeof ligne(croise, "Bright").diff === "boolean",
  JSON.stringify(ligne(croise, "Bright")));

/* --- instruments : le mode et les extras --- */
const bass = par("bass");
const deuxBasses = pb.compareRows(bass[0], bass[1]);
check("le mode est comparé", !!ligne(deuxBasses, "Mode"), JSON.stringify(deuxBasses.slice(0, 2)));
check("la balance est lue en pourcentage",
  /P \d+ \/ J \d+/.test(ligne(deuxBasses, "Balance").a), ligne(deuxBasses, "Balance").a);
check("les mentions libres sont comparées aussi", !!ligne(deuxBasses, "Cordes"));

/* --- pédaliers : l'ordre du signal --- */
const boards = par("board");
const deuxPedaliers = pb.compareRows(boards[0], boards[1]);
check("un pédalier se compare emplacement par emplacement",
  deuxPedaliers.length === Math.max(boards[0].slots.length, boards[1].slots.length),
  String(deuxPedaliers.length));
check("un emplacement manquant se lit « — »",
  deuxPedaliers.some((r) => r.a === "—" || r.b === "—"),
  deuxPedaliers.map((r) => r.a + "/" + r.b).join(" | "));
check("une pédale coupée est signalée",
  deuxPedaliers.some((r) => String(r.a).indexOf("coupée") > 0));

/* --- deux genres différents n'ont rien à confronter --- */
check("comparer une basse et une chaîne ne produit rien",
  pb.compareRows(bass[0], par("reaper")[0]).length === 0);

/* --- l'écran --- */
pb.openCompare(motown.id, jazz.id);
const feuille = w.__nodes.get("veil").innerHTML;
check("le tableau est rendu", feuille.indexOf('class="cmp"') > 0);
check("les deux noms sont en tête",
  feuille.indexOf(motown.name) > 0 && feuille.indexOf(jazz.name) > 0);
check("les lignes différentes portent leur marque",
  (feuille.match(/<tr class="d">/g) || []).length ===
  rows.filter((r) => r.diff).length,
  (feuille.match(/<tr class="d">/g) || []).length + " contre " + rows.filter((r) => r.diff).length);
check("le nombre d'écarts est annoncé",
  feuille.indexOf(String(rows.filter((r) => r.diff).length)) > 0);
check("on peut choisir l'autre fiche", feuille.indexOf("data-compare-b") > 0);

/* une fiche seule de son genre : on le dit plutôt que d'afficher un tableau vide */
const seule = par("reaper")[0];
pb.openCompare(seule.id, null);
check("sans seconde fiche, l'écran l'explique",
  w.__nodes.get("veil").innerHTML.indexOf("seconde fiche du même genre") > 0,
  w.__nodes.get("veil").innerHTML.slice(0, 120));

/* --- l'anglais --- */
const en = run(page, { search: "?lang=en" }).__pb;
check("l'écran est traduit", en.t("Comparer") === "Compare" && en.t("écarts") === "differences");

console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
process.exit(failed ? 1 : 0);
