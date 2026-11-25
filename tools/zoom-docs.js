#!/usr/bin/env node
/**
 * Régénère, à partir du catalogue, la liste des effets du Zoom B2 FOUR et le
 * schéma JSON des fiches et des banques.
 * Copyright (C) 2026 fuzzinvaders
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 *   node tools/zoom-docs.js
 *
 * Les deux fichiers ne s'écrivent pas à la main : ils se déduisent de
 * public/zoom-b2four.js, qui est la seule source. test/zoom.test.js vérifie
 * qu'ils sont à jour — une liste qui dirait autre chose que le code serait
 * pire que pas de liste.
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const Z = require("../public/zoom-b2four.js");

const RACINE = path.join(__dirname, "..");
const LISTE = path.join(RACINE, "docs", "zoom-b2four-effets.md");
const SCHEMA = path.join(RACINE, "docs", "zoom-b2four.schema.json");

function plage(def) {
  if (def.opts) return def.opts.join(", ");
  if (def.t === "text") return def.doc + (def.motif ? " (motif " + def.motif + ")" : " (texte, bornes seules publiées)");
  let s = Z.fmtValue(def, def.min) + " – " + Z.fmtValue(def, def.max);
  if (def.off) s = "OFF, " + s;
  if (def.extra) s += ", " + def.extra.join(", ");
  if (def.skip) s += " (sauf " + def.skip.join(", ") + ")";
  return s;
}
function notes(def) {
  const n = [];
  if (def.u) n.push("unité : " + def.u);
  if (def.step && def.step !== 1) n.push("pas : " + String(def.step).replace(".", ","));
  if (def.u === "Hz") n.push("pas non publié");
  if (def.pedal) n.push("pédale d'expression (P)");
  if (def.inactif) n.push("sans effet si " + def.inactif.k + " = " + def.inactif.v.join(" ou "));
  if (def.sync) n.push("en " + def.sync.k + " = " + def.sync.v + ", suit le tempo (valeur de note)");
  return n.join(" ; ");
}

function liste() {
  const l = [];
  l.push("# Zoom B2 FOUR — effets et paramètres pris en charge");
  l.push("");
  l.push("Document généré par `node tools/zoom-docs.js` à partir de `public/zoom-b2four.js`. Ne pas modifier à la main.");
  l.push("");
  l.push("Source : *B2 FOUR Effect Types and Parameters* (ZOOM, ©2023, réf. Z2I-4875-01). Noms, paramètres et plages");
  l.push("sont ceux du document ; ses descriptions ne sont pas reproduites. Aucune valeur par défaut n'y figure, donc aucune");
  l.push("n'est stockée. Les fréquences sont enregistrées en Hz ; seules leurs bornes sont publiées.");
  l.push("");
  const total = Z.ORDER.length;
  const params = Z.ORDER.reduce((a, n) => a + Z.FX[n].params.length, 0);
  l.push("**" + total + " effets, " + params + " paramètres, " + Z.CATEGORIES.length + " catégories.**");
  l.push("");
  l.push("| Catégorie Zoom | Libellé | Famille | Effets |");
  l.push("| --- | --- | --- | --- |");
  Z.CATEGORIES.forEach((c) => {
    l.push("| " + c.id + " | " + c.l + " | " + c.groupe + " | " + Z.ORDER.filter((n) => Z.FX[n].cat === c.id).length + " |");
  });
  l.push("");
  l.push("Règles : 5 effets au plus par patch ; un seul effet de la catégorie BASS AMP et un seul de la catégorie PEDAL.");
  l.push("Le baffle est compris dans chaque modèle BASS AMP : le B2 FOUR n'en propose pas à part. Le DI MODEL");
  l.push("(" + Z.DI_MODELS.join(", ") + ") est un réglage global de l'appareil, enregistré au niveau de la banque.");
  Z.CATEGORIES.forEach((c) => {
    l.push("");
    l.push("## " + c.id + " — " + c.l);
    Z.ORDER.filter((n) => Z.FX[n].cat === c.id).forEach((n) => {
      const d = Z.FX[n];
      l.push("");
      l.push("### " + n);
      l.push("");
      if (!d.params.length) { l.push("Aucun paramètre."); return; }
      l.push("| Paramètre | Valeurs | Remarques |");
      l.push("| --- | --- | --- |");
      d.params.forEach((p) => l.push("| " + p.k + " | " + plage(p) + " | " + notes(p) + " |"));
    });
  });
  return l.join("\n") + "\n";
}

/* ------------------------------------------------------------- le schéma */

