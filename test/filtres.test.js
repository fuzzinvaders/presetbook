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
const titres = (groupe.__nodes.get("list").innerHTML.match(/class="grp-t">[^<]*</g) || [])
  .map((x) => x.slice('class="grp-t">'.length, -1));
check("regrouper par marque produit des sections nommées par marque",
  titres.indexOf("Fender") >= 0 && titres.length > 3, titres.join(" | "));
check("« Par marque » est proposé dans la liste de regroupement",
  groupe.__nodes.get("grp").innerHTML.indexOf('value="brand"') > 0,
  groupe.__nodes.get("grp").innerHTML);

const teteMarque = run(page, { search: "?brand=Ampeg" }).__nodes.get("printhead").innerHTML;
check("l'en-tête d'impression nomme la marque filtrée",
  teteMarque.indexOf("Ampeg") > 0, teteMarque);

/* --- le panneau --- */
const p2 = run(page, { search: "?gear=lionheart20" });
const panneau = p2.__nodes.get("filters").innerHTML;
check("le panneau propose les deux facettes",
  panneau.indexOf('data-fadd="gear"') > 0 && panneau.indexOf('data-fadd="tag"') > 0,
  panneau.slice(0, 160));
/* Ce panneau-là est filtré sur un seul modèle, donc sur une seule marque :
   proposer « Laney (8) » tout seul ne dirait rien à personne. */
check("une vue à marque unique n'affiche pas la facette marque",
  panneau.indexOf("data-fbrand") < 0 && panneau.indexOf('data-fadd="brand"') < 0,
  panneau.slice(0, 160));

const p3 = run(page, { search: "?tag=rock" });
const panneau3 = p3.__nodes.get("filters").innerHTML;
check("une vue à plusieurs marques les propose",
  panneau3.indexOf('data-fadd="brand"') > 0, panneau3.slice(0, 160));
check("la marque vient avant le modèle : elle dégrossit, le modèle précise",
  panneau3.indexOf('data-fadd="brand"') >= 0
  && panneau3.indexOf('data-fadd="brand"') < panneau3.indexOf('data-fadd="gear"'),
  panneau3.indexOf('data-fadd="brand"') + " puis " + panneau3.indexOf('data-fadd="gear"'));
check("le matériel choisi est marqué",
  panneau.indexOf('data-fgear="lionheart20" aria-pressed="true"') > 0, panneau.slice(0, 120));
check("l'effacement est proposé", panneau.indexOf("data-fclear") > 0);
check("la liste ne propose pas ce qui est déjà retenu",
  panneau.indexOf('<option value="lionheart20"') < 0, panneau.slice(0, 200));
check("chaque ligne porte son compte",
  /<option value="[^"]+">[^<]+\(\d+\)<\/option>/.test(panneau), panneau.slice(0, 200));
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

/* --- des sections qu'on replie --- */
/*
 * Le repli est un état d'affichage : il vit dans le navigateur et n'a pas à
 * traverser l'impression. Une feuille amputée des sections qu'on avait
 * refermées à l'écran serait fausse sans prévenir.
 */
const vue = run(page, { search: "" });
const liste = vue.__nodes.get("list").innerHTML;
check("chaque section a un titre cliquable",
  /<button class="grp-b" data-fold="[^"]+" aria-expanded="(true|false)">/.test(liste),
  liste.slice(0, 200));
check("le chevron n'est pas annoncé deux fois",
  liste.indexOf('<span class="chev" aria-hidden="true">') > 0);
check("le papier rouvre ce qui est replié",
  bloc.indexOf('.grp[data-folded="1"] .grid{display:grid}') > 0);
check("la barre de liste propose de tout replier",
  vue.__nodes.get("listbar").innerHTML.indexOf("data-foldall") > 0,
  vue.__nodes.get("listbar").innerHTML);
check("elle dit combien de fiches sont affichées",
  /class="n">\d+ fiches</.test(vue.__nodes.get("listbar").innerHTML),
  vue.__nodes.get("listbar").innerHTML);

/* --- un titre par fiche isolée n'apprend rien --- */
/*
 * « Par matériel » produisait vingt-cinq titres pour vingt fiches isolées : un
 * titre « Marshall DSL40 » au-dessus d'une carte qui le dit déjà. En « Par
 * morceau », au contraire, le titre EST l'information — on n'y touche pas.
 */
