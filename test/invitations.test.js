/**
 * Les invitations à usage unique, et la remise à zéro de la démo à l'entrée.
 *   node test/invitations.test.js
 */
"use strict";
const { spawn } = require("node:child_process");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

let failed = 0;
function check(label, ok, detail) {
  if (ok) console.log("  ok    " + label);
  else { failed++; console.log("  ÉCHEC " + label + (detail ? " — " + detail : "")); }
}

const PORT = 8600 + (process.pid % 200);
const BASE = "http://127.0.0.1:" + PORT;
const RACINE = path.join(__dirname, "..");
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
let dossier = null, serveur = null;

async function appel(chemin, opts = {}) {
  const r = await fetch(BASE + chemin, {
    method: opts.method || "GET",
    headers: { ...(opts.body ? { "Content-Type": "application/json" } : {}),
               ...(opts.cookie ? { Cookie: opts.cookie } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let corps = null;
  try { corps = await r.json(); } catch { corps = null; }
  return { code: r.status, corps, cookie: (r.headers.get("set-cookie") || "").split(";")[0] || null };
}

(async function () {
  console.log("Invitations");
  dossier = await fsp.mkdtemp(path.join(os.tmpdir(), "presetbook-inv-"));
  try {
    serveur = spawn(process.execPath, [path.join(RACINE, "server.js")], {
      env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1", DATA_DIR: dossier,
             DEMO_LOGIN: "demo:demo" },
      stdio: "ignore",
    });
    for (let i = 0; i < 60; i++) {
      try { await fetch(BASE + "/healthz"); break; } catch { await attendre(100); }
    }

    const admin = await appel("/api/register", {
      method: "POST", body: { name: "chef", password: "mot-de-passe-du-chef" } });
    const cAdmin = admin.cookie;
    check("l'administrateur est en place", admin.code === 201);

    /* --- qui peut fabriquer une invitation --- */
    const anonyme = await appel("/api/invites", { method: "POST" });
    check("un anonyme ne peut pas en créer", anonyme.code === 403, String(anonyme.code));

    const cree = await appel("/api/invites", { method: "POST", cookie: cAdmin });
    check("l'administrateur en crée une", cree.code === 201, JSON.stringify(cree.corps));
    const jeton = cree.corps.token;
    check("elle porte un jeton assez long", typeof jeton === "string" && jeton.length >= 24,
      String(jeton && jeton.length));

    const liste = await appel("/api/invites", { cookie: cAdmin });
    check("elle apparaît dans les invitations en attente",
      liste.corps.invites.length === 1, JSON.stringify(liste.corps));
    check("la liste ne redonne jamais le jeton",
      JSON.stringify(liste.corps).indexOf(jeton) < 0,
      "le jeton est renvoyé par la liste");

    /* --- s'inscrire avec --- */
    const sansJeton = await appel("/api/register", {
      method: "POST", body: { name: "sansrien", password: "un-mot-de-passe-long" } });
    check("sans invitation, l'inscription reste fermée", sansJeton.code === 403, String(sansJeton.code));

    const faux = await appel("/api/register", {
      method: "POST", body: { name: "menteur", password: "un-mot-de-passe-long", invite: "n-importe-quoi" } });
    check("un faux jeton est refusé", faux.code === 410, String(faux.code));

    const invite = await appel("/api/register", {
      method: "POST", body: { name: "bassiste", password: "son-propre-mot-de-passe", invite: jeton } });
    check("l'invité ouvre son compte", invite.code === 201, JSON.stringify(invite.corps));
    check("et il choisit son mot de passe",
      (await appel("/api/login", { method: "POST",
        body: { name: "bassiste", password: "son-propre-mot-de-passe" } })).code === 200);

    const sessionInvite = await appel("/api/session", { cookie: invite.cookie });
    check("il n'est pas administrateur", sessionInvite.corps.isAdmin === false,
      JSON.stringify(sessionInvite.corps));

    /* --- le jeton ne sert qu'une fois --- */
    const rejoue = await appel("/api/register", {
      method: "POST", body: { name: "second", password: "un-mot-de-passe-long", invite: jeton } });
    check("le même jeton ne resservira pas", rejoue.code === 410, String(rejoue.code));
    const apres = await appel("/api/invites", { cookie: cAdmin });
    check("il a disparu des invitations en attente",
      apres.corps.invites.length === 0, JSON.stringify(apres.corps));

    /* --- révoquer --- */
    const aRevoquer = await appel("/api/invites", { method: "POST", cookie: cAdmin });
    const idRevoc = (await appel("/api/invites", { cookie: cAdmin })).corps.invites[0].id;
    const revoc = await appel("/api/invites/revoke", {
      method: "POST", cookie: cAdmin, body: { id: idRevoc } });
    check("une invitation se révoque", revoc.code === 200, String(revoc.code));
    const mort = await appel("/api/register", {
      method: "POST", body: { name: "tardif", password: "un-mot-de-passe-long",
                              invite: aRevoquer.corps.token } });
    check("le lien révoqué ne vaut plus rien", mort.code === 410, String(mort.code));

    /* un invité ne peut pas en fabriquer à son tour */
    const parInvite = await appel("/api/invites", { method: "POST", cookie: invite.cookie });
    check("un compte ordinaire ne peut pas inviter", parInvite.code === 403, String(parInvite.code));

    /* --- la démo : remise à zéro seulement si elle dort --- */
    const demo = (await appel("/api/demo", { method: "POST" })).cookie;
    await appel("/api/presets", { method: "PUT", cookie: demo,
      body: { v: 1, custom: [{ id: "u-demo", kind: "bass", name: "en cours" }],
              overrides: {}, gear: {}, hidden: [] } });
    const pendant = await appel("/api/demo", { method: "POST" });
    const vueApres = await appel("/api/presets", { cookie: pendant.cookie });
    check("une entrée pendant qu'on explore n'efface rien",
      vueApres.corps.custom.length === 1, JSON.stringify(vueApres.corps.custom));

    /* on vieillit artificiellement la dernière écriture */
    const fichier = path.join(dossier, "presets");
    const noms = await fsp.readdir(fichier);
    const cible = path.join(fichier, noms.find((f) => f.endsWith(".json") && !f.includes(".bak")));
    const etat = JSON.parse(await fsp.readFile(cible, "utf8"));
    for (const f of noms) {
      const p = path.join(fichier, f);
      const j = JSON.parse(await fsp.readFile(p, "utf8"));
      if ((j.custom || []).some((x) => x.id === "u-demo")) {
        j.updated = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        await fsp.writeFile(p, JSON.stringify(j), "utf8");
      }
    }
    check("l'état de la démo est bien celui qu'on vient de vieillir", !!etat);

    const nouveau = await appel("/api/demo", { method: "POST" });
    const vueNeuve = await appel("/api/presets", { cookie: nouveau.cookie });
    check("après une longue inactivité, le nouveau venu trouve une démo propre",
      vueNeuve.corps.custom.length === 0, JSON.stringify(vueNeuve.corps.custom));
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
