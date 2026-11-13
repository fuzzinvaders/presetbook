/**
 * L'ordre des fiches dans une section, et la date de dernière modification.
 *   node test/tri.test.js
 *
 * La date sert deux fois : ranger la liste, et dire sur la carte quand on a
 * réglé ça pour la dernière fois. Elle s'écrit à l'enregistrement, jamais à
 * la lecture — ouvrir une fiche ne la modifie pas.
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { run } = require("./sandbox.js");

const page = path.join(__dirname, "..", "public", "index.html");
const src = fs.readFileSync(page, "utf8");

let failed = 0;
function check(label, ok, detail) {
  if (ok) console.log("  ok    " + label);
  else { failed++; console.log("  ÉCHEC " + label + (detail ? " — " + detail : "")); }
}
function titres(vue) {
  return (vue.__nodes.get("list").innerHTML.match(/<h3>[^<]*</g) || [])
    .map((x) => x.slice(4, -1));
}

console.log("Ordre des fiches et date de modification");

/* --- par nom --- */
/* Le rangement vaut à l'intérieur d'une section : les sections, elles, ont
   leur propre ordre, qui dit autre chose (le matériel, le morceau, le style). */
function sections(vue) {
  return vue.__nodes.get("list").innerHTML.split("<section").slice(1)
    .map((bloc) => (bloc.match(/<h3>[^<]*</g) || []).map((x) => x.slice(4, -1)));
}
const vueNom = run(page, { search: "?kind=bass&sort=nom" });
const parNom = titres(vueNom);
const desordre = sections(vueNom).filter(
  (noms) => noms.join("|") !== noms.slice().sort((a, b) => a.localeCompare(b, "fr")).join("|"));
check("« Par nom » range chaque section dans l'ordre alphabétique",
  sections(vueNom).length > 1 && desordre.length === 0,
  desordre.map((x) => x.join(" / ")).join(" | "));

const origine = titres(run(page, { search: "?kind=bass" }));
check("sans consigne, l'ordre d'origine ne bouge pas",
  origine.join("|") !== parNom.join("|") && origine[0] === "Rock / Hard rock",
  origine.slice(0, 3).join(" | "));

check("un tri inconnu laisse l'ordre d'origine",
  titres(run(page, { search: "?kind=bass&sort=nawak" })).join("|") === origine.join("|"));

/* --- la dernière modifiée --- */
/*
 * Une fiche sans date passe en dernier : « jamais enregistrée depuis que la
 * date existe » n'est pas « ancienne ». Tant qu'aucune n'a de date, l'ordre
 * d'origine est conservé — c'est ce qu'on veut sur une bibliothèque neuve.
 */
const vue = run(page, { search: "?kind=bass&sort=maj" });
const pb = vue.__pb;
check("sans aucune date, rien ne bouge",
  titres(vue).join("|") === origine.join("|"), titres(vue).slice(0, 3).join(" | "));

check("une fiche livrée n'a pas de date tant qu'on n'y a pas touché",
  !pb.findPreset("b-jazz").maj);

pb.openEditor(pb.findPreset("b-jazz"), false);
pb.getDraft().name = "Jazz / Walking";
pb.commit();

const apres = pb.findPreset("b-jazz");
check("enregistrer une fiche la date",
  !!apres.maj && /^\d{4}-\d{2}-\d{2}T/.test(apres.maj), String(apres.maj));
check("la fiche enregistrée passe en tête",
  titres(vue)[0] === "Jazz / Walking", titres(vue).slice(0, 3).join(" | "));
check("la carte porte la date en toutes lettres",
  /class="maj">Modifiée le /.test(vue.__nodes.get("list").innerHTML),
  (vue.__nodes.get("list").innerHTML.match(/class="maj">[^<]*</) || [""])[0]);

/* La date reste à sa place quand on range autrement. */
pb.ui().sort = "nom";
pb.render();
check("elle survit à un autre rangement",
  /class="maj">Modifiée le /.test(vue.__nodes.get("list").innerHTML));

/* --- copier, c'est créer --- */
const w2 = run(page, { search: "" });
const pb2 = w2.__pb;
check("une fiche dupliquée naît aujourd'hui",
  src.indexOf('c.maj = new Date().toISOString();') > 0);
check("une fiche importée garde la sienne : c'est la même fiche",
  src.indexOf("function addPreset(env){") > 0
  && !/function addPreset\(env\)\{[\s\S]{0,900}?\.maj = new Date/.test(src));

/* --- la commande --- */
const barre = w2.__nodes.get("listbar").innerHTML;
check("le rangement se choisit dans la barre de liste", barre.indexOf('id="tri"') > 0, barre);
check("l'ordre d'origine y est proposé le premier",
  barre.indexOf('value=""') < barre.indexOf('value="nom"')
  && barre.indexOf('value="nom"') < barre.indexOf('value="maj"'));
check("le choix courant est marqué dans la liste",
  barre.indexOf('value="" selected') > 0, barre.slice(0, 200));

const seule = run(page, { search: "?q=crossfire&kind=reaper" });
check("une seule fiche n'a pas d'ordre à choisir",
  seule.__nodes.get("listbar").innerHTML.indexOf('id="tri"') < 0,
  seule.__nodes.get("listbar").innerHTML);

/* La liste déroulante est reconstruite à chaque rendu : écouter le champ
   lui-même laisserait le choix sans effet dès le premier repli. */
check("c'est la barre qui écoute, pas le champ",
  src.indexOf('document.getElementById("listbar").addEventListener("change"') > 0);

/* --- sur le papier --- */
const bloc = src.slice(src.indexOf("@media print{"), src.indexOf("@media print{") + 2600);
check("la date s'imprime : elle est dans le corps, pas dans les commandes",
  bloc.indexOf(".maj") < 0 && src.indexOf('.card .maj{') > 0);

console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
process.exit(failed ? 1 : 0);