function titresDe(res) {
  return (res.__nodes.get("list").innerHTML.match(/class="grp-t">[^<]*</g) || [])
    .map((x) => x.slice('class="grp-t">'.length, -1));
}
const parMateriel = titresDe(run(page, { search: "?group=kind" }));
check("les fiches isolées se rangent sous « Autres »",
  parMateriel.indexOf("Autres") >= 0, parMateriel.join(" | "));
check("« Autres » vient en dernier",
  parMateriel[parMateriel.length - 1] === "Autres", parMateriel.join(" | "));
check("les sections fournies gardent leur nom",
  parMateriel.indexOf("Fender Rumble 40") >= 0 && parMateriel.indexOf("Yamaha BB734A") >= 0,
  parMateriel.join(" | "));
check("le regroupement ne perd aucune fiche",
  (run(page, { search: "?group=kind" }).__nodes.get("list").innerHTML.match(/<article/g) || []).length
  === (run(page, { search: "" }).__nodes.get("list").innerHTML.match(/<article/g) || []).length);

const parMorceau = titresDe(run(page, { search: "?group=song" }));
check("« Par morceau » garde le nom de chaque morceau",
  parMorceau.indexOf("Autres") < 0 && parMorceau.length >= 3, parMorceau.join(" | "));

/* Un seul isolé garde son nom : le renommer « Autres » perdrait une
   information sans rien gagner. */
const unSeul = titresDe(run(page, { search: "?kind=reaper&group=kind" }));
check("un groupe isolé unique n'est pas renommé",
  unSeul.indexOf("Autres") < 0, unSeul.join(" | "));

/*
 * L'en-tête tient en deux commandes : créer une fiche, et le menu du compte.
 * Le reste y est rangé. Le panneau est écrit dans le gabarit, pas rendu par
 * une fonction — on le lit donc à la source.
 */
const menu = src.slice(src.indexOf('id="menu-p"'), src.indexOf("</header>"));
["btn-gear", "btn-io", "btn-shared", "btn-print", "btn-install", "lang", "who"].forEach((id) => {
  check("« " + id + " » est rangé dans le menu", menu.indexOf('id="' + id + '"') > 0, menu.slice(0, 160));
});
check("le menu part fermé", /id="menu-p" hidden/.test(src));
const acts = src.slice(src.indexOf('<div class="acts">'), src.indexOf('id="menu-p"'));
check("seul « Nouveau preset » reste en évidence",
  (acts.match(/<button/g) || []).length === 2, acts);

/* --- les maillons d'une chaîne se replient aussi --- */
/*
 * Une chaîne à cinq maillons tient sur deux écrans : les tableaux de bandes et
 * les grilles de paramètres sont justement ce qu'on vient lire, mais pas tous
 * à la fois. Le titre du maillon — numéro, plugin, rôle — suffit à retrouver
 * celui qu'on cherche, et le reste se replie derrière.
 */
const chaines = run(page, { search: "?kind=reaper" });
const listeFx = chaines.__nodes.get("list").innerHTML;
check("chaque maillon a un titre cliquable",
  /<button class="slot-h" data-fold="fx:[^"]+" aria-expanded="(true|false)">/.test(listeFx),
  listeFx.slice(0, 220));
check("le corps du maillon est séparé de son titre",
  listeFx.indexOf('<div class="slot-b">') > 0, listeFx.slice(0, 220));
