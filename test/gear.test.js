/**
 * Registre de matériel : instruments et amplis interchangeables.
 *   node test/gear.test.js
 *
 * Le script de la page est exécuté dans un DOM minimal, puis on interroge la
 * couture de test window.__pb.
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { run } = require("./sandbox.js");

const pb = run(path.join(__dirname, "..", "public", "index.html")).__pb;

let failed = 0;
function check(label, ok, detail) {
  if (ok) console.log("  ok    " + label);
  else { failed++; console.log("  ÉCHEC " + label + (detail ? " — " + detail : "")); }
}

console.log("Registre de matériel");

const basses = pb.gearList("bass"), amps = pb.gearList("amp");
check("plusieurs instruments", basses.length >= 4, basses.length + "");
check("plusieurs amplis", amps.length >= 4, amps.length + "");
check("la BB734A est au registre", !!pb.GEAR.bb734a);
check("le Rumble 40 est au registre", !!pb.GEAR.rumble40);
check("nom complet d'un modèle nommé", pb.gearName(pb.GEAR.bb734a) === "Yamaha BB734A",
  pb.gearName(pb.GEAR.bb734a));
check("un gabarit générique ne porte pas de marque",
  pb.gearName(pb.GEAR.amp3) === "Ampli 3 bandes", pb.gearName(pb.GEAR.amp3));

/* --- le registre tient debout, entrée par entrée ---
   Un modèle mal déclaré ne casse rien au chargement : il rend une fiche vide ou
   une commande muette, ce qui se voit bien plus tard. Autant le refuser ici. */
const cles = Object.keys(pb.GEAR);
check("le catalogue s'est étoffé", cles.length >= 20, cles.length + " modèles");

const abimes = cles.filter(function (k) {
  const g = pb.GEAR[k];
  if (!g.kind || !g.brand || !g.model || !g.face) return true;
  /* Un accordeur n'a aucun bouton : la liste peut être vide, pas absente. */
  if (!Array.isArray(g.controls)) return true;
  return g.controls.some(function (c) {
    if (!c.k || !c.t || !c.l) return true;
    if (c.t === "scale") return typeof c.min !== "number" || typeof c.max !== "number"
                              || typeof c.d !== "number" || c.d < c.min || c.d > c.max;
    return false;
  });
});
check("chaque modèle est complet et ses valeurs par défaut tiennent dans l'échelle",
  abimes.length === 0, abimes.join(", "));

const doublons = cles.filter(function (k) {
  const vues = {};
  return pb.GEAR[k].controls.some(function (c) {
    if (vues[c.k]) return true;
    vues[c.k] = 1;
    return false;
  });
});
check("aucun modèle ne déclare deux fois la même commande",
  doublons.length === 0, doublons.join(", "));

const sansMode = cles.filter(function (k) {
  const m = pb.GEAR[k].modes;
  /* Le formulaire de matériel n'affiche que deux modes : en déclarer trois en
     rendrait un inaccessible. */
  return m && (!Array.isArray(m.options) || m.options.length !== 2);
});
check("un matériel à modes en déclare exactement deux", sansMode.length === 0, sansMode.join(", "));

/* Les modèles nommés demandés au catalogue. */
[["svtcl", "Ampeg"], ["littlemark", "Markbass"], ["bh250", "TC Electronic"],
 ["rumble500", "Fender"], ["bluesjr", "Fender"], ["ac30", "Vox"], ["dsl40", "Marshall"],
 ["katana50", "Boss"], ["precision", "Fender"], ["jazzbass", "Fender"],
 ["stingray3", "Music Man"], ["ibanezsr", "Ibanez"]].forEach(function (p) {
  check("« " + p[0] + " » est au registre, chez " + p[1],
    !!pb.GEAR[p[0]] && pb.GEAR[p[0]].brand === p[1],
    pb.GEAR[p[0]] ? pb.GEAR[p[0]].brand : "absent");
});

/* Les valeurs par défaut d'un modèle nommé se posent comme les autres. */
const svt = pb.applyGearDefaults({ kind: "amp", gear: "svtcl", eq: {} });
check("les commandes du SVT sont remplies",
  svt.gain === 5 && svt.master === 5, JSON.stringify(svt));
/* Le sélecteur de fréquence était une échelle de 1 à 5, faute d'un type qui
   sache nommer des positions. Il porte maintenant sa fréquence. */
check("le sélecteur de fréquence porte un nom de position, pas un rang",
  svt.eq.mf === "800 Hz", String(svt.eq.mf));

/* --- les pédales : des types génériques, plus quelques modèles nommés --- */
const pedales = pb.gearList("pedal");
const nommees = pedales.filter(function (x) { return pb.GEAR[x.id].brand !== "générique"; });
check("les types génériques restent la majorité : un pédalier se décrit par fonction",
  pedales.length - nommees.length >= 15, (pedales.length - nommees.length) + " types");
