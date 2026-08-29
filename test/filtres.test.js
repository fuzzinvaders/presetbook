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
function reset() { ui.kind = "all"; ui.q = ""; ui.gear = []; ui.brands = []; ui.tags = []; }

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

/* --- filtrer par marque --- */
reset();
const marques = pb.facetBrand();
check("plusieurs marques sont proposées", marques.length >= 6, String(marques.length));
check("« générique » passe en dernier : ce sont les gabarits, pas une marque",
  marques[marques.length - 1].id === "générique",
  marques.map((x) => x.id).join(", "));

ui.brands = ["Ampeg"];
const ampeg = combien();
check("une marque isole ses fiches", ampeg > 0 && ampeg < total, String(ampeg));
check("et rien qu'elles",
  pb.library().filter(pb.matches).every((p) => pb.brandsOf(p).indexOf("Ampeg") >= 0));

ui.brands = ["Ampeg", "Vox"];
check("deux marques s'additionnent", combien() > ampeg, String(combien()));

/* Une marque rassemble plusieurs modèles : c'est tout l'intérêt. */
reset();
ui.brands = ["Fender"];
const modelesFender = {};
pb.library().filter(pb.matches).forEach((p) => { modelesFender[p.gear || "défaut"] = 1; });
check("une marque rassemble plusieurs modèles",
  Object.keys(modelesFender).length > 1, Object.keys(modelesFender).join(", "));

/* Marque ET modèle se croisent, comme les autres facettes. */
ui.gear = ["rumble500"];
const croiseMarque = combien();
check("marque ET modèle", croiseMarque > 0 && croiseMarque < combienSansModele(),
  String(croiseMarque));
function combienSansModele() {
  const g = ui.gear; ui.gear = [];
  const k = combien(); ui.gear = g;
  return k;
}

/* Un pédalier mêle les marques de ses pédales. */
reset();
const ped = pb.library().filter((x) => x.kind === "board")[0];
check("les marques d'un pédalier sont celles de ses pédales",
  Array.isArray(pb.brandsOf(ped)), JSON.stringify(pb.brandsOf(ped)));
check("une chaîne Reaper n'a pas de marque : ce sont des plugins",
  pb.brandsOf(pb.library().filter((x) => x.kind === "reaper")[0]).length === 0);

/* La facette marque ignore la marque déjà cochée, comme les deux autres. */
reset();
ui.brands = ["Fender"];
check("la facette marque propose encore les autres",
  pb.facetBrand().some((x) => x.id !== "Fender"),
  pb.facetBrand().map((x) => x.id).join(", "));
check("les comptes de la facette marque sont exacts",
  pb.facetBrand().every((x) => {
    const av = ui.brands; ui.brands = [x.id];
    const k = combien(); ui.brands = av;
    return k === x.n;
  }), "un compte de facette ne correspond pas au résultat");
reset();

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
ui.brands = ["Fender"];
check("la marque compte aussi", pb.activeFilters() === 3, String(pb.activeFilters()));
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

/* --- la recherche de l'étagère partagée --- */
const etagere = [];
["Motown doux", "Funk sec", "Blues crémeux", "Rock sale", "Jazz rond", "Reggae dub",
 "Pop propre", "Métal"].forEach((nom, i) => {
  etagere.push({ id: "s" + i, by: i < 2 ? "remi" : "copain", kind: i % 2 ? "amp" : "bass",
                 name: nom, preset: { id: "p" + i, kind: i % 2 ? "amp" : "bass", name: nom },
                 gear: {} });
});
pb.setShared(etagere);
pb.openShared();
function surEtagere() {
  pb.renderShared();
  return (w.__nodes.get("shared-list").innerHTML.match(/data-take/g) || []).length;
}
pb.setSharedQ("");
check("sans filtre, toute l'étagère", surEtagere() === etagere.length, String(surEtagere()));
pb.setSharedQ("blues");
check("filtrer par le nom", surEtagere() === 1, String(surEtagere()));
pb.setSharedQ("BLUES");
check("la casse est ignorée", surEtagere() === 1);
pb.setSharedQ("cremeux");
check("les accents aussi, comme dans le catalogue", surEtagere() === 1, String(surEtagere()));
pb.setSharedQ("remi");
check("filtrer par l'auteur", surEtagere() === 2, String(surEtagere()));
pb.setSharedQ("zzz");
check("rien ne correspond : on le dit", surEtagere() === 0 &&
  w.__nodes.get("shared-list").innerHTML.indexOf("correspond") > 0,
  w.__nodes.get("shared-list").innerHTML.slice(0, 60));
