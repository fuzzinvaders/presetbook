/**
 * Les filtres par matériel et par style, et l'en-tête de la feuille imprimée.
 *   node test/filtres.test.js
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { run } = require("./sandbox.js");

let failed = 0;
function check(label, ok, detail) {
  if (ok) console.log("  ok    " + label);
  else { failed++; console.log("  ÉCHEC " + label + (detail ? " — " + detail : "")); }
}

const page = path.join(__dirname, "..", "public", "index.html");
console.log("Filtres et impression");

const w = run(page, { search: "" });
const pb = w.__pb;
const ui = pb.ui();
const total = pb.library().length;

function combien() { return pb.library().filter(pb.matches).length; }
function reset() { ui.kind = "all"; ui.q = ""; ui.gear = []; ui.tags = []; }

/* --- filtrer par matériel --- */
check("sans filtre, tout passe", combien() === total, combien() + " sur " + total);

ui.gear = ["lionheart20"];
const laney = combien();
check("un modèle d'ampli isole ses fiches", laney === 8, String(laney));
check("et rien qu'elles",
  pb.library().filter(pb.matches).every((p) => p.gear === "lionheart20"));

ui.gear = ["lionheart20", "rumble40"];
const deux = combien();
check("deux modèles s'additionnent", deux > laney, laney + " puis " + deux);
check("le total des deux est exact",
  deux === pb.library().filter((p) => p.gear === "lionheart20" || !p.gear && p.kind === "amp"
    || p.gear === "rumble40").length, String(deux));

/* un pédalier est retenu par les pédales qu'il contient */
reset();
const board = pb.library().filter((x) => x.kind === "board")[0];
ui.gear = [board.slots[1].gear];
check("filtrer sur une pédale ramène le pédalier qui l'emploie",
  pb.library().filter(pb.matches).some((p) => p.id === board.id),
  board.slots[1].gear);

/* --- filtrer par style --- */
reset();
ui.tags = ["blues"];
const blues = combien();
check("un style isole ses fiches", blues > 0 && blues < total, String(blues));
check("et rien qu'elles",
  pb.library().filter(pb.matches).every((p) => (p.tags || []).indexOf("blues") >= 0));

ui.tags = ["blues", "jazz"];
check("deux styles s'additionnent", combien() > blues, String(combien()));

/* --- les facettes se croisent --- */
reset();
ui.kind = "amp";
ui.gear = ["lionheart20"];
const styles = pb.facetTags();
check("les styles proposés sont ceux du matériel choisi",
  styles.every((x) => x.n > 0) && styles.length > 0, String(styles.length));
check("aucun style ne mène à une impasse",
  styles.every((x) => { ui.tags = [x.id]; const k = combien(); ui.tags = []; return k === x.n; }),
  "un compte de facette ne correspond pas au résultat");

ui.tags = ["blues"];
const materiels = pb.facetGear();
check("la facette matériel ignore le matériel déjà coché",
  materiels.some((x) => x.id !== "lionheart20"),
  materiels.map((x) => x.id).join(", "));

/* --- les deux facettes se combinent en ET --- */
reset();
ui.gear = ["lionheart20"];
ui.tags = ["blues"];
const croise = combien();
check("matériel ET style", croise > 0 && croise < laney && croise < blues,
  laney + " × " + blues + " -> " + croise);

/* --- le compteur et l'effacement --- */
check("les filtres actifs sont comptés", pb.activeFilters() === 2, String(pb.activeFilters()));
reset();
check("aucun filtre après effacement", pb.activeFilters() === 0);

/* --- la recherche ignore la casse et les accents --- */
reset();
check("les accents sont retirés", pb.plat("Pédalier Crémeux") === "pedalier cremeux",
  pb.plat("Pédalier Crémeux"));
check("les ligatures aussi", pb.plat("cœur") === "coeur", pb.plat("cœur"));
check("un texte vide ne casse rien", pb.plat(null) === "" && pb.plat(undefined) === "");

function cherche(q) {
  const w2 = run(page, { search: "?q=" + encodeURIComponent(q) });
  return (w2.__nodes.get("list").innerHTML.match(/<article/g) || []).length;
}
[["pédalier", "pedalier"], ["répétition", "repetition"], ["crémeux", "cremeux"]].forEach((p) => {
  const avec = cherche(p[0]), sans = cherche(p[1]);
  check("« " + p[1] + " » trouve autant que « " + p[0] + " »",
    sans === avec && avec > 0, avec + " contre " + sans);
});
check("la casse n'y change rien", cherche("PEDALIER") === cherche("pédalier"));

/* --- l'URL --- */
const parUrl = run(page, { search: "?gear=lionheart20&tag=blues,rock" });
check("l'URL pose les filtres",
  parUrl.__pb.ui().gear.join() === "lionheart20" && parUrl.__pb.ui().tags.join() === "blues,rock",
  JSON.stringify(parUrl.__pb.ui().gear) + " / " + JSON.stringify(parUrl.__pb.ui().tags));
check("et ouvre le panneau, sinon le filtre serait invisible", parUrl.__pb.ui().open === true);
const cartes = (parUrl.__nodes.get("list").innerHTML.match(/<article/g) || []).length;
check("la vue filtrée est rendue", cartes > 0 && cartes < total, String(cartes));

/* --- le panneau --- */
const p2 = run(page, { search: "?gear=lionheart20" });
const panneau = p2.__nodes.get("filters").innerHTML;
check("le panneau liste les deux facettes",
  panneau.indexOf("data-fgear") > 0 && panneau.indexOf("data-ftag") > 0);
check("le matériel choisi est marqué",
  panneau.indexOf('data-fgear="lionheart20" aria-pressed="true"') > 0, panneau.slice(0, 120));
check("l'effacement est proposé", panneau.indexOf("data-fclear") > 0);
check("le bouton porte le nombre de filtres",
  p2.__nodes.get("btn-filters").innerHTML.indexOf("(1)") > 0,
  p2.__nodes.get("btn-filters").innerHTML);

/* --- l'en-tête d'impression --- */
const tete = p2.__nodes.get("printhead").innerHTML;
check("l'en-tête nomme ce qui est imprimé",
  tete.indexOf("Laney Lionheart") > 0, tete);
check("il donne le nombre de fiches", /\b8\b/.test(tete), tete);
check("il est daté", tete.indexOf(p2.__pb.printDate()) > 0, p2.__pb.printDate());

const enTeteAnglais = run(page, { search: "?lang=en&gear=lionheart20" });
check("l'en-tête suit la langue",
  enTeteAnglais.__nodes.get("printhead").innerHTML.indexOf("presets") > 0,
  enTeteAnglais.__nodes.get("printhead").innerHTML);

/* --- la feuille d'impression existe et couvre l'essentiel --- */
const src = fs.readFileSync(page, "utf8");
const bloc = src.slice(src.indexOf("@media print{"), src.indexOf("@media print{") + 2200);
check("une règle @media print est déclarée", src.indexOf("@media print{") > 0);
check("le thème sombre est forcé en clair", bloc.indexOf("--bg:#FFFFFF") > 0);
check("les aplats des cadrans sont conservés", bloc.indexOf("print-color-adjust:exact") > 0);
check("une fiche ne se coupe pas entre deux pages", bloc.indexOf("break-inside:avoid") > 0);
["header.top", ".bar", ".filters", ".foot", ".card-f"].forEach((sel) => {
  check("« " + sel + " » est retiré du papier", bloc.indexOf(sel) > 0);
});
check("les marges de page sont fixées", src.indexOf("@page{") > 0);

console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
process.exit(failed ? 1 : 0);
