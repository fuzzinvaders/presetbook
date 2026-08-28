/**
 * Audit de la version anglaise : rend chaque écran en anglais et signale tout
 * texte visible resté en français.
 *   node test/langue.test.js
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
const fr = run(page, { search: "" });
const en = run(page, { search: "?lang=en" });
const pb = en.__pb;

console.log("Version anglaise");

/* --- le mécanisme --- */
check("le français reste la langue par défaut", fr.__pb.getLang() === "fr", fr.__pb.getLang());
check("?lang=en bascule l'application", pb.getLang() === "en", pb.getLang());
check("dictionnaire fourni", Object.keys(pb.EN).length > 220, Object.keys(pb.EN).length + " entrées");
check("un texte inconnu passe tel quel",
  pb.t("Texte absent du dictionnaire") === "Texte absent du dictionnaire");
check("un texte connu est traduit", pb.t("Modifier") === "Edit", pb.t("Modifier"));
check("les attributs sont épargnés",
  pb.tHtml('<input placeholder="Modifier">') === '<input placeholder="Modifier">');
check("les textes entre balises sont traduits",
  pb.tHtml("<button>Modifier</button>") === "<button>Edit</button>",
  pb.tHtml("<button>Modifier</button>"));
check("la traduction est idempotente", pb.tHtml("<b>Edit</b>") === "<b>Edit</b>");

/* --- localisation des valeurs --- */
check("virgule décimale en français",
  fr.__pb.ctrlText({ t: "scale", step: 0.5 }, 6.5) === "6,5", fr.__pb.ctrlText({ t: "scale", step: 0.5 }, 6.5));
check("point décimal en anglais",
  pb.ctrlText({ t: "scale", step: 0.5 }, 6.5) === "6.5", pb.ctrlText({ t: "scale", step: 0.5 }, 6.5));
check("heures à la française", fr.__pb.hourLabel(0.5) === "12 h 30", fr.__pb.hourLabel(0.5));
check("heures à l'anglaise", pb.hourLabel(0.5) === "12:30", pb.hourLabel(0.5));
check("balance traduite aux extrêmes", pb.balLabel(2) === "P only", pb.balLabel(2));
check("balance chiffrée inchangée", pb.balLabel(55) === "P 45 / J 55", pb.balLabel(55));

/* --- les messages à trou --- */
check("un motif à trou est traduit puis rempli",
  pb.tf("La commande {0} n'a pas de libellé.", 3) === "Control 3 has no label.",
  pb.tf("La commande {0} n'a pas de libellé.", 3));
check("deux trous", pb.tf("{0} effets importés, {1} reconnus en détail.", 5, 4)
  === "5 effects imported, 4 recognised in detail.");
check("un trou sans valeur reste visible",
  pb.tf("Export impossible : {0}").indexOf("{0}") > 0);
check("le français garde son motif",
  fr.__pb.tf("La commande {0} n'a pas de libellé.", 3) === "La commande 3 n'a pas de libellé.");

/* Tout message éphémère — toast, état du stockage, erreur de connexion — a
   sa traduction : ces écrans-là ne se rendent pas, donc l'audit les manque. */
