#!/usr/bin/env node
/**
 * Redonne un mot de passe à un compte, depuis la machine qui héberge.
 * Copyright (C) 2026 fuzzinvaders
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 *   DATA_DIR=/srv/presetbook-data node tools/motdepasse.js <identifiant>
 *   DATA_DIR=/srv/presetbook-data node tools/motdepasse.js <identifiant> <motdepasse>
 *
 * Sans mot de passe en argument, il en tire un au hasard et l'affiche : c'est
 * la façon la plus sûre, puisque rien ne passe par l'historique du shell.
 *
 * Pourquoi un outil en ligne de commande plutôt qu'un écran ? Parce que
 * Presetbook n'a pas d'administrateur : tout utilisateur connecté peut ouvrir
 * un compte, donc lui donner en plus le droit de changer le mot de passe d'un
 * autre reviendrait à lui donner tous les comptes. Ici, le droit vient de
 * l'accès à la machine, ce qui est le bon niveau.
 *
 * Les sessions ouvertes du compte sont fermées : sinon un mot de passe changé
 * n'aurait chassé personne.
 */
"use strict";
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
const PW_MIN = 10;

const nom = process.argv[2];
const donne = process.argv[3];

if (!nom) {
  console.error("Usage : DATA_DIR=… node tools/motdepasse.js <identifiant> [motdepasse]");
  console.error("Sans mot de passe, il en tire un au hasard.");
  process.exit(2);
}

function lire(f, repli) {
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return repli; }
}

function ecrire(f, obj) {
  const tmp = f + "." + process.pid + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 1), "utf8");
  fs.renameSync(tmp, f);
}

/* Lisible à l'oral et à recopier : pas de I/l/O/0 qui se confondent. */
function tirerMotDePasse() {
  const lettres = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 16; i++) out += lettres[crypto.randomInt(lettres.length)];
  return out.slice(0, 4) + "-" + out.slice(4, 8) + "-" + out.slice(8, 12) + "-" + out.slice(12);
}

const db = lire(USERS_FILE, null);
if (!db || !Array.isArray(db.users)) {
  console.error("Aucun fichier de comptes lisible dans " + DATA_DIR);
  console.error("DATA_DIR pointe-t-il bien sur le dossier de données du serveur ?");
  process.exit(1);
}

const user = db.users.find((u) => u.name.toLowerCase() === String(nom).trim().toLowerCase());
if (!user) {
  console.error("Compte introuvable : « " + nom + " »");
  console.error("Comptes existants : " + db.users.map((u) => u.name).join(", "));
  process.exit(1);
}

const motDePasse = donne || tirerMotDePasse();
if (motDePasse.length < PW_MIN) {
  console.error("Mot de passe : au moins " + PW_MIN + " caractères.");
  process.exit(2);
}

const salt = crypto.randomBytes(16);
const key = crypto.scryptSync(motDePasse, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
user.salt = salt.toString("hex");
user.hash = key.toString("hex");
user.params = { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, keylen: SCRYPT.keylen };
user.passwordChanged = new Date().toISOString();
ecrire(USERS_FILE, db);

/* Les sessions du compte tombent : le serveur les relit à son démarrage, et
   celles déjà en mémoire disparaîtront au prochain. */
const sess = lire(SESSIONS_FILE, {});
let fermees = 0;
Object.keys(sess).forEach((h) => {
  if (sess[h] && sess[h].userId === user.id) { delete sess[h]; fermees++; }
});
if (fermees) ecrire(SESSIONS_FILE, sess);

console.log("Compte     : " + user.name);
console.log("Mot de passe : " + motDePasse);
if (!donne) console.log("             (tiré au hasard — à transmettre, puis à changer depuis l'application)");
console.log("Sessions fermées : " + fermees);
console.log("\nRedémarrer le serveur pour que les sessions en mémoire tombent aussi :");
console.log("  docker compose -f docker-compose.traefik.yml restart presetbook");