pb.setSharedQ("");

check("une étagère fournie propose le champ", pb.sharedFilterVisible() === true,
  String(etagere.length) + ' fiches');
pb.setShared(etagere.slice(0, 3));
check("une étagère courte s'en passe", pb.sharedFilterVisible() === false,
  'le champ occuperait la place sans servir');
pb.setShared(etagere);

/* --- la recherche du catalogue ne reconstruit pas à chaque frappe --- */
const source = require("node:fs").readFileSync(page, "utf8");
const handler = source.slice(source.indexOf('getElementById("q").addEventListener'),
                             source.indexOf('getElementById("q").addEventListener') + 340);
check("la saisie passe par un délai",
  /setTimeout/.test(handler) && /clearTimeout/.test(handler),
  "sans délai, chaque touche reconstruit toute la liste");

/* --- l'URL --- */
const parUrl = run(page, { search: "?gear=lionheart20&tag=blues,rock" });
check("l'URL pose les filtres",
  parUrl.__pb.ui().gear.join() === "lionheart20" && parUrl.__pb.ui().tags.join() === "blues,rock",
  JSON.stringify(parUrl.__pb.ui().gear) + " / " + JSON.stringify(parUrl.__pb.ui().tags));
check("et ouvre le panneau, sinon le filtre serait invisible", parUrl.__pb.ui().open === true);
const cartes = (parUrl.__nodes.get("list").innerHTML.match(/<article/g) || []).length;
check("la vue filtrée est rendue", cartes > 0 && cartes < total, String(cartes));

/* --- la marque dans l'URL et dans le regroupement --- */
const parMarque = run(page, { search: "?brand=Ampeg,Vox" });
check("l'URL pose la marque",
  parMarque.__pb.ui().brands.join() === "Ampeg,Vox",
  JSON.stringify(parMarque.__pb.ui().brands));
check("et ouvre le panneau", parMarque.__pb.ui().open === true);
const nMarque = (parMarque.__nodes.get("list").innerHTML.match(/<article/g) || []).length;
check("la vue filtrée par marque est rendue", nMarque > 0 && nMarque < total, String(nMarque));

const groupe = run(page, { search: "?group=brand" });
const titres = (groupe.__nodes.get("list").innerHTML.match(/<h2>[^<]*<\/h2>/g) || [])
  .map((x) => x.replace(/<[^>]*>/g, ""));
check("regrouper par marque produit des sections nommées par marque",
  titres.indexOf("Fender") >= 0 && titres.length > 3, titres.join(" | "));
check("l'onglet « Par marque » existe",
  groupe.__nodes.get("grp").innerHTML.indexOf('data-g="brand"') > 0,
  groupe.__nodes.get("grp").innerHTML);

const teteMarque = run(page, { search: "?brand=Ampeg" }).__nodes.get("printhead").innerHTML;
check("l'en-tête d'impression nomme la marque filtrée",
  teteMarque.indexOf("Ampeg") > 0, teteMarque);

/* --- le panneau --- */
const p2 = run(page, { search: "?gear=lionheart20" });
const panneau = p2.__nodes.get("filters").innerHTML;
check("le panneau liste les deux facettes",
  panneau.indexOf("data-fgear") > 0 && panneau.indexOf("data-ftag") > 0);
/* Ce panneau-là est filtré sur un seul modèle, donc sur une seule marque :
   proposer « Laney (8) » tout seul ne dirait rien à personne. */
check("une vue à marque unique n'affiche pas la facette marque",
  panneau.indexOf("data-fbrand") < 0, panneau.slice(0, 160));

const p3 = run(page, { search: "?tag=rock" });
const panneau3 = p3.__nodes.get("filters").innerHTML;
check("une vue à plusieurs marques les propose",
  panneau3.indexOf("data-fbrand") > 0, panneau3.slice(0, 160));
check("la marque vient avant le modèle : elle dégrossit, le modèle précise",
  panneau3.indexOf("data-fbrand") >= 0
  && panneau3.indexOf("data-fbrand") < panneau3.indexOf("data-fgear"),
  panneau3.indexOf("data-fbrand") + " puis " + panneau3.indexOf("data-fgear"));
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
