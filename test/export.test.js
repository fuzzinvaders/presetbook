/**
 * L'export d'une fiche seule, et son retour dans une autre bibliothèque.
 *   node test/export.test.js
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
console.log("Export d'une fiche");

/* --- le bouton est sur toutes les cartes, quel que soit le genre --- */
const w = run(page, { search: "" });
const cartes = w.__nodes.get("list").innerHTML;
const nbCartes = (cartes.match(/<article/g) || []).length;
const nbExport = (cartes.match(/data-act="exp"/g) || []).length;
check("une carte, un bouton d'export", nbExport === nbCartes, nbExport + " sur " + nbCartes);

["bass", "amp", "pedal", "board", "reaper"].forEach((k) => {
  const v = run(page, { search: "?kind=" + k });
  const h = v.__nodes.get("list").innerHTML;
  check("le genre « " + k + " » a son export",
    (h.match(/data-act="exp"/g) || []).length === (h.match(/<article/g) || []).length);
});

/* --- l'enveloppe emporte les façades personnelles --- */
const pb = w.__pb;
const S = pb.getState();
S.gear["g-perso"] = { kind: "bass", brand: "Essai", model: "Maison", face: "bass",
  controls: [{ k: "c.vol", t: "scale", l: "Volume", min: 0, max: 10, step: 0.5, d: 5 }] };
S.custom.push({ id: "u-essai", kind: "bass", name: "Fiche d'essai", gear: "g-perso",
  tags: ["test"], v: { c: { vol: 7 } }, notes: "Une note." });

const env = JSON.parse(pb.presetFile(pb.findPreset("u-essai")));
check("l'enveloppe est reconnaissable", env.presetbook === "preset" && env.v === 1);
check("la fiche est dedans", env.preset && env.preset.id === "u-essai");
check("la façade personnelle voyage avec elle", !!env.gear["g-perso"]);

/* une fiche sur une façade livrée n'emporte pas la façade : elle existe déjà ailleurs */
const surLivree = pb.library().filter((x) => x.gear === "pd-od")[0];
const livree = JSON.parse(pb.presetFile(surLivree));
check("une façade livrée ne voyage pas", Object.keys(livree.gear).length === 0,
  Object.keys(livree.gear).join(", "));

/* une fiche qui s'appuie sur la façade par défaut n'a rien à emporter non plus */
const parDefaut = pb.library().filter((x) => x.kind === "bass" && !x.gear)[0];
check("une fiche sans façade déclarée s'exporte quand même",
  !!parDefaut && JSON.parse(pb.presetFile(parDefaut)).preset.name === parDefaut.name);

/* un pédalier emporte toutes les pédales de sa chaîne */
const board = pb.library().filter((x) => x.kind === "board")[0];
S.gear["g-pd"] = { kind: "pedal", model: "Perso", color: "#888", controls: [] };
const copie = JSON.parse(JSON.stringify(board));
copie.id = "u-board"; copie.slots = copie.slots.concat([{ gear: "g-pd", on: true, v: {} }]);
S.custom.push(copie);
const envBoard = JSON.parse(pb.presetFile(pb.findPreset("u-board")));
check("un pédalier emporte ses pédales personnelles", !!envBoard.gear["g-pd"]);

/* --- le retour dans une bibliothèque vierge --- */
const w2 = run(page, { search: "" });
const pb2 = w2.__pb;
const avant = pb2.library().length;
check("la façade est inconnue avant l'import", !pb2.allGear()["g-perso"]);
pb2.addPreset(env);
check("la fiche est ajoutée", pb2.library().length === avant + 1);
check("la façade arrive avec elle", !!pb2.allGear()["g-perso"]);
const relue = pb2.library().filter((x) => x.id === "u-essai")[0];
check("les valeurs sont intactes", relue && relue.v.c.vol === 7, relue ? String(relue.v.c.vol) : "absente");

/* --- deux fois la même fiche : elle s'ajoute, elle n'écrase pas --- */
pb2.addPreset(env);
const doubles = pb2.library().filter((x) => String(x.name).indexOf("Fiche d'essai") === 0);
check("un second import ne remplace rien", doubles.length === 2,
  doubles.map((x) => x.name).join(" | "));
check("le doublon est signalé dans son nom",
  doubles.some((x) => x.name.indexOf("(importée)") > 0), doubles.map((x) => x.name).join(" | "));
check("le doublon a son propre identifiant",
  doubles[0].id !== doubles[1].id, doubles.map((x) => x.id).join(" | "));

/* --- une fiche sans sa façade est refusée, pas ajoutée à moitié --- */
const w3 = run(page, { search: "" });
const orpheline = JSON.parse(JSON.stringify(env));
orpheline.gear = {};
const avant3 = w3.__pb.library().length;
w3.__pb.addPreset(orpheline);
check("une fiche orpheline est refusée", w3.__pb.library().length === avant3,
  w3.__pb.library().length + " au lieu de " + avant3);

