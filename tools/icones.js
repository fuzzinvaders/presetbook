#!/usr/bin/env node
/**
 * Fabrique les PNG d'installation à partir de public/icone.svg.
 * Copyright (C) 2026 fuzzinvaders
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 *   node tools/icones.js
 *
 * Le SVG est la source ; les PNG n'existent que parce que le manifeste et iOS
 * les réclament. Les refaire après avoir touché au dessin.
 */
"use strict";
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const RACINE = path.join(__dirname, "..");
const PUBLIC = path.join(RACINE, "public");
const SVG = path.join(PUBLIC, "icone.svg");

const CANDIDATS = [
  process.env.NAVIGATEUR,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome",
].filter(Boolean);

const TAILLES = [180, 192, 512];

const navigateur = CANDIDATS.find((c) => fs.existsSync(c));
if (!navigateur) { console.error("Aucun navigateur trouvé. NAVIGATEUR=… pour l'indiquer."); process.exit(1); }
if (!fs.existsSync(SVG)) { console.error("public/icone.svg est introuvable."); process.exit(1); }

const svg = fs.readFileSync(SVG, "utf8");
let rates = 0;

TAILLES.forEach(function (taille) {
  /* Une page sans marge, à la taille exacte : la capture est le PNG voulu. */
  const html = "<meta charset=\"utf-8\"><style>html,body{margin:0;padding:0;background:transparent}" +
    "svg{display:block;width:" + taille + "px;height:" + taille + "px}</style>" + svg;
  const page = path.join(os.tmpdir(), "presetbook-icone-" + taille + ".html");
  fs.writeFileSync(page, html, "utf8");

  const sortie = path.join(PUBLIC, "icone-" + taille + ".png");
  try {
    execFileSync(navigateur, [
      "--headless=new", "--disable-gpu", "--hide-scrollbars",
      "--default-background-color=00000000",     /* fond transparent, pas blanc */
      "--window-size=" + taille + "," + taille,
      "--screenshot=" + sortie,
      "file:///" + page.replace(/\\/g, "/"),
    ], { stdio: "pipe", timeout: 60000 });
  } catch (e) { /* ces navigateurs parlent sur stderr même quand tout va bien */ }

  if (!fs.existsSync(sortie)) { rates++; console.log("  ÉCHEC     icone-" + taille + ".png"); return; }
  console.log("  " + String(fs.statSync(sortie).size).padStart(6) + " o  icone-" + taille + ".png");
});

process.exit(rates ? 1 : 0);