check("la clé d'un maillon nomme la fiche et le rang",
  (listeFx.match(/data-fold="fx:[^":]+:\d+"/g) || []).length >= 3,
  (listeFx.match(/data-fold="fx:[^"]+"/g) || []).slice(0, 4).join(" | "));
check("une chaîne de plusieurs maillons propose de tout replier",
  listeFx.indexOf('data-foldfx="close"') > 0, listeFx.slice(0, 220));
check("et elle annonce combien ils sont",
  /class="c">\d+ maillons</.test(listeFx), listeFx.slice(0, 220));

/* Un maillon seul se replie d'un clic sur son titre : un raccourci au-dessus
   ne ferait que répéter le bouton d'en dessous. */
const seul = chaines.__pb.chainView({ id: "x", chain: [{ plugin: "ReaEQ" }] });
check("une chaîne d'un seul maillon n'a pas de raccourci",
  seul.indexOf("data-foldfx") < 0 && seul.indexOf('data-fold="fx:x:0"') > 0, seul.slice(0, 200));

/*
 * Un chevron gris de neuf pixels ne disait pas qu'un élément s'ouvre, et au
 * téléphone rien ne survole : il ne restait aucun indice. Le signe « + » dans
 * une case, lui, se lit sans mode d'emploi — et il vient du style, pas du
 * balisage, parce que le clic ne retourne que « aria-expanded ».
 */
check("la case de repli n'écrit rien dans le balisage",
  listeFx.indexOf('<span class="chev" aria-hidden="true"></span>') > 0, listeFx.slice(0, 220));
check("le signe vient du style et suit l'état",
  src.indexOf('[aria-expanded="false"] > .chev::before{content:"+"}') > 0
  && src.indexOf('[aria-expanded="true"] > .chev::before{content:"−"}') > 0);
check("la case a un contour : sans lui, ce n'est qu'un caractère de plus",
  /\.chev\{[^}]*border:1px solid/.test(src), (src.match(/\.chev\{[^}]*/) || [""])[0].slice(0, 160));
check("survoler un titre le signale",
  src.indexOf(".grp-b:hover,.slot-h:hover{background:var(--panel)}") > 0);

/* Une case seule n'annonce pas ce qu'elle ouvre : le maillon replié dit ce
   qu'il garde derrière lui. */
check("un maillon replié annonce ce qu'il cache",
  /class="hid">\d+ (bandes?|réglages?)</.test(listeFx),
  (listeFx.match(/class="hid">[^<]*</g) || []).slice(0, 3).join(" | "));
check("ce compte disparaît dès que le maillon est ouvert",
  src.indexOf('.slot[data-folded="0"] .slot-h .hid{display:none}') > 0);
check("et il ne part pas sur le papier, où tout est rouvert",
  bloc.indexOf(".slot-h .hid") > 0, bloc.slice(0, 400));

check("le papier rouvre les maillons repliés",
  bloc.indexOf('.slot[data-folded="1"] .slot-b{display:block}') > 0, bloc.slice(0, 400));
check("et il retire les chevrons et le raccourci",
  bloc.indexOf(".slot-h .chev") > 0 && bloc.indexOf(".chain-h .fxall") > 0);
check("« Tout replier » de la barre ne vise que les sections",
  src.indexOf('document.querySelectorAll("#list .grp-b")') > 0);

/* --- replier une fiche entière --- */
/*
 * Une basse ou un ampli occupe toute la hauteur de sa façade dessinée. Repliée,
 * la fiche tient en une ligne : son nom, sa famille, et ce qu'elle cache —
 * le matériel, le nombre de pédales ou de maillons. Mesuré sur la fiche
 * « Crossfire » : 557 px dépliée, 65 px repliée.
 */
check("chaque fiche a un titre cliquable",
  /<button class="card-t" data-fold="carte:[^"]+" aria-expanded="(true|false)">/.test(liste),
  liste.slice(0, 260));
check("le corps de la fiche est séparé de son titre",
  liste.indexOf('<div class="card-b">') > 0 && /<\/div><\/article>/.test(liste));
check("une fiche repliée annonce son matériel",
  liste.indexOf('<span class="hid">Yamaha BB734A</span>') > 0,
  (liste.match(/class="hid">[^<]*</g) || []).slice(0, 3).join(" | "));
const fxCache = chaines.__nodes.get("list").innerHTML;
check("une chaîne annonce ses maillons",
  /class="hid">\d+ maillons</.test(fxCache),
  (fxCache.match(/class="hid">[^<]*</g) || []).slice(0, 3).join(" | "));
check("la famille reste hors du bouton : elle ne se clique pas",
  liste.indexOf('</button><span class="kind ') > 0, liste.slice(0, 260));
/* En flex, comme à l'écran : rouverte en bloc, la fiche perdait son espacement. */
check("le papier rouvre les fiches repliées",
  src.indexOf('.card[data-folded="1"] .card-b{display:flex}') > src.indexOf("@media print{"), bloc.slice(0, 500));
check("le corps garde l'espacement qu'avait la fiche",
  src.indexOf(".card-b{display:flex; flex-direction:column; gap:10px") > 0);
/* Le raccourci d'une chaîne ne doit pas emporter la fiche elle-même. */
check("« tout replier » d'une chaîne ne vise que ses maillons",
  src.indexOf('carte.querySelectorAll(".chain [data-fold]")') > 0);

/* --- ranger par artiste et par style --- */
/*
 * Les deux existaient comme filtres sans jamais ranger la page. Un style
 * appartient à plusieurs fiches et une fiche à plusieurs styles : elle paraît
 * donc sous chacun des siens, et la barre de liste continue de compter les
 * fiches — pas les cartes — en disant combien de fois elles paraissent.
 */
const parArtiste = titresDe(run(page, { search: "?group=artist" }));
check("« Par artiste » range sous le nom de l'artiste",
  parArtiste.indexOf("Smash Mouth") >= 0, parArtiste.join(" | "));
check("le nom d'un artiste n'est jamais remplacé par « Autres »",
  parArtiste.indexOf("Autres") < 0, parArtiste.join(" | "));
check("ce qui n'a pas d'artiste vient en dernier",
  parArtiste[parArtiste.length - 1] === "Sans artiste", parArtiste.join(" | "));

const parStyle = run(page, { search: "?group=tag" });
const titresStyle = titresDe(parStyle);
check("« Par style » range sous chaque style",
  titresStyle.indexOf("rock") >= 0 && titresStyle.indexOf("blues") >= 0, titresStyle.join(" | "));
check("les styles sont dans l'ordre alphabétique",
  titresStyle.filter((x) => x !== "Sans style").join("|")
  === titresStyle.filter((x) => x !== "Sans style").slice().sort((a, b) => a.localeCompare(b, "fr")).join("|"),
  titresStyle.join(" | "));
const listeStyle = parStyle.__nodes.get("list").innerHTML;
check("une fiche à deux styles paraît sous les deux",
  (listeStyle.match(/data-id="b-gospel"/g) || []).length === 2,
  String((listeStyle.match(/data-id="b-gospel"/g) || []).length));
check("la barre de liste compte alors les fiches et leurs apparitions",
  /class="n">\d+ fiches · \d+ apparitions</.test(parStyle.__nodes.get("listbar").innerHTML),
  parStyle.__nodes.get("listbar").innerHTML);
check("sans doublon, elle ne parle que des fiches",
  vue.__nodes.get("listbar").innerHTML.indexOf("apparitions") < 0,
  vue.__nodes.get("listbar").innerHTML);

check("un regroupement inconnu laisse celui par défaut",
  run(page, { search: "?group=nawak" }).__pb.ui().group === "kind");

/* --- filtrer par morceau ---
 * Une famille sonore sert plusieurs morceaux : elle doit remonter pour
 * chacun d'eux, et un morceau doit se retrouver sans se souvenir du preset. */
const wm = run(page, { search: "" });
const pm = wm.__pb, um = pm.ui();
um.songs = []; um.gear = []; um.brands = []; um.tags = []; um.kind = "all"; um.q = "";
pm.getState().custom.push(
  { id: "u-fam", kind: "multi", gear: "b2four", name: "INDIE DRIVE", tags: [], chain: [], song: null,
    songs: [{ title: "Reptilia", artist: "The Strokes" }, { title: "Last Nite", artist: "The Strokes" }] },
  { id: "u-autre", kind: "multi", gear: "b2four", name: "PUNK ATTACK", tags: [], chain: [], song: null,
    songs: [{ title: "Basket Case", artist: "Green Day" }] },
  { id: "u-basse", kind: "bass", name: "Basse pour Last Nite", tags: [], song: { title: "Last Nite", artist: "The Strokes" } });
const morceaux = pm.facetSongs();
const ln = morceaux.find((x) => x.id === "Last Nite — The Strokes");
check("le filtre Morceau liste chaque morceau une fois", !!ln && morceaux.filter((x) => x.id === ln.id).length === 1);
check("avec le nombre de fiches qui le servent", ln && ln.n === 2, ln && String(ln.n));
check("par ordre alphabétique",
  morceaux.map((x) => x.l).join("|") === morceaux.map((x) => x.l).sort((a, b) => a.localeCompare(b, "fr")).join("|"));
um.songs = ["Last Nite — The Strokes"];
const vus = pm.library().filter(pm.matches).map((p) => p.id).sort();
check("un morceau ramène toutes les fiches qui le servent",
  vus.join(",") === "u-basse,u-fam", vus.join(","));
check("une famille remonte pour chacun de ses morceaux", (() => {
  um.songs = ["Reptilia — The Strokes"];
  return pm.library().filter(pm.matches).map((p) => p.id).join() === "u-fam";
})());
um.songs = ["Reptilia — The Strokes", "Basket Case — Green Day"];
check("deux morceaux s'additionnent", pm.library().filter(pm.matches).length === 2);
check("il compte parmi les filtres actifs", pm.activeFilters() === 2, String(pm.activeFilters()));
check("les autres listes suivent le filtre",
  pm.facetGear().length === 1 && pm.facetGear()[0].id === "b2four" && pm.facetGear()[0].n === 2,
  JSON.stringify(pm.facetGear()));
um.open = true;
pm.renderFilters();
const zone = wm.__nodes.get("filters").innerHTML;
check("la liste des morceaux est dans les filtres", /data-fadd="song"/.test(zone));
check("et chaque morceau retenu en pastille", /data-fsong="Reptilia — The Strokes"/.test(zone) &&
  /data-fsong="Basket Case — Green Day"/.test(zone));
check("l'en-tête imprimé le nomme", /Basket Case — Green Day/.test(pm.filterLabel()));
um.songs = [];
check("sans morceau retenu, tout repasse", pm.library().filter(pm.matches).length === pm.library().length);
const viaUrl = run(page, { search: "?song=" + encodeURIComponent("Last Nite — The Strokes|Reptilia — The Strokes") }).__pb.ui();
check("un morceau se met en favori : ?song=…, séparés par « | »",
  viaUrl.songs.join("|") === "Last Nite — The Strokes|Reptilia — The Strokes" && viaUrl.open === true);

/* --- l'impression ---
 * Une feuille A4 dense : trois petites fiches par rangée, les chaînes sur
 * toute la largeur, aucune fiche coupée. Et une fiche seule, d'un bouton. */
const srcP = fs.readFileSync(page, "utf8");
const debut = srcP.indexOf("@media print{");
const blocP = srcP.slice(debut, srcP.indexOf("\n}\n", debut));
check("une seule règle de page, en A4", (srcP.match(/@page\{/g) || []).length === 1 && /@page\{ size:A4 portrait/.test(srcP));
check("trois fiches par rangée sur le papier", /\.grid\{ grid-template-columns:repeat\(3, minmax\(0,1fr\)\)/.test(blocP));
check("les chaînes et le pédalier prennent toute la largeur",
  /\.card\.k-board, \.card\.k-reaper, \.card\.k-multi\{ grid-column:1 \/ -1; \}/.test(blocP));
check("les blocs d'une chaîne sur deux colonnes, leurs réglages par trois",
  /\.chain\{ display:grid !important; grid-template-columns:repeat\(2/.test(blocP) &&
  /\.pgrid\{ grid-template-columns:repeat\(3, max-content minmax\(0,1fr\)\)/.test(blocP));
check("une fiche n'est jamais coupée entre deux pages", /article, \.grp-h, \.printhead, \.slot\{ break-inside:avoid/.test(blocP));
check("les couleurs de famille repassent en clair : pas de pavé d'encre en thème sombre",
  /--zoom:#3B559C; --zoom-soft:#DFE5F3;/.test(blocP) && /--amp:#A62F26; --amp-soft:#F4DEDA;/.test(blocP));
check("la carte se resserre par sa classe, que l'écran ne reprend pas", /\n  \.card\{\n    border:1px solid #B8B8B0/.test(blocP));
check("une fiche seule cache tout le reste",
  /body\.imprime-une \.grp:not\(\.a-imprimer\), body\.imprime-une article:not\(\.a-imprimer\)\{ display:none/.test(blocP));

const wp = run(page, { search: "" });
const pp = wp.__pb;
const cartesP = wp.__nodes.get("list").innerHTML;
check("chaque carte a son bouton Imprimer",
  (cartesP.match(/data-act="print"/g) || []).length === (cartesP.match(/<article/g) || []).length);
check("une fiche absente de l'écran ne lance rien", pp.imprimerFiche("n-existe-pas") === false);

const cible = pp.library()[0];
const art = wp.document.createElement("article"), grp = wp.document.createElement("section");
art.setAttribute("data-id", cible.id);
art.closest = (sel) => (sel === ".grp" ? grp : null);
wp.document.querySelectorAll = (sel) => (sel === "#list article" ? [art] : []);
let impressions = 0, apres = null;
wp.print = () => { impressions++; };
wp.addEventListener = (type, fn) => { if (type === "afterprint") apres = fn; };
wp.removeEventListener = () => {};
check("« Imprimer » sur une carte lance l'impression", pp.imprimerFiche(cible.id) === true && impressions === 1);
check("la page passe en mode fiche seule, la carte et sa section marquées",
  wp.document.body.classList.contains("imprime-une") && art.classList.contains("a-imprimer") && grp.classList.contains("a-imprimer"));
check("l'en-tête dit la famille et la date, le nom reste sur la carte",
  /<h2>Presetbook<\/h2><p>[^<]+·/.test(wp.__nodes.get("printhead").innerHTML), wp.__nodes.get("printhead").innerHTML);
apres && apres();
check("après l'impression, la liste revient", !wp.document.body.classList.contains("imprime-une") &&
  !art.classList.contains("a-imprimer") && !grp.classList.contains("a-imprimer"));

console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
process.exit(failed ? 1 : 0);
