#!/usr/bin/env node
"use strict";

/**
 * Presetbook — serveur minimal, sans dépendance.
 * Copyright (C) 2026 fuzzinvaders
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Statique      : public/
 * Session       : GET /api/session, POST /api/register, /api/login, /api/logout, /api/password
 * Comptes       : GET /api/users, POST /api/account/delete — réservés ou restreints à l'admin
 * Presets       : GET/PUT /api/presets — propres à l'utilisateur connecté
 * Santé         : GET /healthz — jamais protégé
 *
 * Environnement : PORT, HOST, DATA_DIR, BASIC_AUTH, ALLOW_REGISTER, SESSION_DAYS, SECURE_COOKIES,
 *                 DEMO_LOGIN
 *
 * Les mots de passe ne sont jamais stockés : seule une dérivation scrypt l'est,
 * avec un sel propre à chaque compte. Les jetons de session ne sont pas stockés
 * non plus, seulement leur empreinte SHA-256.
 */

const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const zlib = require("node:zlib");

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const PRESETS_DIR = path.join(DATA_DIR, "presets");
const LEGACY_PRESETS = path.join(DATA_DIR, "presets.json");

const BASIC_AUTH = process.env.BASIC_AUTH || "";
const ALLOW_REGISTER = /^(1|true|oui|yes)$/i.test(process.env.ALLOW_REGISTER || "");
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 30);
const SECURE_COOKIES = /^(1|true|oui|yes)$/i.test(process.env.SECURE_COOKIES || "");

/* Compte de démonstration, « identifiant:motdepasse », vide pour le désactiver.
   Ses identifiants sont publics par construction, donc il est tenu à l'écart :
   il ne peut pas créer de compte, et ses fiches repartent de zéro à chaque
   démarrage. Il ne compte dans aucune règle de comptes non plus — sans quoi sa
   simple existence ferait croire au serveur qu'il a déjà un propriétaire. */
const DEMO_LOGIN = process.env.DEMO_LOGIN || "";
const DEMO_NAME = DEMO_LOGIN.split(":")[0] || "";
const DEMO_PASSWORD = DEMO_LOGIN.slice(DEMO_NAME.length + 1);
const DEMO_MAX_GRANTS = 20;

const MAX_BODY = 4 * 1024 * 1024;
const MAX_PRESETS = 5000;
const MAX_GEAR = 500;
const COOKIE = "pb_session";
const SESSION_MS = SESSION_DAYS * 86400000;
const PW_MIN = 10;
const PW_MAX = 200;
const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{1,39}$/u;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
const LOGIN_MAX_FAILS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/* Empreinte de la page servie : permet de vérifier d un coup d oeil quelle
   version tourne, sans avoir a fouiller le conteneur. */
const APP_FILE = path.join(PUBLIC_DIR, "index.html");
let appFingerprint = { sha: "?", bytes: 0, mtime: null };
try {
  const buf = fs.readFileSync(APP_FILE);
  appFingerprint = {
    sha: crypto.createHash("sha256").update(buf).digest("hex").slice(0, 12),
    bytes: buf.length,
    mtime: fs.statSync(APP_FILE).mtime.toISOString(),
  };
} catch {
  /* la page manque : /healthz le dira */
}

const EMPTY_STATE = { v: 1, custom: [], overrides: {}, gear: {}, hidden: [], updated: null };

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

/* ------------------------------------------------------------- compression */

/* Seuls les formats qui y gagnent. Un PNG ou un woff2 sont déjà compressés :
   les repasser en gzip coûte du temps pour grossir de quelques octets. */
const COMPRESSIBLE = /^(text\/|application\/(json|manifest\+json|javascript)|image\/svg)/;
const GZIP_MIN = 1400;          /* en dessous, l'en-tête coûte plus que le gain */
const GZIP_MAX_CACHE = 24;

/* Les fichiers statiques sont servis en boucle : on garde leur version
   compressée, indexée par leur ETag, pour ne pas refaire le travail à chaque
   requête — un Raspberry Pi n'a pas de souffle à perdre là-dessus. */
const gzipCache = new Map();

function acceptsGzip(req) {
  return /\bgzip\b/.test(String(req.headers["accept-encoding"] || ""));
}

function gzip(buf) {
  return new Promise((resolve, reject) =>
    zlib.gzip(buf, { level: zlib.constants.Z_DEFAULT_COMPRESSION }, (err, out) =>
      err ? reject(err) : resolve(out)
    )
  );
}

