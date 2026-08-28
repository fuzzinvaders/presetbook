/**
 * La compression : ce qui part sur le fil, et ce qui doit rester intact.
 *   node test/compression.test.js
 */
"use strict";
const { spawn } = require("node:child_process");
const fsp = require("node:fs/promises");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const http = require("node:http");

let failed = 0;
function check(label, ok, detail) {
  if (ok) console.log("  ok    " + label);
  else { failed++; console.log("  ÉCHEC " + label + (detail ? " — " + detail : "")); }
}

const PORT = 8500 + (process.pid % 400);
const BASE = "http://127.0.0.1:" + PORT;
const RACINE = path.join(__dirname, "..");
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
let dossier = null, serveur = null;

/**
 * Requête HTTP sans intermédiaire. fetch() décompresse de lui-même : il ne
 * permet donc pas de voir ce qui passe réellement sur le fil, qui est
 * précisément ce qu'on vérifie ici.
 */
function brut(chemin, entetes) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port: PORT, path: chemin, method: (entetes || {})._method || "GET",
        headers: entetes || {} },
      (res) => {
        const morceaux = [];
        res.on("data", (c) => morceaux.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(morceaux);
          resolve({ code: res.statusCode, h: (k) => res.headers[k.toLowerCase()],
                    taille: buf.length, buf: buf });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

(async function () {
  console.log("Compression");
  dossier = await fsp.mkdtemp(path.join(os.tmpdir(), "presetbook-gz-"));
  try {
    serveur = spawn(process.execPath, [path.join(RACINE, "server.js")], {
      env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1", DATA_DIR: dossier },
      stdio: "ignore",
    });
    for (let i = 0; i < 60; i++) {
      try { await fetch(BASE + "/healthz"); break; } catch { await attendre(100); }
    }

    const source = await fsp.readFile(path.join(RACINE, "public", "index.html"));

    /* --- le client accepte gzip --- */
    const gz = await brut("/", { "Accept-Encoding": "gzip" });
    check("la page est compressée", gz.h("content-encoding") === "gzip", String(gz.h("content-encoding")));
    check("elle pèse nettement moins sur le fil", gz.taille < source.length * 0.5,
      gz.taille + " contre " + source.length);
    check("le Content-Length est celui du corps compressé",
      Number(gz.h("content-length")) === gz.taille, gz.h("content-length") + " / " + gz.taille);
    check("décompressée, c'est bien la page servie",
      zlib.gunzipSync(gz.buf).equals(source), "le contenu diffère de public/index.html");
    check("Vary est posé, sinon un cache servirait du gzip à qui n'en veut pas",
      /accept-encoding/i.test(String(gz.h("vary"))), String(gz.h("vary")));

    /* --- le client ne l'accepte pas --- */
    const clair = await brut("/", { "Accept-Encoding": "identity" });
    check("sans gzip demandé, rien n'est compressé", !clair.h("content-encoding"),
      String(clair.h("content-encoding")));
    check("et la page arrive entière", clair.buf.equals(source), clair.taille + " octets");

    /* --- ce qui ne doit pas être touché --- */
    const png = await brut("/icone-512.png", { "Accept-Encoding": "gzip" });
    check("une image déjà compressée est laissée telle quelle", !png.h("content-encoding"),
      String(png.h("content-encoding")));
    check("et elle arrive intacte",
      png.buf.equals(fs.readFileSync(path.join(RACINE, "public", "icone-512.png"))));

    const petit = await brut("/api/session", { "Accept-Encoding": "gzip" });
    check("une réponse minuscule n'est pas compressée pour rien", !petit.h("content-encoding"),
      petit.taille + " octets");

    /* --- les requêtes conditionnelles connaissent les deux formes --- */
    const etagGz = gz.h("etag");
    check("l'ETag distingue la forme compressée", /-gz"$/.test(String(etagGz)), String(etagGz));
    const encore = await brut("/", { "Accept-Encoding": "gzip", "If-None-Match": etagGz });
    check("le même ETag renvoie 304", encore.code === 304, String(encore.code));
    const clairEtag = clair.h("etag");
    const encore2 = await brut("/", { "Accept-Encoding": "identity", "If-None-Match": clairEtag });
    check("l'ETag en clair aussi", encore2.code === 304, String(encore2.code));

    /* --- HEAD annonce la même chose que GET --- */
    const tete = await brut("/", { "Accept-Encoding": "gzip", _method: "HEAD" });
    check("HEAD annonce la taille compressée",
      Number(tete.h("content-length")) === gz.taille,
      tete.h("content-length") + " / " + gz.taille);
    check("et n envoie pas de corps", tete.taille === 0, String(tete.taille));

    /* --- le service worker reste exploitable --- */
    const sw = await brut("/sw.js", { "Accept-Encoding": "gzip" });
    check("le service worker passe aussi par gzip", sw.h("content-encoding") === "gzip");
    check("et se relit correctement",
      zlib.gunzipSync(sw.buf).toString("utf8").indexOf("presetbook-v1") > 0);
  } catch (err) {
    failed++;
    console.log("  ÉCHEC exécution — " + err.message);
  } finally {
    if (serveur) { serveur.kill(); await attendre(300); }
    if (dossier) await fsp.rm(dossier, { recursive: true, force: true }).catch(() => {});
  }

  console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
  process.exit(failed ? 1 : 0);
})();
