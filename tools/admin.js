#!/usr/bin/env node
/**
 * Voir et déplacer le rôle d'administrateur.
 * Copyright (C) 2026 fuzzinvaders
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 *   DATA_DIR=/srv/presetbook-data node tools/admin.js              → l'état des comptes
 *   DATA_DIR=/srv/presetbook-data node tools/admin.js <identifiant> → lui donner le rôle
 *
 * Le rôle revient normalement au premier compte créé, et le serveur le pose
 * tout seul au démarrage. Cet outil sert quand ce n'est pas le bon compte :
 * une date de création manquante, un compte importé, un ordre inattendu dans
 * le fichier. Il affiche ce qu'il voit avant de rien changer, parce qu'un
 * diagnostic vaut mieux qu'une correction à l'aveugle.
 *
 * Le droit vient de l'accès à la machine : il n'y a pas d'écran pour cela, et
 * c'est voulu — sans quoi un administrateur pourrait s'en désigner un autre à
 * l'insu du propriétaire du serveur.
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const cible = process.argv[2];

let db;
try { db = JSON.parse(fs.readFileSync(USERS_FILE, "utf8")); }
catch {
  console.error("Aucun fichier de comptes lisible : " + USERS_FILE);
  console.error("DATA_DIR pointe-t-il bien sur le dossier de données du serveur ?");
  process.exit(1);
}
if (!db || !Array.isArray(db.users) || !db.users.length) {
  console.error("Aucun compte dans " + USERS_FILE);
  process.exit(1);
}

function tableau() {
  const large = Math.max(12, ...db.users.map((u) => String(u.name).length));
  console.log("");
  console.log("  " + "compte".padEnd(large) + "  créé le                    rôle");
  console.log("  " + "-".repeat(large) + "  -------------------------  ----------------");
  db.users.forEach((u) => {
    console.log("  " + String(u.name).padEnd(large) + "  " +
      String(u.created || "(aucune date)").padEnd(25) + "  " +
      (u.admin === true ? "ADMINISTRATEUR" : ""));
  });
  console.log("");
}

if (!cible) {
  tableau();
  const admins = db.users.filter((u) => u.admin === true);
  if (admins.length === 1) console.log("Administrateur : « " + admins[0].name + " »");
  else if (!admins.length) console.log("Aucun administrateur — le serveur en désignera un au prochain démarrage.");
  else console.log("Plusieurs administrateurs : " + admins.map((u) => u.name).join(", "));
  const sansDate = db.users.filter((u) => !u.created);
  if (sansDate.length) {
    console.log("\nAttention : " + sansDate.length + " compte(s) sans date de création (" +
      sansDate.map((u) => u.name).join(", ") + ").");
    console.log("Le plus ancien se détermine alors par l'ordre du fichier, ce qui explique");
    console.log("qu'un autre compte ait pu recevoir le rôle.");
  }
  console.log("\nPour le déplacer : node tools/admin.js <identifiant>");
  process.exit(0);
}

const user = db.users.find((u) => u.name.toLowerCase() === String(cible).trim().toLowerCase());
if (!user) {
  console.error("Compte introuvable : « " + cible + " »");
  tableau();
  process.exit(1);
}

const avant = db.users.filter((u) => u.admin === true).map((u) => u.name);
db.users.forEach((u) => { delete u.admin; });   /* un seul administrateur à la fois */
user.admin = true;

const tmp = USERS_FILE + "." + process.pid + ".tmp";
fs.writeFileSync(tmp, JSON.stringify(db, null, 1), "utf8");
fs.renameSync(tmp, USERS_FILE);

tableau();
console.log("Administrateur : « " + user.name + " »" +
  (avant.length ? "  (retiré à : " + avant.join(", ") + ")" : ""));
console.log("\nLe serveur relit les comptes à chaque requête : c'est déjà actif.");
console.log("Recharge la page pour que l'interface s'en aperçoive.");
