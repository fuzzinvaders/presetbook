/**
 * Vérifie ce que le rendu de la page produit réellement, hors navigateur.
 *   node test/harness.js [chemin/vers/index.html]
 */
"use strict";
const path = require("node:path");
const { run } = require("./sandbox.js");

const file = process.argv[2] || path.join(__dirname, "..", "public", "index.html");
const sandbox = run(file, { search: process.env.PB_QS || "" });
const nodes = sandbox.__nodes;

let failed = 0;
function check(label, ok, detail) {
  if (ok) console.log("  ok    " + label);
  else { failed++; console.log("  ÉCHEC " + label + (detail ? " — " + detail : "")); }
}

setTimeout(() => {
  const list = nodes.get("list").innerHTML;
  const tabs = nodes.get("tabs").innerHTML;

  console.log("Rendu de la page");
  check("onglets construits", /data-k="all"/.test(tabs));
  check("cartes présentes", /class="card k-/.test(list), "longueur=" + list.length);
  check("carte basse", /k-bass/.test(list));
  check("carte ampli", /k-amp/.test(list));
  check("carte chaîne Reaper", /k-reaper/.test(list));
  check("maillons de chaîne", /class="slot/.test(list));
  check("table de bandes ReaEQ", /table class="bands"/.test(list));
  check("bande 900 Hz", /900 Hz/.test(list));
  check("gain de bande formaté", /\+3,0 dB/.test(list));
  check("paramètre TSE BOD", /Presence/.test(list));
  check("valeur à régler", /à régler/.test(list));
  check("maillon hors circuit", /hors circuit/.test(list));
  check("cadran au quart de cran", /12 h 15/.test(list));
  check("balance exacte", /P 45 \/ J 55/.test(list));

  /* matériel interchangeable */
  check("nom du matériel sur les cartes", /class="gearname">Yamaha BB734A/.test(list));
  check("ampli nommé sur ses cartes", /class="gearname">Fender Rumble 40/.test(list));
  check("regroupement par matériel",
    /class="grp-t">Yamaha BB734A</.test(list) && /class="grp-t">Fender Rumble 40</.test(list));
  check("façade de la basse", /class="strip bass"/.test(list));
  check("façade de l'ampli", /class="strip amp"/.test(list));
  check("repère rouge quand l'overdrive est engagé", /knob amp dr/.test(list));
  check("cadran hors circuit sur une fiche passive", /knob bass cool off/.test(list));

  /* pédales et pédaliers */
  check("carte de pédale", /k-pedal/.test(list));
  check("carte de pédalier", /k-board/.test(list));
  check("dessin de pédale", /<svg viewBox="0 0 /.test(list));
  check("boîtier coloré", /fill="#E9D53F"/.test(list), "couleur de l'overdrive absente");
  check("nom sérigraphié sur le boîtier", /OVERDRIVE</.test(list));
  check("interrupteur au pied dessiné", /r="11" fill="#DCDCD6"/.test(list));
  check("curseurs d'égaliseur graphique", /class="fdr"/.test(list));
  check("bande en décibels", list.indexOf("+2,0 dB") >= 0);
  check("pédalier relié par des câbles", /class="cable"/.test(list));
  check("pédale coupée signalée", /· coupée/.test(list));
  check("ordre du signal numéroté", list.indexOf("1. Accordeur") >= 0);

  /* --- deux fois le même nom au niveau supérieur, c'est une seule variable ---
     La page tient en un seul script de plusieurs milliers de lignes et de plus
     de deux cents noms au niveau supérieur. Un « var » redéclaré n'est ni une
     erreur ni un avertissement : le second écrase simplement le premier, et
     rien ne le signale. C'est arrivé une fois — l'invite d'installation du
     navigateur et le jeton d'invitation partageaient « invitation », si bien
     que la création du premier compte d'une instance neuve échouait sur une
     invitation qui n'existait pas. Seuls « var » et « function » se prêtent à
     ça : « let » et « const » redéclarés sont refusés par le moteur. */
  const source = require("node:fs").readFileSync(file, "utf8");
  const declares = new Map();
  source.split(/\r?\n/).forEach((ligne, i) => {
    const m = ligne.match(/^var ([A-Za-z_$][\w$]*)/)
           || ligne.match(/^function ([A-Za-z_$][\w$]*)\s*\(/);
    if (!m) return;
    if (!declares.has(m[1])) declares.set(m[1], []);
    declares.get(m[1]).push(i + 1);
  });
  const doubles = [...declares].filter(([, l]) => l.length > 1);
  check("aucun nom déclaré deux fois au niveau supérieur (" + declares.size + " noms)",
    doubles.length === 0,
    doubles.map(([n2, l]) => n2 + " lignes " + l.join(" et ")).join(" | "));

  /* --- « hidden » et les classes qui donnent un display ---
     L'attribut « hidden » n'agit que par la feuille par défaut du navigateur,
     et la moindre classe qui donne un display l'emporte. Un voile de dépôt
     déclaré « display:flex » est donc resté affiché en permanence, par-dessus
     toute la page, alors que la propriété « hidden » du nœud valait bien
     true : le bac à sable ne calcule pas les styles, il ne pouvait pas le
     voir. On vérifie donc la règle, et on la vérifie là où elle est écrite. */
  const feuille = source.slice(source.indexOf("<style>"), source.indexOf("</style>"));
  const general = /\[hidden\]\{display:none ?!important\}/.test(feuille);
  check("une règle générale neutralise les éléments cachés", general,
    "sans elle, « hidden » ne tient pas devant une classe qui donne un display");

  /* Sans la règle générale, chaque élément caché devrait avoir la sienne. */
  const caches = [...source.matchAll(/<[a-z]+[^>]*\sid="([a-z-]+)"[^>]*\shidden[^>]*>/g)].map((m) => m[1]);
  check("les éléments cachés du gabarit sont repérés (" + caches.length + ")", caches.length >= 3,
    caches.join(" "));
  const sansFilet = caches.filter((id) => {
    const bloc = new RegExp("\\." + id + "\\{[^}]*display:", "i");
    return !general && bloc.test(feuille);
  });
  check("aucun élément caché ne compte sur la feuille par défaut seule",
    sansFilet.length === 0, sansFilet.join(" "));

  /* --- le voile de dépôt sait finir ---
     Un fichier lâché hors de la fenêtre n'émet aucun « dragleave » : un
     compteur d'entrées et de sorties reste positif, et le voile ne part
     jamais. Le survol émet « dragover » tant qu'il dure. */
  check("le voile de dépôt s'efface faute de signal, sans compteur",
    source.indexOf("var depotFin = null;") > 0 && source.indexOf("var surVol") < 0
    && /addEventListener\("dragover"[^)]*\)\s*\{[\s\S]{0,80}depotActif\(\)/.test(source),
    "compteur encore présent ou dragover sans relance");

  const n = (list.match(/class="card k-/g) || []).length;
  console.log("\n" + n + " cartes rendues, " + (failed ? failed + " échec(s)" : "aucun échec"));
  process.exit(failed ? 1 : 0);
}, 50);
