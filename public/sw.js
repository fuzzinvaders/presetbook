/**
 * Presetbook — service worker.
 * Copyright (C) 2026 fuzzinvaders
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Il n'existe que pour deux choses : rendre l'application installable, et la
 * laisser s'ouvrir sans réseau.
 *
 * Stratégie : le réseau d'abord, le cache seulement s'il ne répond pas.
 *
 * C'est délibérément l'inverse du réflexe habituel. Un service worker qui sert
 * le cache en premier fait tourner une version périmée après chaque mise à
 * jour, sans que rien ne le signale — le pire défaut possible pour une page
 * qu'on met à jour souvent. Ici, en ligne, on voit toujours la version servie ;
 * hors ligne, on voit la dernière vue. Le cache est une copie de secours, pas
 * une source.
 *
 * Ce qui n'est jamais mis en cache : /api/ (l'état du compte et les fiches
 * doivent venir du serveur) et /healthz (il sert justement à savoir quelle
 * version tourne).
 */
"use strict";

const CACHE = "presetbook-v1";

/* Le strict nécessaire pour ouvrir l'application hors ligne. */
const SOCLE = ["./", "./rfxchain.js", "./manifest.webmanifest", "./icone.svg", "./icone-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SOCLE))
      .catch(() => {})          /* un socle incomplet vaut mieux qu'une installation ratée */
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((x) => x !== CACHE).map((x) => caches.delete(x))))
      .then(() => self.clients.claim())
  );
});

function horsCache(url) {
  return url.pathname.indexOf("/api/") >= 0 || url.pathname.indexOf("/healthz") >= 0;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   /* les polices et le tiers passent tout droit */
  if (horsCache(url)) return;

  e.respondWith(
    fetch(req)
      .then((rep) => {
        /* Une réponse opaque ou en erreur n'écrase pas une copie valable. */
        if (rep && rep.ok && rep.type === "basic") {
          const copie = rep.clone();
          caches.open(CACHE).then((c) => c.put(req, copie)).catch(() => {});
        }
        return rep;
      })
      .catch(() =>
        caches.match(req).then((hit) =>
          hit || (req.mode === "navigate" ? caches.match("./") : undefined) ||
          new Response("Hors ligne, et cette page n'est pas en cache.", {
            status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        )
      )
  );
});
