/**
 * Liste des façades et formulaire de commandes : ce que l'interface produit.
 *   node test/gearform.test.js
 */
"use strict";
const path = require("node:path");
const { run } = require("./sandbox.js");

const sandbox = run(path.join(__dirname, "..", "public", "index.html"));
const pb = sandbox.__pb, nodes = sandbox.__nodes;

let failed = 0;
function check(label, ok, detail) {
  if (ok) console.log("  ok    " + label);
  else { failed++; console.log("  ÉCHEC " + label + (detail ? " — " + detail : "")); }
}

console.log("Interface des façades");

pb.openGearList();
const liste = nodes.get("veil").innerHTML;
check("la liste s'ouvre", liste.length > 200, "longueur " + liste.length);
check("section instruments", /<legend>Instruments<\/legend>/.test(liste));
check("section amplis", /<legend>Amplis<\/legend>/.test(liste));
check("la BB734A est listée", /Yamaha BB734A/.test(liste));
check("le nombre de commandes est indiqué", /4 commandes/.test(liste));
check("les fiches qui l'utilisent sont comptées", /1[0-9] fiches/.test(liste), "aucun comptage");
check("une façade livrée est signalée", /· livré/.test(liste));
check("on peut dupliquer une façade livrée", /data-gdup/.test(liste));
check("on ne peut pas modifier une façade livrée", !/data-gedit/.test(liste));
check("bouton de création par famille", (liste.match(/data-gnew/g) || []).length === 3,
  String((liste.match(/data-gnew/g) || []).length));
check("section pédales", /<legend>Pédales<\/legend>/.test(liste));

/* --- formulaire : une commande de chaque type --- */
pb.openGearEditor(null, "amp", null);
const g = pb.getGDraft();
check("brouillon créé pour un ampli", g && g.kind === "amp", JSON.stringify(g && g.kind));
g.model = "Essai";
g.controls.push({ k: "gain", t: "scale", l: "Gain", min: 1, max: 10, step: 0.5, d: 5 });
g.controls.push({ k: "c.boost", t: "switch", l: "Boost" });
g.controls.push({ k: "eq.b", t: "clock", l: "Bass", d: 0 });
g.controls.push({ k: "balance", t: "balance", l: "Balance", a: "A", b: "B", d: 50 });
const form = pb.gearFormBody();

check("champ marque", /data-gf="brand"/.test(form));
check("champ modèle", /data-gf="model"/.test(form));
check("choix de l'aspect des boutons", /data-gf="face"/.test(form));
check("échelle : bornes et pas", /data-gc="min"/.test(form) && /data-gc="max"/.test(form) &&
  /data-gc="step"/.test(form));
check("cadran cranté : défaut en crans", /crans depuis midi/.test(form));
check("balance : les deux côtés", /Côté 0/.test(form) && /Côté 100/.test(form));
check("interrupteur : aucun réglage superflu", (form.match(/data-gc="min"/g) || []).length === 1,
  String((form.match(/data-gc="min"/g) || []).length));
check("dépendance proposée puisqu'il y a un interrupteur", /data-gc="needs"/.test(form));
check("les clés engendrées sont visibles", /clé c\.boost/.test(form));
check("réordonner et retirer une commande", /data-cact="up"/.test(form) && /data-cact="rm"/.test(form));
check("ajouter une commande", /data-cact="add"/.test(form));
check("pas de case « hors circuit » sans modes", !/data-goff/.test(form));

/* --- avec deux modes --- */
g.modes = { options: ["actif", "passif"], off: { passif: ["eq.b"] } };
const form2 = pb.gearFormBody();
check("cases « hors circuit » avec deux modes", /data-goff/.test(form2));
check("le second mode est nommé dans le libellé", /hors circuit en passif/.test(form2));
check("la commande déjà hors circuit est cochée",
  /data-goff checked> hors circuit en passif/.test(form2) ||
  /data-goff checked/.test(form2), "case non cochée");
check("noms des deux modes éditables", /data-gmode="0"/.test(form2) && /data-gmode="1"/.test(form2));


