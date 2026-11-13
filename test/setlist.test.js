/**
 * Les setlists : une liste ordonnée de morceaux, pas de fiches.
 *   node test/setlist.test.js
 *
 * Un morceau demande plusieurs fiches — la basse, la chaîne, le pédalier — et
 * c'est le morceau qu'on annonce sur scène. Ouvrir une setlist ne montre que
 * ses morceaux, dans son ordre, et c'est ce que l'impression met sur papier.
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

console.log("Setlists");

const w = run(page, { search: "" });
const pb = w.__pb;
const liste = () => w.__nodes.get("list").innerHTML;
/* Les titres sortent échappés du rendu : « & » y est écrit « &amp; ». */
const titres = () => (liste().match(/class="grp-t">[^<]*</g) || [])
  .map((x) => x.slice(14, -1).replace(/&amp;/g, "&"));

/* --- les morceaux connus --- */
const morceaux = pb.morceauxConnus();
check("les morceaux de la bibliothèque sont proposés", morceaux.length >= 2, morceaux.join(" | "));
check("chacun une seule fois",
  new Set(morceaux).size === morceaux.length, morceaux.join(" | "));
check("titre et artiste forment la clé",
  morceaux.indexOf("All Star — Smash Mouth") >= 0, morceaux.join(" | "));
check("une fiche sans morceau n'en est pas un",
  morceaux.indexOf("Sans morceau") < 0 && pb.cleMorceau({ song: null }) === "");

/* --- créer --- */
check("aucune setlist au départ", pb.setlists().length === 0);
pb.setlistNouvelle();
check("une setlist se crée vide", pb.setlists().length === 1 && pb.setlists()[0].songs.length === 0);
const jeu = pb.setlists()[0];
check("elle porte un nom dès sa naissance", !!jeu.name, jeu.name);
check("et un identifiant à elle", /^s-/.test(jeu.id), jeu.id);

/* --- ouvrir --- */
const total = pb.library().length;
jeu.songs = [morceaux[1], morceaux[0]];
pb.setlistOuvre(jeu.id);

const montrees = pb.library().filter(pb.matches);
check("ouvrir une setlist ne montre que ses morceaux",
  montrees.length > 0 && montrees.length < total
  && montrees.every((p) => jeu.songs.indexOf(pb.cleMorceau(p)) >= 0),
  montrees.length + " sur " + total);
check("elle se lit morceau par morceau", pb.ui().group === "song", pb.ui().group);
check("les sections suivent l'ordre de la setlist",
  titres()[0] === morceaux[1] && titres()[1] === morceaux[0], titres().join(" | "));

pb.setlistBouge(jeu.id, 0, 1);
check("monter un morceau déplace sa section",
  titres()[0] === morceaux[0], titres().join(" | "));
check("et l'ordre est gardé dans la setlist",
  jeu.songs[0] === morceaux[0], jeu.songs.join(" | "));
check("on ne descend pas le dernier",
  (pb.setlistBouge(jeu.id, jeu.songs.length - 1, 1), jeu.songs[0] === morceaux[0]),
  jeu.songs.join(" | "));

/* --- ce que la page annonce --- */
const barre = w.__nodes.get("listbar").innerHTML;
check("la barre de liste nomme la setlist ouverte",
  barre.indexOf("Setlist : ") > 0 && barre.indexOf(jeu.name) > 0, barre.slice(0, 160));
check("et propose d'en sortir", barre.indexOf("data-setoff") > 0, barre.slice(0, 160));
check("l'en-tête d'impression la nomme aussi",
  w.__nodes.get("printhead").innerHTML.indexOf(jeu.name) > 0,
  w.__nodes.get("printhead").innerHTML);

/* Les compteurs d'onglets sont une portée, pas un filtre d'onglet : annoncer
   « 68 » au-dessus d'une liste de quatre serait faux. */
const onglets = w.__nodes.get("tabs").innerHTML;
const totalOnglet = Number((onglets.match(/data-k="all"[^>]*>[^<]*<span class="n">(\d+)</) || [])[1]);
check("les compteurs d'onglets suivent la setlist",
  totalOnglet === montrees.length || totalOnglet < total,
  totalOnglet + " alors que la bibliothèque en a " + total);

/* --- sortir --- */
pb.setlistFerme();
check("quitter la setlist rend toute la bibliothèque",
  pb.library().filter(pb.matches).length === total);
check("et la barre ne la nomme plus",
  w.__nodes.get("listbar").innerHTML.indexOf("data-setoff") < 0);

/* --- supprimer --- */
pb.setlistOuvre(jeu.id);
pb.setlistSupprime(jeu.id);
check("supprimer une setlist la retire", pb.setlists().length === 0);
check("et rouvre la bibliothèque entière",
  pb.ui().set === null && pb.library().filter(pb.matches).length === total);

/* --- un morceau qui n'existe plus --- */
pb.setlistNouvelle();
const jeu2 = pb.setlists()[0];
jeu2.songs = ["Un morceau qui n'est nulle part", morceaux[0]];
pb.setlistOuvre(jeu2.id);
check("un morceau sans fiche ne casse rien",
  pb.library().filter(pb.matches).length > 0 && titres().length >= 1, titres().join(" | "));
pb.setlistFerme();

/* --- ce qui doit survivre à l'enregistrement --- */
check("un état écrit avant les setlists s'ouvre quand même",
  src.indexOf("sets: Array.isArray(j.sets) ? j.sets : []") > 0);
const srv = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
check("le serveur garde les setlists : sans ça, jetées au premier enregistrement",
  /sets: Array\.isArray\(input\.sets\)/.test(srv));
check("et l'état vide en a une place", /EMPTY_STATE[^;]*sets: \[\]/.test(srv));

console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
process.exit(failed ? 1 : 0);