/* un fichier qui n'est pas une fiche ne casse rien */
w3.__pb.addPreset({ presetbook: "preset", preset: { name: "sans genre" } });
check("un contenu inattendu est refusé", w3.__pb.library().length === avant3);

/* --- les noms de fichiers --- */
check("les espaces et barres deviennent des tirets",
  pb.fileName("Motown / doux", ".presetbook.json") === "Motown-doux.presetbook.json",
  pb.fileName("Motown / doux", ".presetbook.json"));
check("les accents sont gardés",
  pb.fileName("Répétition", ".json") === "Répétition.json", pb.fileName("Répétition", ".json"));
check("un nom vide a un repli", pb.fileName("   ", ".json") === "presetbook.json",
  pb.fileName("   ", ".json"));

/* --- la restauration reconnaît les deux sortes de blocs --- */
const suffixes = ["(copie)", "(importée)"];
suffixes.forEach((suf) => {
  const en = run(page, { search: "?lang=en" }).__pb;
  const motif = "{0} " + suf;
  check("le suffixe " + suf + " est traduit", en.tf(motif, "Motown") !== "Motown " + suf,
    en.tf(motif, "Motown"));
});

/* --- un fichier .json se dépose ou se choisit ----------------------------
 * Exporter écrivait un fichier ; le reprendre demandait de l'ouvrir, de le
 * copier et de le coller dans le bloc. Il entre maintenant comme une chaîne.
 */
const lus = [];
function lecteur() {
  this.readAsText = function (file, enc) {
    this.enc = enc; this.result = file.__texte; lus.push(this);
    if (this.onload) this.onload();
  };
}
const imp = run(page, { search: "" });
imp.FileReader = lecteur;
const nb = () => imp.__pb.library().length;
const avantImp = nb();
imp.__pb.deposerFichier({ name: "Fiche-d-essai.presetbook.json", __texte: JSON.stringify(env) });
check("une fiche .json déposée s'ajoute", nb() === avantImp + 1, avantImp + " puis " + nb());
check("avec sa façade personnelle", !!imp.__pb.allGear()["g-perso"]);
check("lue en UTF-8, comme Exporter l'écrit", lus[0] && lus[0].enc === "utf-8", lus[0] && lus[0].enc);

imp.__pb.deposerFichier({ name: "encore.json", __texte: JSON.stringify(env) });
check("la même fiche une seconde fois s'ajoute sans rien remplacer",
  nb() === avantImp + 2, String(nb()));

let n0 = nb();
imp.__pb.deposerFichier({ name: "casse.json", __texte: "{ pas du json" });
check("un JSON cassé ne crée rien", nb() === n0);
imp.__pb.deposerFichier({ name: "autre.json", __texte: JSON.stringify({ bonjour: 1 }) });
check("un JSON qui n'est ni fiche ni sauvegarde ne crée rien", nb() === n0);

/* Une sauvegarde complète ne s'applique pas sur un simple dépôt : elle
   remplacerait toute la bibliothèque. Elle s'installe dans le bloc. */
const sauvegarde = JSON.stringify({ v: 1, library: [],
  mine: { v: 1, custom: [], overrides: {}, gear: {}, hidden: [] } });
check("une sauvegarde se reconnaît", imp.__pb.estSauvegarde(JSON.parse(sauvegarde)));
check("un objet quelconque n'en est pas une", !imp.__pb.estSauvegarde({ bonjour: 1 }));
imp.__pb.deposerFichier({ name: "presetbook-presets.json", __texte: sauvegarde });
check("une sauvegarde déposée ne remplace rien d'elle-même", nb() === n0, nb() + " au lieu de " + n0);
check("elle attend dans le bloc", imp.__nodes.get("io").value === sauvegarde);
check("le bloc est ouvert sous les yeux", imp.__nodes.get("veil").classList.contains("open"));
imp.__pb.doImport();
check("et « Restaurer » l'applique", imp.__pb.getState().custom.length === 0,
  String(imp.__pb.getState().custom.length));

/* La porte vaut pour le .json comme pour la chaîne. */
const imp2 = run(page, { search: "" });
imp2.FileReader = lecteur;
imp2.document.getElementById("gate").classList.add("open");
const a2 = imp2.__pb.library().length;
imp2.__pb.deposerFichier({ name: "x.json", __texte: JSON.stringify(env) });
check("porte fermée, rien n'est importé", imp2.__pb.library().length === a2);

/* Le sélecteur et le dépôt passent par le même aiguillage. */
const src = require("node:fs").readFileSync(page, "utf8");
check("la sauvegarde propose d'importer un fichier",
  /data-pick>Importer un fichier</.test(src) &&
  /type="file" id="io-file" data-json-in accept="\.json/.test(src));
check("le sélecteur passe par la porte",
  /hasAttribute\("data-json-in"\)[\s\S]{0,200}deposerFichier\(choisi\)/.test(src));
check("tous les fichiers lâchés sont lus, pas seulement le premier",
  /for \(var i=0;i<lot\.length;i\+\+\) deposerFichier\(lot\[i\]\)/.test(src));

console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
process.exit(failed ? 1 : 0);