check("des modèles nommés s'y ajoutent", nommees.length >= 5, nommees.length + " modèles");
[["pd-bigmuff", "Electro-Harmonix"], ["pd-ts9", "Ibanez"], ["pd-ds1", "Boss"],
 ["pd-sansamp", "Tech 21"], ["pd-b7k", "Darkglass"]].forEach(function (p) {
  check("« " + p[0] + " » est chez " + p[1],
    !!pb.GEAR[p[0]] && pb.GEAR[p[0]].brand === p[1],
    pb.GEAR[p[0]] ? pb.GEAR[p[0]].brand : "absent");
});
check("une pédale nommée reste une pédale",
  nommees.every(function (x) { return pb.GEAR[x.id].kind === "pedal"; }));
check("et garde un style de boîtier connu",
  nommees.every(function (x) { return !!pb.PEDAL_STYLES[pb.GEAR[x.id].style]; }),
  nommees.map(function (x) { return pb.GEAR[x.id].style; }).join(", "));

/* --- le sélecteur à positions nommées ---
   Il manquait : une basse à deux humbuckers se décrit par un sélecteur, pas par
   deux volumes. Faute de ce type, le Mid Freq de l'Ampeg et le type d'ampli du
   Katana étaient bricolés en échelles de 1 à 5. */
const mf = pb.GEAR.svtcl.controls.filter((c) => c.k === "eq.mf")[0];
check("l'Ampeg a un vrai sélecteur de fréquence", mf.t === "select", mf.t);
check("ses positions portent leur fréquence",
  pb.selOpts(mf).join("/") === "220 Hz/450 Hz/800 Hz/1,6 kHz/3 kHz", pb.selOpts(mf).join("/"));
const voice = pb.GEAR.katana50.controls.filter((c) => c.k === "voice")[0];
check("le Katana nomme ses types d'ampli",
  voice.t === "select" && pb.selOpts(voice).indexOf("Crunch") >= 0, pb.selOpts(voice).join("/"));

/* La valeur enregistrée est le nom de la position, pas son rang : lisible dans
   un export, et elle survit à un réordonnancement. */
check("une position valable est rendue telle quelle", pb.selValue(mf, "1,6 kHz") === "1,6 kHz");
check("une valeur inconnue retombe sur le défaut", pb.selValue(mf, 2) === "800 Hz",
  pb.selValue(mf, 2));
check("et sur la première position si le défaut est absent lui aussi",
  pb.selValue({ opts: ["a", "b"], d: "zz" }, "yy") === "a",
  pb.selValue({ opts: ["a", "b"], d: "zz" }, "yy"));
check("des positions écrites d'un trait sont acceptées",
  pb.selOpts({ opts: "Manche, Les deux ,Chevalet" }).join("/") === "Manche/Les deux/Chevalet",
  pb.selOpts({ opts: "Manche, Les deux ,Chevalet" }).join("/"));
check("un sélecteur sans position ne casse rien",
  pb.selOpts({}).length === 0 && pb.selValue({}, "x") === "");

/* Les valeurs par défaut : un nom, jamais zéro. */
const hh = pb.applyGearDefaults({ kind: "bass", gear: "bassHHsel" });
check("un sélecteur part de sa position par défaut", hh.pickups === "Les deux", String(hh.pickups));

/* --- les deux façades génériques à deux micros --- */
check("une façade à sélecteur est livrée", !!pb.GEAR.bassHHsel);
check("une façade à balance aussi, pour les modèles qui dosent",
  !!pb.GEAR.bassHHbal
  && pb.GEAR.bassHHbal.controls.some((c) => c.t === "balance"));
check("la façade à sélecteur propose les trois positions attendues",
  pb.selOpts(pb.GEAR.bassHHsel.controls.filter((c) => c.t === "select")[0]).join("/")
    === "Manche/Les deux/Chevalet");

/* --- l'affichage --- */
const carte = run(path.join(__dirname, "..", "public", "index.html"),
  { search: "?q=Rock 70s au SVT" });
