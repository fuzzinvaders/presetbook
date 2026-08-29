/**
 * Les propositions à la saisie d'un nom, qui évitent d'écrire deux fois la même fiche.
 *   node test/doublons.test.js
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
console.log("Éviter les doublons");

const w = run(page, { search: "" });
const pb = w.__pb;
const noms = (q) => pb.suggestName(q).map((p) => p.name);

/* --- la correspondance --- */
check("un début de nom ramène les fiches proches", noms("motow").length > 1, noms("motow").join(" | "));
check("la casse est ignorée", noms("MOTOW").join() === noms("motow").join());
check("les accents aussi, comme partout ailleurs",
  noms("cremeux").indexOf("Blues crémeux") >= 0, noms("cremeux").join(" | "));
check("un mot au milieu du nom compte, s'il commence là",
  noms("motown").indexOf("Compression Motown") >= 0, noms("motown").join(" | "));

/* Le point qui fait la différence entre une aide et du bruit. */
check("une suite de lettres au milieu d'un mot ne déclenche rien",
  noms("zz").length === 0, noms("zz").join(" | "));
check("« jaz » retrouve pourtant les Jazz", noms("jaz").length > 1, noms("jaz").join(" | "));
check("le début de mot est bien la règle",
  pb.debutDeMot("Blues crémeux", "cre") === true
  && pb.debutDeMot("Blues crémeux", "remeux") === false,
  "cre → " + pb.debutDeMot("Blues crémeux", "cre") +
  ", remeux → " + pb.debutDeMot("Blues crémeux", "remeux"));

/* --- le seuil --- */
check("une seule lettre ne propose rien : tout lui ressemble", noms("m").length === 0);
check("deux lettres suffisent", noms("mo").length > 0, String(noms("mo").length));
check("un champ vide ne propose rien", noms("").length === 0);

/* --- la liste reste courte --- */
check("cinq propositions au plus", noms("a").length <= 5 && noms("mo").length <= 5,
  String(noms("mo").length));

/* --- le nom exact passe devant --- */
const exact = pb.suggestName("Compression Motown");
check("une fiche du même nom exactement vient en tête",
  exact.length > 0 && exact[0].name === "Compression Motown",
  exact.map((p) => p.name).join(" | "));

/* --- les morceaux --- */
const chansons = pb.suggestSong("all");
check("un morceau déjà saisi est proposé",
  chansons.length > 0 && chansons[0].title === "All Star", JSON.stringify(chansons));
check("l'artiste vient avec : les deux vont ensemble",
  chansons[0].artist === "Smash Mouth", chansons[0].artist);
check("un morceau n'est proposé qu'une fois, même s'il sert à plusieurs fiches",
  chansons.filter((m) => m.title === "All Star").length === 1, JSON.stringify(chansons));

/* --- l'écran --- */
pb.openEditor({ id: "neuf", kind: "bass", name: "", tags: [], eq: {} }, true);
const veil = w.__nodes.get("veil").innerHTML;
check("le formulaire réserve la place sous le nom", veil.indexOf('id="sug-name"') > 0);
check("et sous le morceau", veil.indexOf('id="sug-song"') > 0);

const draft = pb.getDraft();
const zone = () => w.__nodes.get("sug-name").innerHTML;

draft.name = "motow";
pb.renderSuggest("name");
check("la frappe remplit la zone", zone().indexOf("data-sugopen") > 0, zone().slice(0, 80));
check("chaque proposition dit de quelle famille elle est",
  zone().indexOf('class="k"') > 0, zone().slice(0, 120));
check("le ton reste celui d'une information",
  zone().indexOf("existent déjà") > 0 && zone().indexOf("dup") < 0, zone().slice(0, 80));

draft.name = "Compression Motown";
pb.renderSuggest("name");
check("un nom déjà pris est signalé plus fermement",
  zone().indexOf("porte déjà ce nom") > 0 && zone().indexOf('class="t dup"') > 0,
  zone().slice(0, 90));

draft.name = "un nom que personne n'a pris";
pb.renderSuggest("name");
check("rien à signaler, rien à l'écran", zone() === "", JSON.stringify(zone()));

/* Une fiche existante qu'on renomme ne se propose pas elle-même. */
pb.openEditor({ id: "b-motown", kind: "bass", name: "Motown / Soul", tags: [], eq: {} }, false);
const soi = pb.suggestName("Motown / Soul", "b-motown");
check("en modification, la fiche ne se propose pas elle-même",
  soi.every((p) => p.id !== "b-motown"), soi.map((p) => p.id).join(", "));

/* --- la saisie n'est pas perdue --- */
pb.openEditor({ id: "neuf2", kind: "amp", name: "Motown au d", tags: [], eq: {} }, true);
pb.openSuggestion("a-svt-motown");
check("cliquer une proposition ouvre la fiche existante",
  pb.getDraft().id === "a-svt-motown", pb.getDraft().id);
/* Le bandeau est bâti par createElement, jamais par innerHTML : il porte des
   noms de fiches, donc du texte écrit par l'utilisateur. On l'interroge donc
   par ses enfants et non par son balisage. */
const bandeau = w.__nodes.get("toast");
check("le bandeau porte un message et un bouton",
  bandeau.children.length === 2, String(bandeau.children.length));
check("le bouton propose de revenir à la saisie abandonnée",
  bandeau.children[1].textContent === "Revenir à ma saisie",
  bandeau.children[1].textContent);

/* --- la couture avec le formulaire --- */
const src = fs.readFileSync(page, "utf8");
check("la frappe dans le champ nom appelle bien les propositions",
  /if \(f === "name" \|\| f === "song\.title"\) renderSuggest\(f\);/.test(src),
  "sans cet appel, la zone resterait vide");
check("le clic sur une proposition est écouté",
  src.indexOf("data-sugopen") > 0 && /closest\("\[data-sugopen\]"\)/.test(src));
check("choisir un morceau remplit aussi l'artiste",
  /getElementById\("f-song-artist"\)/.test(src));

/* --- les deux langues --- */
const en = run(page, { search: "?lang=en" }).__pb;
[["Une fiche porte déjà ce nom :", "A preset already goes by that name:"],
 ["Des fiches proches existent déjà :", "Close presets already exist:"],
 ["Déjà saisi :", "Already entered:"],
 ["Revenir à ma saisie", "Back to what I was typing"]].forEach(function (p) {
  check("« " + p[0] + " » est traduit", en.t(p[0]) === p[1], en.t(p[0]));
});

console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
process.exit(failed ? 1 : 0);