/** La version compressée d'un fichier, mémorisée tant que son ETag ne change pas. */
async function gzipCached(cle, buf) {
  const hit = gzipCache.get(cle);
  if (hit) return hit;
  const out = await gzip(buf);
  if (gzipCache.size >= GZIP_MAX_CACHE) gzipCache.delete(gzipCache.keys().next().value);
  gzipCache.set(cle, out);
  return out;
}

/* ---------------------------------------------------------------- réponses */

function send(res, code, body, headers = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body), "utf8");
  res.writeHead(code, { "Content-Length": buf.length, "X-Content-Type-Options": "nosniff", ...headers });
  res.end(buf);
}

/**
 * Comme send(), mais en gzip si le client l'accepte et si le type y gagne.
 *
 * « Vary: Accept-Encoding » n'est pas décoratif : sans lui, un intermédiaire
 * peut servir la réponse compressée à un client qui ne sait pas la lire.
 */
async function sendMaybeGzip(req, res, code, body, headers = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body), "utf8");
  const type = String(headers["Content-Type"] || "");
  if (!COMPRESSIBLE.test(type) || buf.length < GZIP_MIN || !acceptsGzip(req)) {
    return send(res, code, buf, { ...headers, Vary: "Accept-Encoding" });
  }
  let out;
  try { out = await gzip(buf); }
  catch { return send(res, code, buf, { ...headers, Vary: "Accept-Encoding" }); }
  return send(res, code, out, { ...headers, "Content-Encoding": "gzip", Vary: "Accept-Encoding" });
}

function sendJson(res, code, obj, headers = {}) {
  send(res, code, JSON.stringify(obj), {
    "Content-Type": MIME[".json"],
    "Cache-Control": "no-store",
    ...headers,
  });
}