const etiquettes = (carte.__nodes.get("list").innerHTML.match(/<span class="tag[^>]*>[^<]*</g) || [])
  .map((x) => x.replace(/<[^>]*>?/g, ""));
check("un sélecteur se lit en étiquette, pas en cadran",
  etiquettes.some((x) => x.indexOf("Mid Freq") === 0), etiquettes.join(" | "));
check("l'étiquette porte le nom de la position",
  etiquettes.some((x) => /Mid Freq 450 Hz/.test(x)), etiquettes.join(" | "));

/* --- l'éditeur d'une fiche --- */
const ed = run(path.join(__dirname, "..", "public", "index.html"), { search: "" });
ed.__pb.openEditor({ kind: "bass", gear: "bassHHsel", name: "essai", tags: [] }, true);
const corpsEd = ed.__nodes.get("veil").innerHTML;
check("l'éditeur offre un menu déroulant et non un curseur",
  corpsEd.indexOf('data-sel="pickups"') > 0 && corpsEd.indexOf('data-sl="pickups"') < 0,
  corpsEd.slice(corpsEd.indexOf("pickups") - 60, corpsEd.indexOf("pickups") + 60));
check("les trois positions y sont",
  /Manche<\/option>/.test(corpsEd) && /Chevalet<\/option>/.test(corpsEd));

/* --- créer une façade sans quitter la fiche --- */
check("l'éditeur propose de dupliquer la façade affichée",
  corpsEd.indexOf("data-gdupid=") > 0, "sinon il faut sortir vers l'écran Matériel");
check("et d'en créer une neuve", corpsEd.indexOf('data-gnewfrom="bass"') > 0);

const srcG = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
check("le retour vers la fiche est mémorisé avant de basculer",
  /retourFiche = \{draft: draft, isNew: isNew\}/.test(srcG),
  "sans cela, on décrit sa basse et on perd la fiche de vue");
check("enregistrer la façade y ramène, avec la nouvelle choisie",
  /fiche\.gear = neuve/.test(srcG) && /openEditor\(fiche, frais\)/.test(srcG));
check("fermer sans enregistrer oublie le retour",
  /retourFiche = null; openGearList\(\)/.test(srcG));

/* --- compatibilité : une fiche sans matériel garde celui d'origine --- */
check("fiche basse sans matériel → BB734A", pb.gearOf({ kind: "bass" }) === pb.GEAR.bb734a);
check("fiche ampli sans matériel → Rumble 40", pb.gearOf({ kind: "amp" }) === pb.GEAR.rumble40);
check("matériel inconnu → repli sur le défaut",
  pb.gearOf({ kind: "amp", gear: "nexistepas" }) === pb.GEAR.rumble40);

/* --- valeurs par défaut d'un matériel --- */
const neuf = pb.applyGearDefaults({ kind: "amp", gear: "amp3", eq: {} });
check("les commandes d'un ampli 3 bandes sont remplies",
  neuf.gain === 5.5 && neuf.eq.b === 5.5 && neuf.eq.m === 5.5 && neuf.eq.tr === 5.5,
  JSON.stringify(neuf));
check("pas de mode sur un matériel qui n'en a pas", neuf.mode === undefined, String(neuf.mode));

const bb = pb.applyGearDefaults({ kind: "bass", gear: "bb734a", eq: {} });
check("mode par défaut de la BB", bb.mode === "actif", String(bb.mode));
check("balance centrée par défaut", bb.balance === 50, String(bb.balance));

/* --- changer de matériel conserve ce qui est commun --- */
const migre = { kind: "amp", gear: "rumble40", gain: 7, eq: { b: 8, lm: 4, hm: 6, tr: 6 },
                bright: true, od: { on: true, drive: 6, level: 5 } };
migre.gear = "amp3";
pb.applyGearDefaults(migre);
check("le gain suit le changement d'ampli", migre.gain === 7, String(migre.gain));
check("les bandes communes sont conservées", migre.eq.b === 8 && migre.eq.tr === 6,
  JSON.stringify(migre.eq));
check("la bande absente du nouvel ampli est créée", migre.eq.m === 5.5, String(migre.eq.m));
check("les anciennes valeurs ne sont pas effacées", migre.eq.hm === 6, String(migre.eq.hm));

/* --- commandes hors circuit --- */
const passif = { kind: "bass", gear: "bb734a", mode: "passif", eq: { b: 2, m: 0, t: 1 } };
const cb = pb.findCtrl(passif, "eq.b"), ct = pb.findCtrl(passif, "eq.t");
check("Bass hors circuit en passif", pb.ctrlOff(pb.GEAR.bb734a, passif, cb) === true);
check("la tonalité reste active en passif", pb.ctrlOff(pb.GEAR.bb734a, passif, ct) === false);

const odOff = { kind: "amp", gear: "rumble40", od: { on: false, drive: 5, level: 5 } };
const cd = pb.findCtrl(odOff, "od.drive");
check("Drive inactif si l'overdrive est relâché",
  pb.ctrlOff(pb.GEAR.rumble40, odOff, cd) === true);

/* --- formats d'affichage selon le type de commande --- */
check("un cadran cranté s'affiche en heures", pb.ctrlText({ t: "clock" }, 2) === "14 h",
  pb.ctrlText({ t: "clock" }, 2));
check("une échelle garde ses décimales",
  pb.ctrlText({ t: "scale", step: 0.5 }, 6.5) === "6,5", pb.ctrlText({ t: "scale", step: 0.5 }, 6.5));
check("un interrupteur s'affiche ON/OFF", pb.ctrlText({ t: "switch" }, true) === "ON");
check("une balance s'affiche en pourcentage",
  pb.ctrlText({ t: "balance" }, 55) === "P 45 / J 55", pb.ctrlText({ t: "balance" }, 55));

/* --- angle du repère : bornes et milieu --- */
check("minimum d'une échelle à gauche",
  pb.ctrlAngle({ t: "scale", min: 1, max: 10 }, 1) === "-150deg",
  pb.ctrlAngle({ t: "scale", min: 1, max: 10 }, 1));
check("maximum d'une échelle à droite",
  pb.ctrlAngle({ t: "scale", min: 1, max: 10 }, 10) === "150deg",
  pb.ctrlAngle({ t: "scale", min: 1, max: 10 }, 10));
check("cran central d'un cadran cranté", pb.ctrlAngle({ t: "clock" }, 0) === "0deg");

console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
process.exit(failed ? 1 : 0);