function valeur(def) {
  let s;
  if (def.opts) s = { enum: def.opts.slice() };
  else if (def.t === "text") s = def.motif ? { type: "string", pattern: def.motif } : { type: "string" };
  else {
    const nombre = { type: "number", minimum: def.min, maximum: def.max };
    if (def.skip) nombre.not = { enum: def.skip.slice() };
    const choix = [nombre];
    if (def.off) choix.push({ const: "OFF" });
    if (def.extra) choix.push({ enum: def.extra.slice() });
    if (def.sync) choix.push({ type: "string", description: "valeur de note quand " + def.sync.k + " = " + def.sync.v });
    s = choix.length > 1 ? { anyOf: choix } : nombre;
  }
  return s;
}

function schema() {
  const amplis = Z.ORDER.filter((n) => Z.FX[n].cat === "BASS AMP");
  const pedales = Z.ORDER.filter((n) => Z.FX[n].cat === "PEDAL");
  const parEffet = Z.ORDER.map((n) => {
    const props = {};
    Z.FX[n].params.forEach((d) => { props[d.k] = valeur(d); });
    return { if: { properties: { fx: { const: n } } }, then: { properties: { p: { type: "object", properties: props } } } };
  });
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://github.com/fuzzinvaders/presetbook/docs/zoom-b2four.schema.json",
    title: "Presetbook — fiche ou banque Zoom B2 FOUR",
    description: "Format d'échange de Presetbook décrivant des patchs du Zoom B2 FOUR. Ce n'est pas un fichier que " +
      "l'appareil peut charger. Généré par tools/zoom-docs.js depuis public/zoom-b2four.js (catalogue " + Z.CATALOG + "). " +
      "Le schéma décrit un fichier conforme ; l'import de Presetbook est plus tolérant : il refuse les erreurs de " +
      "structure et signale le reste (paramètre inconnu, valeur hors plage) sans perdre la valeur.",
    oneOf: [{ $ref: "#/$defs/enveloppeFiche" }, { $ref: "#/$defs/enveloppeBanque" }],
    $defs: {
      enveloppeFiche: {
        type: "object", required: ["v", "presetbook", "preset"],
        properties: {
          v: { const: Z.FORMAT }, presetbook: { const: "preset" },
          preset: { $ref: "#/$defs/fiche" },
          gear: { type: "object", description: "Façades personnelles dont la fiche a besoin (une basse dessinée dans Presetbook)." }
        }
      },
      enveloppeBanque: {
        type: "object", required: ["v", "presetbook", "device", "presets"],
        properties: {
          v: { type: "integer", minimum: 1, maximum: Z.FORMAT, description: "Version du format. Plus récente que celle connue : refusée." },
          presetbook: { const: "bank" },
          device: { const: Z.DEVICE },
          catalog: { type: "string", description: "Catalogue d'effets utilisé. Différent de " + Z.CATALOG + " : avertissement." },
          name: { type: "string" },
          config: {
            type: "object",
            properties: { di: { anyOf: [{ enum: Z.DI_MODELS.slice() }, { type: "null" }],
              description: "DI MODEL : réglage global de l'appareil, pas d'un patch." } }
          },
          presets: { type: "array", items: { $ref: "#/$defs/fiche" } },
          gear: { type: "object" }
        }
      },
      fiche: {
        type: "object", required: ["kind", "name", "chain"],
        properties: {
          id: { type: "string" },
          kind: { enum: ["multi", "zoom"], description: "« multi » (Multi-effet) depuis la 1.16 ; « zoom » pour les fiches 1.14 et 1.15, converties à l'import." },
          gear: { const: "b2four" },
          catalog: { type: "string" },
          name: { type: "string", minLength: 1 },
          patchName: { type: "string", pattern: Z.LIMITS.nameChars.source,
            description: "Nom sur l'appareil. Aucune longueur publiée ; les noms d'usine font " + Z.LIMITS.nameObserved + " caractères au plus." },
          patch: { anyOf: [{ type: "integer", minimum: Z.LIMITS.patchMin, maximum: Z.LIMITS.patchMax }, { type: "null" }],
            description: "Numéro de mémoire, 1 à 300 (affiché 001 à 300). Les patchs d'usine occupent 001 à " + Z.LIMITS.factoryMax + "." },
          tempo: { anyOf: [{ type: "number", minimum: Z.LIMITS.tempoMin, maximum: Z.LIMITS.tempoMax }, { type: "null" }] },
          family: { type: "string", description: "Famille sonore : Clean Rock, Indie Drive, Punk Attack… Un preset par famille, pas par morceau." },
          songs: { type: "array", description: "Les morceaux que ce preset sert.",
            items: { type: "object", required: ["title"],
              properties: { title: { type: "string", minLength: 1 }, artist: { type: "string" } } } },
          song: { type: "null", description: "Remplacé par « songs » ; une fiche 1.14 qui le porte est convertie à l'import." },
          tags: { type: "array", items: { type: "string" }, description: "Styles." },
          bass: { anyOf: [{ $ref: "#/$defs/basse" }, { type: "null" }] },
          chain: {
            type: "array", maxItems: Z.LIMITS.maxFx, items: { $ref: "#/$defs/bloc" },
            allOf: [
              { contains: { properties: { fx: { enum: amplis } } }, minContains: 0, maxContains: 1 },
              { contains: { properties: { fx: { enum: pedales } } }, minContains: 0, maxContains: 1 }
            ]
          },
          level: { type: "object", properties: {
            state: { enum: ["a-verifier", "equilibre"] }, note: { type: "string" } },
            description: "Niveau vérifié aux essais : il ne se calcule pas à partir des réglages." },
          variant: { type: "string", description: "Couplet, refrain, avec ou sans saturation…" },
          variantOf: { anyOf: [{ type: "string" }, { type: "null" }], description: "Identifiant de la fiche dont celle-ci est une variante." },
          notes: { type: "string" },
          maj: { type: "string", description: "Date de dernière modification (ISO 8601)." }
        }
      },
      basse: {
        type: "object", required: ["gear"],
        description: "La basse et ses réglages, avec les clés de sa façade dans Presetbook (pour la BB734A : mode, balance, eq.b, eq.m, eq.t).",
        properties: {
          gear: { type: "string" }, mode: { type: "string" },
          strings: { type: "string" }, gauge: { type: "string" },
          jeu: { enum: ["doigts", "médiator", ""] }, tech: { type: "string" }
        }
      },
      bloc: {
        type: "object", required: ["fx"],
        properties: { fx: { enum: Z.ORDER.slice() }, on: { type: "boolean" }, p: { type: "object" } },
        allOf: parEffet
      }
    }
  };
}

function tout() { return { liste: liste(), schema: JSON.stringify(schema(), null, 2) + "\n" }; }

if (require.main === module) {
  const g = tout();
  fs.writeFileSync(LISTE, g.liste);
  fs.writeFileSync(SCHEMA, g.schema);
  console.log("écrits : docs/zoom-b2four-effets.md, docs/zoom-b2four.schema.json");
}
module.exports = { tout: tout, LISTE: LISTE, SCHEMA: SCHEMA };