/* --- formulaire d'une pédale : couleur, silhouette, disposition, aperçu --- */
pb.openGearEditor(null, "pedal", null);
const gp = pb.getGDraft();
check("brouillon de pédale", gp && gp.kind === "pedal" && gp.style === "std", String(gp && gp.style));
gp.model = "Essai";
gp.controls.push({ k: "a", t: "scale", l: "Gain", min: 0, max: 10, step: 0.5, d: 5 });
gp.controls.push({ k: "b", t: "scale", l: "Tone", min: 0, max: 10, step: 0.5, d: 5 });
gp.controls.push({ k: "c", t: "scale", l: "Level", min: 0, max: 10, step: 0.5, d: 5 });
const fp = pb.gearFormBody();
check("choix de la couleur du boîtier", /data-gf="color"/.test(fp));
check("choix de la silhouette", /data-gf="style"/.test(fp));
check("cinq silhouettes proposées",
  (fp.match(/<option value="(std|treadle|tall|big|mini)"/g) || []).length === 5,
  String((fp.match(/<option value="(std|treadle|tall|big|mini)"/g) || []).length));
check("choix du nombre de boutons par rangée", /data-gf="perRow"/.test(fp));
check("aperçu dessiné dans le formulaire", /class="preview"/.test(fp) && fp.indexOf("<svg ") >= 0);
check("pas d'aspect de bouton sur une pédale", !/data-gf="face"/.test(fp));

/* --- centrage des rangées, y compris incomplètes --- */
function abscisses(n, perRow) {
  const ctrls = [];
  for (let i = 0; i < n; i++) ctrls.push({ k: "k" + i, t: "scale", l: "K", min: 0, max: 10, step: 1, d: 5 });
  const art = pb.pedalArt({ model: "T", color: "#888888", style: "std", perRow: perRow, controls: ctrls }, {}, {});
  const w = Number(art.match(/viewBox="0 0 (\d+)/)[1]);
  const xs = (art.match(/<circle cx="([0-9.]+)" cy="[0-9.]+" r="12\.5"/g) || [])
    .map((m) => parseFloat(m.match(/cx="([0-9.]+)"/)[1]));
  return { w: w, xs: xs };
}
const t3 = abscisses(3, 2);
check("trois boutons : deux en haut, un centré dessous",
  t3.xs.length === 3 && Math.abs(t3.xs[2] - t3.w / 2) < 0.6 &&
  Math.abs((t3.xs[0] + t3.xs[1]) / 2 - t3.w / 2) < 0.6, JSON.stringify(t3));
const t5 = abscisses(5, 3);
check("cinq boutons : la rangée de deux est centrée",
  Math.abs((t5.xs[3] + t5.xs[4]) / 2 - t5.w / 2) < 0.6, JSON.stringify(t5));
const t8 = abscisses(8, 3);
check("huit boutons : la dernière rangée est centrée",
  Math.abs((t8.xs[6] + t8.xs[7]) / 2 - t8.w / 2) < 0.6, JSON.stringify(t8));
const t1 = abscisses(1, 2);
check("un seul bouton, centré", Math.abs(t1.xs[0] - t1.w / 2) < 0.6, JSON.stringify(t1));

/* --- les silhouettes changent la forme du boîtier --- */
const ctl = [{ k: "a", t: "scale", l: "Level", min: 0, max: 10, step: 1, d: 5 }];
function largeur(style) {
  return Number(pb.pedalArt({ model: "T", color: "#888888", style: style, controls: ctl }, {}, {})
    .match(/viewBox="0 0 (\d+)/)[1]);
}
check("la compacte porte une bascule",
  pb.pedalArt({ model: "T", color: "#888888", style: "treadle", controls: ctl }, {}, {})
    .indexOf('rx="4" fill="rgba(0,0,0,.4)"') >= 0);
check("la mini ne sérigraphie pas le nom",
  pb.pedalArt({ model: "T", color: "#888888", style: "mini", controls: ctl }, {}, {}).indexOf(">T<") < 0);
check("la mini est plus étroite que le grand boîtier", largeur("mini") < largeur("big"),
  largeur("mini") + " contre " + largeur("big"));
check("la haute et étroite est la plus fine", largeur("tall") <= largeur("std"),
  largeur("tall") + " contre " + largeur("std"));
console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
process.exit(failed ? 1 : 0);
