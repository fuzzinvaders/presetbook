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
    /<h2>Yamaha BB734A<\/h2>/.test(list) && /<h2>Fender Rumble 40<\/h2>/.test(list));
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

  const n = (list.match(/class="card k-/g) || []).length;
  console.log("\n" + n + " cartes rendues, " + (failed ? failed + " échec(s)" : "aucun échec"));
  process.exit(failed ? 1 : 0);
}, 50);
