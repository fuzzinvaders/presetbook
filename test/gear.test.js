/**
 * Registre de matériel : instruments et amplis interchangeables.
 *   node test/gear.test.js
 *
 * Le script de la page est exécuté dans un DOM minimal, puis on interroge la
 * couture de test window.__pb.
 */
"use strict";
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
