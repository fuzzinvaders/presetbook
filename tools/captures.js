#!/usr/bin/env node
/**
 * Refait les captures d'écran du README, à partir de l'application elle-même.
 * Copyright (C) 2026 fuzzinvaders
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 *   node tools/captures.js
 *   NAVIGATEUR="/usr/bin/chromium" node tools/captures.js
 *
 * Les vues sont atteintes par les paramètres d'URL que l'application comprend
 * déjà — c'est ce qui rend ces captures reproductibles sans piloter de souris.
 * L'écran de connexion, lui, demande un serveur : voir plus bas.
 */
"use strict";
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const RACINE = path.join(__dirname, "..");
const SORTIE = path.join(RACINE, "docs", "images");
const PAGE = "file:///" + path.join(RACINE, "public", "index.html").replace(/\\/g, "/");

/* Les navigateurs les plus probables, dans l'ordre. NAVIGATEUR passe devant. */
const CANDIDATS = [
  process.env.NAVIGATEUR,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
].filter(Boolean);

const VUES = [
  { nom: "par-morceau", url: "?group=song&q=all%20star", taille: "1280,880" },
  { nom: "basse",       url: "?kind=bass",               taille: "1280,760" },
  { nom: "pedalier",    url: "?kind=board",              taille: "1280,760" },
  { nom: "chaine",      url: "?edit=r-allstar",          taille: "1280,900" },
  { nom: "filtres",     url: "?kind=amp&gear=lionheart20&tag=blues", taille: "1280,700" },
  { nom: "anglais",     url: "?lang=en&kind=amp",        taille: "1280,760" },
  /* La feuille imprimée : la même page, avec la règle @media print rendue à
     l'écran sur une copie jetable. La largeur est celle d'une A4 moins ses
     marges (186 mm à 96 ppp), donc c'est bien la mise en page qui sortira. */
  { nom: "impression",  url: "?gear=lionheart20", taille: "703,980", print: true },
];

const navigateur = CANDIDATS.find((c) => fs.existsSync(c));
if (!navigateur) {
  console.error("Aucun navigateur trouvé. Indiquer le chemin avec NAVIGATEUR=…");
  console.error("Cherché : " + CANDIDATS.join(", "));
  process.exit(1);
}
console.log("navigateur : " + navigateur);
fs.mkdirSync(SORTIE, { recursive: true });

/* Pour la feuille imprimée : une copie où @media print devient @media screen,
   seule façon de photographier une mise en page qui n'existe qu'au papier. */
let copiePrint = null;
function pageDe(v) {
  if (!v.print) return PAGE;
  if (!copiePrint) {
    const src = fs.readFileSync(path.join(RACINE, "public", "index.html"), "utf8");
    if (src.indexOf("@media print{") < 0) throw new Error("aucune règle @media print à rendre");
    copiePrint = path.join(os.tmpdir(), "presetbook-apercu-impression.html");
    fs.writeFileSync(copiePrint, src.replace("@media print{", "@media screen{"), "utf8");
  }
  return "file:///" + copiePrint.replace(/\\/g, "/");
}

let rates = 0;
VUES.forEach(function (v) {
  const fichier = path.join(SORTIE, v.nom + ".png");
  const avant = fs.existsSync(fichier) ? fs.statSync(fichier).size : 0;
  try {
    execFileSync(navigateur, [
      "--headless=new", "--disable-gpu", "--hide-scrollbars",
      "--virtual-time-budget=5000",          /* laisse les polices et le widget arriver */
      "--window-size=" + v.taille,
      "--screenshot=" + fichier,
      pageDe(v) + v.url,
    ], { stdio: "pipe", timeout: 90000 });
  } catch (e) { /* ces navigateurs écrivent sur stderr même quand tout va bien */ }

  if (!fs.existsSync(fichier)) { rates++; console.log("  ÉCHEC     " + v.nom); return; }
  const apres = fs.statSync(fichier).size;
  console.log("  " + String(apres).padStart(7) + " o  " + v.nom +
              (avant && avant !== apres ? "  (modifiée)" : avant ? "  (inchangée)" : "  (nouvelle)"));
});

console.log(
  "\nconnexion.png n'est pas refaite ici : elle demande un serveur avec un compte\n" +
  "et DEMO_LOGIN. Pour la refaire :\n" +
  "  DATA_DIR=/tmp/pb DEMO_LOGIN=demo:demo PORT=8094 node server.js &\n" +
  "  curl -s -X POST localhost:8094/api/register -H 'Content-Type: application/json' \\\n" +
  "       -d '{\"name\":\"presetbook\",\"password\":\"un-mot-de-passe-jetable\"}'\n" +
  "  <navigateur> --headless=new --window-size=1280,700 \\\n" +
  "       --screenshot=docs/images/connexion.png http://localhost:8094/"
);
process.exit(rates ? 1 : 0);