const source = require("node:fs").readFileSync(page, "utf8");
const messages = new Set();
let m;
const appel = /\b(toast|gateError|setStore)\(([^)]*)\)/g;
while ((m = appel.exec(source))) {
  const lit = m[2].match(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g);
  if (!lit) continue;
  const txt = lit[lit.length - 1].slice(1, -1).replace(/\\(['"])/g, "$1");
  if (txt.length > 3 && /[a-zA-Zé]/.test(txt)) messages.add(txt);
}
const sansTrad = [...messages].filter((x) => pb.EN[x] === undefined);
check("tous les messages éphémères sont traduits (" + messages.size + ")",
  sansTrad.length === 0, sansTrad.slice(0, 4).join(" | "));

/* --- l'en-tête, écrit par le script et non par le gabarit --- */
const chrome = ["eyebrow", "btn-gear", "btn-io", "btn-new", "grp"]
  .map((id) => en.__nodes.get(id).innerHTML).join(" ");
check("l'en-tête est en anglais", !/[éèêà]|Matériel|Sauvegarde|Par /.test(chrome), chrome.slice(0, 90));
check("l'en-tête est rempli", chrome.indexOf("Gear") >= 0 && chrome.indexOf("By song") >= 0, chrome);
check("le champ de recherche est traduit",
  en.__nodes.get("q").getAttribute("placeholder") === "Search a style, a song, a plugin…",
  en.__nodes.get("q").getAttribute("placeholder"));
check("l'en-tête français est intact",
  fr.__nodes.get("btn-gear").innerHTML === "Matériel", fr.__nodes.get("btn-gear").innerHTML);
check("l'attribut lang du document suit",
  en.document.documentElement.getAttribute("lang") === "en" &&
  fr.document.documentElement.getAttribute("lang") === "fr");

/* --- audit : aucun français visible, écran par écran --- */
function visibles(html) {
  /* le bloc de sauvegarde contient du JSON : ce n'est pas de l'interface */
  return (String(html).replace(/<textarea[\s\S]*?<\/textarea>/g, "").match(/>[^<>]+</g) || [])
    .map((r) => r.slice(1, -1).replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 2);
}
/* Les mots-outils comptent autant que les accents : un « sous » ou un « avec »
   coincé entre deux balises forme son propre segment, et fuit sans accent. */
const francais = /[éèêëàâçùûôîïœ]|\b(les|des|une|aucun|aucune|avec|dans|pour|cette|sur|par|est|sont|qui|que|puis|donc|elle|vide|livré|fiche|fiches|commandes|selon|toujours|actif|Nom|Défaut|Modifier|Supprimer|Dupliquer|Fermer|Annuler|Enregistrer|sous|sans|entre|chez|depuis|aussi|mais|leur|ses|ces|cet|vers|ainsi|alors)\b/;

const ecrans = {};
ecrans["les cartes"] = en.__nodes.get("list").innerHTML;
ecrans["les onglets"] = en.__nodes.get("tabs").innerHTML;
ecrans["le pied de page"] = en.__nodes.get("foot").innerHTML;

pb.openGearList();
ecrans["la liste du matériel"] = en.__nodes.get("veil").innerHTML;

pb.openGearEditor(null, "pedal", null);
pb.getGDraft().model = "Test";
pb.getGDraft().controls.push({ k: "a", t: "scale", l: "Level", min: 0, max: 10, step: 0.5, d: 5 });
ecrans["la façade d'une pédale"] = pb.tHtml(pb.gearFormBody());

pb.openGearEditor(null, "bass", null);
pb.getGDraft().model = "Test";
pb.getGDraft().modes = { options: ["actif", "passif"], off: {} };
pb.getGDraft().controls.push({ k: "eq.b", t: "clock", l: "Bass", d: 0 });
ecrans["la façade d'un instrument"] = pb.tHtml(pb.gearFormBody());

/* les feuilles : un éditeur par genre de fiche, la sauvegarde, la connexion */
const veil = en.__nodes.get("veil");
pb.library().forEach((preset) => {
  const cle = "l'éditeur d'une fiche « " + preset.kind + " »";
  if (ecrans[cle]) return;                          /* une fiche par genre suffit */
  pb.openEditor(preset, false);
  ecrans[cle] = veil.innerHTML;
});
pb.openIO();
ecrans["la sauvegarde"] = veil.innerHTML;
pb.showGate();
ecrans["la connexion"] = en.__nodes.get("gate").innerHTML;

Object.keys(ecrans).forEach((nom) => {
  const restes = visibles(ecrans[nom]).filter((s) => francais.test(s));
  check("aucun français dans " + nom, restes.length === 0,
    restes.slice(0, 5).join(" | ") + (restes.length > 5 ? " …et " + (restes.length - 5) + " autres" : ""));
});

/* --- la recherche accepte les deux langues, dans les deux sens --- */
function trouvees(langue, q) {
  const w = run(page, { search: (langue ? "?lang=en&" : "?") + "q=" + encodeURIComponent(q) });
  /* une carte, une balise <article> : « class="card » apparaît trois fois par carte */
  return (w.__nodes.get("list").innerHTML.match(/<article/g) || []).length;
}
check("un mot français cherché en anglais", trouvees(true, "répétition") > 0,
  String(trouvees(true, "répétition")));
check("un mot anglais cherché en français", trouvees(false, "rehearsal") > 0,
  String(trouvees(false, "rehearsal")));
check("les deux langues ramènent le même nombre de fiches",
  trouvees(false, "répétition") === trouvees(true, "rehearsal"),
  trouvees(false, "répétition") + " contre " + trouvees(true, "rehearsal"));

/* --- le catalogue est bien traduit, pas seulement l'interface --- */
const cartes = en.__nodes.get("list").innerHTML;
check("un nom de preset est traduit", cartes.indexOf("Low-volume rehearsal") >= 0);
check("une note de preset est traduite", cartes.indexOf("cuts through two distorted guitars") >= 0);
check("un libellé de commande est traduit", cartes.indexOf("Picking hand") >= 0);
check("une famille de pédale est traduite", cartes.indexOf("Graphic equaliser") >= 0);
check("un modèle de matériel garde son nom propre", cartes.indexOf("Yamaha BB734A") >= 0);

/* --- le français reste intact --- */
const cartesFr = fr.__nodes.get("list").innerHTML;
check("la version française n'a pas bougé", cartesFr.indexOf("Main droite") >= 0 &&
  cartesFr.indexOf("Picking hand") < 0);

console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
process.exit(failed ? 1 : 0);