/** Une bibliothèque de presets pèse vite : elle voyage compressée. */
function sendJsonGz(req, res, code, obj, headers = {}) {
  return sendMaybeGzip(req, res, code, JSON.stringify(obj), {
    "Content-Type": MIME[".json"],
    "Cache-Control": "no-store",
    ...headers,
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error("body too large"), { tooLarge: true }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function readJsonBody(req) {
  const raw = await readBody(req);
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new SyntaxError("objet attendu");
  return parsed;
}

/* -------------------------------------------------------- lecture/écriture */

async function readJsonFile(file, fallback) {
  try {
    return JSON.parse(await fsp.readFile(file, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    if (err instanceof SyntaxError) {
      const bak = file.replace(/\.json$/, ".bak.json");
      console.error(`[presetbook] ${file} illisible, reprise de ${bak}`);
      try {
        return JSON.parse(await fsp.readFile(bak, "utf8"));
      } catch {
        return fallback;
      }
    }
    throw err;
  }
}

async function writeJsonFile(file, obj) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  try {
    await fsp.copyFile(file, file.replace(/\.json$/, ".bak.json"));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  const tmp = `${file}.${process.pid}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(obj, null, 1), "utf8");
  await fsp.rename(tmp, file);
}

/* --------------------------------------------------------------- comptes */

function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p }, (err, key) =>
      err ? reject(err) : resolve(key)
    );
  });
}

async function readUsers() {
  const db = await readJsonFile(USERS_FILE, { v: 1, users: [] });
  return Array.isArray(db.users) ? db : { v: 1, users: [] };
}

/** Le compte de démonstration, reconnu par son nom. */
function isDemo(user) {
  return !!DEMO_NAME && !!user && String(user.name).toLowerCase() === DEMO_NAME.toLowerCase();
}

/** Les vrais comptes : ceux qui décident si le serveur a un propriétaire. */
function realUsers(db) {
  return db.users.filter((u) => !isDemo(u));
}

/**
 * L'administrateur est le premier compte créé sur l'instance, et le drapeau est
 * écrit dans le fichier plutôt que déduit à chaque lecture : déduire de l'ordre
 * du tableau rendrait le droit dépendant d'un détail de stockage, et une
 * suppression pourrait le déplacer sans qu'on l'ait voulu.
 */
function isAdmin(user) {
  return !!user && user.admin === true;
}

/** Le plus ancien des vrais comptes. Le tableau est en ordre de création, mais
    on s'appuie d'abord sur la date, qui ne dépend pas de l'ordre du fichier. */
function premierCompte(db) {
  const vrais = realUsers(db);
  if (!vrais.length) return null;
  return vrais.slice().sort((a, b) =>
    String(a.created || "").localeCompare(String(b.created || "")) ||
    db.users.indexOf(a) - db.users.indexOf(b))[0];
}

/**
 * Les instances existantes n'ont pas de drapeau : on le pose une fois, sur le
 * plus ancien compte. Sans cette reprise, une mise à jour laisserait un serveur
 * déjà peuplé sans aucun administrateur — donc sans personne pour ouvrir un
 * compte.
 */
async function ensureAdmin() {
  const db = await readUsers();
  if (!db.users.length) return null;
  const dejaLa = db.users.find((u) => u.admin === true && !isDemo(u));
  if (dejaLa) return dejaLa;
  const premier = premierCompte(db);
  if (!premier) return null;
  premier.admin = true;
  await writeJsonFile(USERS_FILE, db);
  console.log(`[presetbook] administrateur : « ${premier.name} » (premier compte créé)`);
  return premier;
}

function findUser(db, name) {
  const wanted = String(name).trim().toLowerCase();
  return db.users.find((u) => u.name.toLowerCase() === wanted) || null;
}

async function createUser(db, name, password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt);
  const user = {
    id: crypto.randomUUID(),
    name: String(name).trim(),
    kdf: "scrypt",
    params: { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, keylen: SCRYPT.keylen },
    salt: salt.toString("hex"),
    hash: key.toString("hex"),
    created: new Date().toISOString(),
  };
  db.users.push(user);
  await writeJsonFile(USERS_FILE, db);
  return user;
}

/**
 * Changer son propre mot de passe, et seulement le sien.
 *
 * Personne ne peut changer celui d'un autre, même en étant connecté : ce
 * serveur n'a pas d'administrateur, et n'importe quel utilisateur pouvant
 * ouvrir un compte, ce droit-là reviendrait à pouvoir prendre le compte de
 * n'importe qui. Un mot de passe oublié se répare depuis la machine, avec
 * « npm run motdepasse ».
 */
async function handlePassword(req, res) {
  if (throttled(req)) {
    return sendJson(res, 429, { error: "Trop de tentatives. Réessaie dans un quart d'heure." });
  }
  const user = await currentUser(req);
  if (!user) return sendJson(res, 401, { error: "Connexion requise." });
  if (isDemo(user)) {
    /* Ses identifiants sont publics et affichés : les changer fermerait la
       porte à tout le monde jusqu'au prochain redémarrage. */
    return sendJson(res, 403, { error: "Le compte de démonstration garde son mot de passe." });
  }

  let body;
  try { body = await readJsonBody(req); }
  catch { return sendJson(res, 400, { error: "Requête invalide." }); }

  const actuel = String(body.current || "");
  const neuf = String(body.password || "");

  if (!(await passwordMatches(user, actuel))) {
    noteFailure(req);
    console.warn(`[presetbook] mot de passe actuel refusé pour « ${user.name} »`);
    return sendJson(res, 401, { error: "Mot de passe actuel incorrect." });
  }
  if (neuf.length < PW_MIN || neuf.length > PW_MAX) {
    return sendJson(res, 422, { error: `Mot de passe : au moins ${PW_MIN} caractères.` });
  }
  if (neuf === actuel) {
    return sendJson(res, 422, { error: "Le nouveau mot de passe est identique à l'ancien." });
  }

  const db = await readUsers();
  const cible = db.users.find((u) => u.id === user.id);
  if (!cible) return sendJson(res, 401, { error: "Connexion requise." });
  await setPassword(db, cible, neuf);
  fails.delete(clientIp(req));

  /* Les autres sessions tombent : un mot de passe qu'on change est souvent un
     mot de passe qu'on ne veut plus voir servir ailleurs. Celle-ci survit. */
  const fermees = dropSessions(user.id, tokenHash(cookieValue(req, COOKIE) || ""));
  console.log(`[presetbook] mot de passe changé : ${user.name}` +
              (fermees ? ` (${fermees} autre(s) session(s) fermée(s))` : ""));
  return sendJson(res, 200, { ok: true, closed: fermees });
}

/** Remplace la dérivation d'un compte. Le sel est refait : deux mots de passe
    successifs ne doivent pas partager le leur. */
async function setPassword(db, user, password) {
  const salt = crypto.randomBytes(16);
  user.salt = salt.toString("hex");
  user.hash = (await scrypt(password, salt)).toString("hex");
  user.params = { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, keylen: SCRYPT.keylen };
  user.passwordChanged = new Date().toISOString();
  await writeJsonFile(USERS_FILE, db);
}

/** Ferme toutes les sessions d'un compte, sauf éventuellement celle en cours. */
function dropSessions(userId, sauf) {
  let n = 0;
  for (const [h, s] of sessions) {
    if (s.userId === userId && h !== sauf) { sessions.delete(h); n++; }
  }
  if (n) flushSessions();
  return n;
}

async function passwordMatches(user, password) {
  const p = user.params || SCRYPT;
  const key = await new Promise((resolve, reject) => {
    crypto.scrypt(password, Buffer.from(user.salt, "hex"), p.keylen || 64, { N: p.N, r: p.r, p: p.p }, (err, k) =>
      err ? reject(err) : resolve(k)
    );
  });
  const stored = Buffer.from(user.hash, "hex");
  return key.length === stored.length && crypto.timingSafeEqual(key, stored);
}

/* -------------------------------------------------------------- sessions */

const sessions = new Map(); // sha256(token) -> {userId, created, seen}

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function loadSessions() {
  const db = await readJsonFile(SESSIONS_FILE, {});
  const now = Date.now();
  for (const [h, s] of Object.entries(db)) {
    if (s && typeof s.userId === "string" && now - (s.created || 0) < SESSION_MS) sessions.set(h, s);
  }
}

let sessionSaveTimer = null;
function saveSessionsSoon() {
  if (sessionSaveTimer) return;
  sessionSaveTimer = setTimeout(() => {
    sessionSaveTimer = null;
    flushSessions();
  }, 1000);
  /* Le minuteur ne retient pas le processus : c'est voulu, mais cela veut dire
     qu'une écriture en attente se perd si le serveur s'arrête avant l'échéance.
     L'arrêt appelle donc flushSessions() — sans quoi un redémarrage déconnecte
     ceux qui venaient de se connecter. */
  sessionSaveTimer.unref();
}

function flushSessions() {
  if (sessionSaveTimer) {
    clearTimeout(sessionSaveTimer);
    sessionSaveTimer = null;
  }
  return writeJsonFile(SESSIONS_FILE, Object.fromEntries(sessions)).catch((err) =>
    console.error("[presetbook] sessions non enregistrées", err.message)
  );
}

function newSession(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  sessions.set(tokenHash(token), { userId, created: Date.now(), seen: Date.now() });
  saveSessionsSoon();
  return token;
}

function cookieValue(req, name) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

function sessionCookie(token, req) {
  const secure = SECURE_COOKIES || (req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";
  const bits = [
    `${COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    token ? `Max-Age=${Math.floor(SESSION_MS / 1000)}` : "Max-Age=0",
  ];
  if (secure) bits.push("Secure");
  return bits.join("; ");
}

async function currentUser(req) {
  const token = cookieValue(req, COOKIE);
  if (!token) return null;
  const h = tokenHash(token);
  const s = sessions.get(h);
  if (!s) return null;
  if (Date.now() - s.created > SESSION_MS) {
    sessions.delete(h);
    saveSessionsSoon();
    return null;
  }
  const db = await readUsers();
  const user = db.users.find((u) => u.id === s.userId);
  if (!user) {
    sessions.delete(h);
    saveSessionsSoon();
    return null;
  }
  s.seen = Date.now();
  return user;
}

/* --------------------------------------------- limitation des tentatives */

const fails = new Map(); // ip -> {n, first}

function clientIp(req) {
  const fwd = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || req.socket.remoteAddress || "?";
}

function throttled(req) {
  const rec = fails.get(clientIp(req));
  if (!rec) return false;
  if (Date.now() - rec.first > LOGIN_WINDOW_MS) {
    fails.delete(clientIp(req));
    return false;
  }
  return rec.n >= LOGIN_MAX_FAILS;
}

function noteFailure(req) {
  const ip = clientIp(req);
  const rec = fails.get(ip);
  if (!rec || Date.now() - rec.first > LOGIN_WINDOW_MS) fails.set(ip, { n: 1, first: Date.now() });
  else rec.n += 1;
}

/* ---------------------------------------------------------------- presets */

function presetsFile(user) {
  return path.join(PRESETS_DIR, `${user.id}.json`);
}

function sanitizeState(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const custom = Array.isArray(input.custom) ? input.custom : [];
  const hidden = Array.isArray(input.hidden) ? input.hidden : [];
  const obj = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x : {});
  const overrides = obj(input.overrides);
  const gear = obj(input.gear);
  if (custom.length > MAX_PRESETS || Object.keys(overrides).length > MAX_PRESETS) return null;
  if (Object.keys(gear).length > MAX_GEAR) return null;
  return {
    v: 1,
    custom,
    overrides,
    gear,
    hidden: hidden.filter((id) => typeof id === "string"),
    /* la langue choisie voyage avec les données, donc elle suit de poste en poste */
    lang: input.lang === "en" || input.lang === "fr" ? input.lang : undefined,
    updated: new Date().toISOString(),
  };
}

/**
 * Crée le compte de démonstration s'il manque, aligne son mot de passe sur la
 * configuration, et remet ses fiches à zéro. La remise à zéro à chaque
 * démarrage borne les dégâts : le compte est ouvert à tous, donc une démo
 * abîmée se répare en redémarrant.
 *
 * Le minimum de longueur ne s'applique pas : ce mot de passe n'est pas un
 * secret, il est affiché dans la documentation.
 */
async function ensureDemoUser() {
  if (!DEMO_NAME || !DEMO_PASSWORD) return null;
  const db = await readUsers();
  let user = findUser(db, DEMO_NAME);
  if (!user) {
    user = await createUser(db, DEMO_NAME, DEMO_PASSWORD);
  } else if (!(await passwordMatches(user, DEMO_PASSWORD))) {
    const salt = crypto.randomBytes(16);
    user.salt = salt.toString("hex");
    user.hash = (await scrypt(DEMO_PASSWORD, salt)).toString("hex");
    user.params = { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, keylen: SCRYPT.keylen };
    await writeJsonFile(USERS_FILE, db);
  }
  await writeJsonFile(presetsFile(user), { ...EMPTY_STATE, updated: new Date().toISOString() });
  return user;
}

/** Le fichier unique d'avant les comptes revient au premier compte créé. */
async function adoptLegacyPresets(user) {
  try {
    await fsp.access(LEGACY_PRESETS);
  } catch {
    return;
  }
  const target = presetsFile(user);
  try {
    await fsp.access(target);
    return; // le compte a déjà ses données
  } catch {
    /* la cible n'existe pas : on reprend l'ancien fichier */
  }
  await fsp.mkdir(PRESETS_DIR, { recursive: true });
  await fsp.rename(LEGACY_PRESETS, target);
  console.log(`[presetbook] presets d'avant les comptes attribués à ${user.name}`);
}

/* ---------------------------------------------------------- authent. basique */

function basicOk(req) {
  if (!BASIC_AUTH) return true;
  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;
  let got;
  try {
    got = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    return false;
  }
  const a = Buffer.from(got, "utf8");
  const b = Buffer.from(BASIC_AUTH, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------------------------------------------------------------- statique */

async function serveStatic(req, res, pathname) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return send(res, 400, "Requête invalide", { "Content-Type": MIME[".txt"] });
  }
  if (rel.endsWith("/")) rel += "index.html";

  const full = path.resolve(PUBLIC_DIR, "." + path.posix.normalize(rel));
  if (full !== PUBLIC_DIR && !full.startsWith(PUBLIC_DIR + path.sep)) {
    return send(res, 403, "Interdit", { "Content-Type": MIME[".txt"] });
  }

  let stat;
  try {
    stat = await fsp.stat(full);
  } catch {
    return send(res, 404, "Introuvable", { "Content-Type": MIME[".txt"] });
  }
  if (stat.isDirectory()) return serveStatic(req, res, rel.replace(/\/?$/, "/"));

  const type = MIME[path.extname(full).toLowerCase()] || "application/octet-stream";
  const etag = `W/"${stat.size}-${Number(stat.mtimeMs).toString(36)}"`;
  const recu = req.headers["if-none-match"];
  if (recu === etag || recu === etag.replace(/"$/, '-gz"')) {
    return send(res, 304, "", { ETag: recu, Vary: "Accept-Encoding" });
  }

  const headers = {
    "Content-Type": type,
    "Content-Length": stat.size,
    ETag: etag,
    "Cache-Control": type.startsWith("text/html") ? "no-cache" : "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    Vary: "Accept-Encoding",
  };

  /* La page fait près de 200 Ko et part à chaque ouverture : compressée, elle
     en fait moins de 60. Sur un téléphone en 4G, c'est la différence qui se
     voit. L'ETag change avec l'encodage, sinon un cache pourrait rendre une
     réponse gzip à qui a demandé du clair. */
  if (COMPRESSIBLE.test(type) && stat.size >= GZIP_MIN && acceptsGzip(req)) {
    try {
      const brut = await fsp.readFile(full);
      const out = await gzipCached(full + "|" + etag, brut);
      const h = { ...headers, "Content-Length": out.length,
                  "Content-Encoding": "gzip", ETag: etag.replace(/"$/, '-gz"') };
      if (req.method === "HEAD") return send(res, 200, "", h);
      return send(res, 200, out, h);
    } catch {
      /* illisible ou incompressible : on retombe sur l'envoi tel quel */
    }
  }

  if (req.method === "HEAD") return send(res, 200, "", headers);

  res.writeHead(200, headers);
  fs.createReadStream(full)
    .on("error", () => res.destroy())
    .pipe(res);
}

/* ----------------------------------------------------------------- routage */

async function handleSession(req, res) {
  const db = await readUsers();
  const user = await currentUser(req);
  const vrais = realUsers(db);
  return sendJson(res, 200, {
    user: user ? { id: user.id, name: user.name } : null,
    /* La démo ne compte pas : sinon, sur une installation neuve, sa présence
       fermerait la création de comptes avant que le propriétaire ait le sien. */
    /* Jamais pour la démo : le serveur refuserait, l'interface ne doit pas
       proposer ce qu'elle n'obtiendra pas. */
    canRegister: isDemo(user) ? false : (vrais.length === 0 || ALLOW_REGISTER || isAdmin(user)),
    isAdmin: isAdmin(user),
    firstRun: vrais.length === 0,
    demo: DEMO_NAME ? { name: DEMO_NAME } : null,
    isDemo: isDemo(user),
  });
}

async function handleRegister(req, res) {
  const db = await readUsers();
  const asUser = await currentUser(req);
  if (isDemo(asUser)) {
    /* Les identifiants de la démo sont publics : lui laisser ce droit
       ouvrirait la création de comptes à tout Internet. */
    return sendJson(res, 403, { error: "Le compte de démonstration ne peut pas créer de compte." });
  }
  /* Ouvrir un compte est une action d'administration : un utilisateur ordinaire
     ne peut que changer son mot de passe et supprimer son propre compte. */
  if (!(realUsers(db).length === 0 || ALLOW_REGISTER || isAdmin(asUser))) {
    return sendJson(res, 403, asUser
      ? { error: "Seul l'administrateur peut ouvrir un compte." }
      : { error: "La création de comptes est fermée sur ce serveur." });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: "Requête invalide." });
  }
  const name = String(body.name || "").trim();
  const password = String(body.password || "");

  if (!NAME_RE.test(name)) {
    return sendJson(res, 422, { error: "Identifiant : 2 à 40 caractères, lettres, chiffres, espace, point, tiret." });
  }
  if (password.length < PW_MIN || password.length > PW_MAX) {
    return sendJson(res, 422, { error: `Mot de passe : au moins ${PW_MIN} caractères.` });
  }
  if (findUser(db, name)) return sendJson(res, 409, { error: "Cet identifiant est déjà pris." });

  /* Le premier vrai compte de l'instance est l'administrateur. */
  const premier = realUsers(db).length === 0;
  const user = await createUser(db, name, password);
  if (premier) {
    user.admin = true;
    await writeJsonFile(USERS_FILE, db);
    await adoptLegacyPresets(user);
  }
  console.log(`[presetbook] compte créé : ${user.name}`);

  // Un compte créé par un utilisateur déjà connecté ne change pas sa session.
  if (asUser) return sendJson(res, 201, { user: { id: user.id, name: user.name }, switched: false });
  const token = newSession(user.id);
  return sendJson(res, 201, { user: { id: user.id, name: user.name }, switched: true }, {
    "Set-Cookie": sessionCookie(token, req),
  });
}

/* Entrer en démo en un clic. Le mot de passe reste sur le serveur : la page ne
   l'affiche pas et ne le transmet pas. Compté par adresse, pour qu'un robot ne
   fabrique pas des sessions à l'infini. */
const demoGrants = new Map(); // ip -> {n, first}

async function handleDemo(req, res) {
  if (!DEMO_NAME) return sendJson(res, 404, { error: "Aucun compte de démonstration ici." });
  const ip = clientIp(req);
  const rec = demoGrants.get(ip);
  if (rec && Date.now() - rec.first < LOGIN_WINDOW_MS) {
    if (rec.n >= DEMO_MAX_GRANTS) {
      return sendJson(res, 429, { error: "Trop d'entrées en démo. Réessaie dans un quart d'heure." });
    }
    rec.n++;
  } else {
    demoGrants.set(ip, { n: 1, first: Date.now() });
  }

  const db = await readUsers();
  const user = findUser(db, DEMO_NAME);
  if (!user) return sendJson(res, 503, { error: "Le compte de démonstration n'est pas prêt." });
  const token = newSession(user.id);
  return sendJson(res, 200, { user: { id: user.id, name: user.name } },
    { "Set-Cookie": sessionCookie(token, req) });
}

/** La liste des comptes. Réservée à l'administrateur : savoir qui existe sur
    un serveur n'a pas à être public, ni même partagé entre utilisateurs. */
async function handleUsers(req, res) {
  const user = await currentUser(req);
  if (!isAdmin(user)) return sendJson(res, 403, { error: "Réservé à l'administrateur." });
  const db = await readUsers();
  return sendJson(res, 200, {
    users: db.users.map((u) => ({
      id: u.id, name: u.name, created: u.created || null,
      admin: u.admin === true, demo: isDemo(u),
    })),
  });
}

/**
 * Supprimer un compte : le sien, ou celui d'un autre si l'on est administrateur.
 *
 * Le mot de passe de qui demande est exigé dans les deux cas : c'est
 * irréversible, et les fiches partent avec.
 */
async function handleDeleteAccount(req, res) {
  if (throttled(req)) {
    return sendJson(res, 429, { error: "Trop de tentatives. Réessaie dans un quart d'heure." });
  }
  const user = await currentUser(req);
  if (!user) return sendJson(res, 401, { error: "Connexion requise." });
  if (isDemo(user)) {
    return sendJson(res, 403, { error: "Le compte de démonstration ne se supprime pas." });
  }

  let body;
  try { body = await readJsonBody(req); }
  catch { return sendJson(res, 400, { error: "Requête invalide." }); }

  if (!(await passwordMatches(user, String(body.password || "")))) {
    noteFailure(req);
    return sendJson(res, 401, { error: "Mot de passe incorrect." });
  }
  fails.delete(clientIp(req));

  const db = await readUsers();
  const cibleId = body.id ? String(body.id) : user.id;
  const soi = cibleId === user.id;
  if (!soi && !isAdmin(user)) {
    return sendJson(res, 403, { error: "Seul l'administrateur peut supprimer un autre compte." });
  }

  const cible = db.users.find((u) => u.id === cibleId);
  if (!cible) return sendJson(res, 404, { error: "Compte introuvable." });
  if (isDemo(cible)) {
    return sendJson(res, 403, { error: "Le compte de démonstration ne se supprime pas." });
  }
  if (cible.admin === true) {
    /* Sinon l'instance se retrouverait sans personne pour ouvrir un compte, et
       la seule issue serait d'éditer users.json à la main. */
    return sendJson(res, 409, {
      error: "Le compte administrateur ne se supprime pas depuis l'application.",
    });
  }

  db.users = db.users.filter((u) => u.id !== cibleId);
  await writeJsonFile(USERS_FILE, db);
  dropSessions(cibleId);
  try { await fsp.unlink(presetsFile(cible)); } catch { /* pas de fiches : rien à retirer */ }
  try { await fsp.unlink(presetsFile(cible).replace(/\.json$/, ".bak.json")); } catch { /* idem */ }
  console.log(`[presetbook] compte supprimé : ${cible.name}` + (soi ? " (par lui-même)" : ` (par ${user.name})`));

  const entetes = soi ? { "Set-Cookie": sessionCookie("", req) } : {};
  return sendJson(res, 200, { ok: true, deleted: cible.name, self: soi }, entetes);
}

async function handleLogin(req, res) {
  if (throttled(req)) {
    return sendJson(res, 429, { error: "Trop de tentatives. Réessaie dans un quart d'heure." });
  }
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: "Requête invalide." });
  }
  const db = await readUsers();
  const user = findUser(db, body.name || "");
  const password = String(body.password || "");
  const ok = user ? await passwordMatches(user, password) : false;

  if (!ok) {
    noteFailure(req);
    console.warn(`[presetbook] connexion refusée pour « ${String(body.name || "").slice(0, 40)} »`);
    return sendJson(res, 401, { error: "Identifiant ou mot de passe incorrect." });
  }
  fails.delete(clientIp(req));
  const token = newSession(user.id);
  return sendJson(res, 200, { user: { id: user.id, name: user.name } }, { "Set-Cookie": sessionCookie(token, req) });
}

function handleLogout(req, res) {
  const token = cookieValue(req, COOKIE);
  if (token) {
    sessions.delete(tokenHash(token));
    saveSessionsSoon();
  }
  return sendJson(res, 200, { ok: true }, { "Set-Cookie": sessionCookie("", req) });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  try {
    if (pathname === "/healthz") {
      return sendJson(res, 200, {
        status: "ok",
        uptime: Math.round(process.uptime()),
        app: appFingerprint,
      });
    }

    if (!basicOk(req)) {
      return send(res, 401, "Authentification requise", {
        "WWW-Authenticate": 'Basic realm="Presetbook", charset="UTF-8"',
        "Content-Type": MIME[".txt"],
      });
    }

    if (pathname === "/api/session" && (req.method === "GET" || req.method === "HEAD")) {
      return await handleSession(req, res);
    }
    if (pathname === "/api/register" && req.method === "POST") return await handleRegister(req, res);
    if (pathname === "/api/login" && req.method === "POST") return await handleLogin(req, res);
    if (pathname === "/api/demo" && req.method === "POST") return await handleDemo(req, res);
    if (pathname === "/api/password" && req.method === "POST") return await handlePassword(req, res);
    if (pathname === "/api/users" && req.method === "GET") return await handleUsers(req, res);
    if (pathname === "/api/account/delete" && req.method === "POST") return await handleDeleteAccount(req, res);
    if (pathname === "/api/logout" && req.method === "POST") return handleLogout(req, res);

    if (pathname === "/api/presets") {
      const user = await currentUser(req);
      if (!user) return sendJson(res, 401, { error: "Connexion requise." });

      if (req.method === "GET" || req.method === "HEAD") {
        return await sendJsonGz(req, res, 200, await readJsonFile(presetsFile(user), EMPTY_STATE));
      }
      if (req.method === "PUT" || req.method === "POST") {
        let parsed;
        try {
          parsed = await readJsonBody(req);
        } catch (err) {
          if (err.tooLarge) return sendJson(res, 413, { error: "Sauvegarde trop volumineuse." });
          return sendJson(res, 400, { error: "JSON invalide." });
        }
        const state = sanitizeState(parsed);
        if (!state) return sendJson(res, 422, { error: "Structure inattendue." });
        await writeJsonFile(presetsFile(user), state);
        console.log(
          `[presetbook] ${user.name} : ${state.custom.length} presets propres, ` +
            `${Object.keys(state.overrides).length} modifiés, ${state.hidden.length} masqués, ` +
            `${Object.keys(state.gear).length} matériels`
        );
        return sendJson(res, 200, { ok: true, updated: state.updated });
      }
      return sendJson(res, 405, { error: "Méthode non autorisée." });
    }

    if (pathname.startsWith("/api/")) return sendJson(res, 404, { error: "Point d'entrée inconnu." });

    if (req.method !== "GET" && req.method !== "HEAD") {
      return send(res, 405, "Méthode non autorisée", { "Content-Type": MIME[".txt"] });
    }
    return await serveStatic(req, res, pathname);
  } catch (err) {
    console.error("[presetbook] erreur", err);
    if (!res.headersSent) sendJson(res, 500, { error: "Erreur interne." });
    else res.destroy();
  }
});

loadSessions()
  .catch((err) => console.error("[presetbook] sessions illisibles", err.message))
  .then(() =>
    server.listen(PORT, HOST, async () => {
      await ensureAdmin().catch((err) =>
        console.error("[presetbook] administrateur indéterminé :", err.message)
      );
      await ensureDemoUser().catch((err) =>
        console.error("[presetbook] compte de démonstration indisponible :", err.message)
      );
      const db = await readUsers().catch(() => ({ users: [] }));
      console.log(`[presetbook] écoute sur http://${HOST}:${PORT}`);
      console.log(`[presetbook] données : ${DATA_DIR}`);
      console.log(`[presetbook] page servie : ${appFingerprint.sha} (${appFingerprint.bytes} octets, ${appFingerprint.mtime})`);
      const vrais = realUsers(db).length;
      console.log(`[presetbook] comptes : ${vrais}` + (vrais ? "" : " — le premier créé sera le tien"));
      console.log(
        `[presetbook] création de comptes : ${
          vrais === 0 ? "ouverte (aucun compte)" : ALLOW_REGISTER ? "ouverte" : "réservée à l'administrateur"
        }`
      );
      if (DEMO_NAME) {
        console.log(`[presetbook] démonstration : « ${DEMO_NAME} », fiches remises à zéro à ce démarrage`);
      }
      if (BASIC_AUTH) console.log("[presetbook] authentification basique activée en amont");
    })
  );

let arretDemande = false;
function partir() {
  if (arretDemande) return;
  arretDemande = true;
  flushSessions().finally(() => process.exit(0));
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`[presetbook] ${sig} reçu, arrêt`);
    server.close(partir);                 /* les requêtes en cours finissent */
    setTimeout(partir, 5000).unref();     /* filet : on n'attend pas indéfiniment */
  });
}
