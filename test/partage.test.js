/**
 * L'étagère partagée : publier, reprendre, retirer, et ce qui doit être refusé.
 *   node test/partage.test.js
 */
"use strict";
const { spawn } = require("node:child_process");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { run } = require("./sandbox.js");

let failed = 0;
function check(label, ok, detail) {
  if (ok) console.log("  ok    " + label);
  else { failed++; console.log("  ÉCHEC " + label + (detail ? " — " + detail : "")); }
}

const PORT = 8700 + (process.pid % 200);
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
  console.log("Étagère partagée");
  dossier = await fsp.mkdtemp(path.join(os.tmpdir(), "presetbook-share-"));
  try {
    serveur = spawn(process.execPath, [path.join(RACINE, "server.js")], {
      env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1", DATA_DIR: dossier,
             DEMO_LOGIN: "demo:demo" },
      stdio: "ignore",
    });
    for (let i = 0; i < 60; i++) {
      try { await fetch(BASE + "/healthz"); break; } catch { await attendre(100); }
    }

    const chef = await appel("/api/register", {
      method: "POST", body: { name: "chef", password: "mot-de-passe-du-chef" } });
    const cChef = chef.cookie;
    const jeton = (await appel("/api/invites", { method: "POST", cookie: cChef })).corps.token;
    const ami = await appel("/api/register", {
      method: "POST", body: { name: "ami", password: "mot-de-passe-de-l-ami", invite: jeton } });
    const cAmi = ami.cookie;
    check("deux comptes en place", chef.code === 201 && ami.code === 201);

    /* La fiche partagée s'appuie sur une pédale dessinée à la main : c'est le
       cas qui casse un partage naïf, la façade n'existant pas chez l'autre. */
    const facade = { kind: "pedal", model: "Ma pédale", color: "#3355aa",
                     controls: [{ k: "gain", t: "scale", l: "Gain", min: 0, max: 10, step: 0.5, d: 5 }] };
    const fiche = { id: "u-mienne", kind: "pedal", gear: "g-perso", name: "Mon réglage",
                    tags: ["rock"], notes: "Ce que j'utilise en répétition." };

    /* --- publier --- */
    const anonyme = await appel("/api/shared", { method: "POST", body: { preset: fiche } });
    check("un anonyme ne publie pas", anonyme.code === 401, String(anonyme.code));

    const demo = (await appel("/api/demo", { method: "POST" })).cookie;
    const parDemo = await appel("/api/shared", {
      method: "POST", cookie: demo, body: { preset: fiche, gear: { "g-perso": facade } } });
    check("la démonstration ne publie pas", parDemo.code === 403, String(parDemo.code));

    const vide = await appel("/api/shared", { method: "POST", cookie: cChef, body: { preset: { id: "x" } } });
    check("une fiche incomplète est refusée", vide.code === 422, String(vide.code));

    const publie = await appel("/api/shared", {
      method: "POST", cookie: cChef, body: { preset: fiche, gear: { "g-perso": facade } } });
    check("la fiche est publiée", publie.code === 201, JSON.stringify(publie.corps));

    /* --- la voir --- */
    const vue = await appel("/api/shared", { cookie: cAmi });
    check("l'autre compte la voit", vue.corps.items.length === 1, JSON.stringify(vue.corps.items));
    const item = vue.corps.items[0];
    check("elle est signée", item.by === "chef", item.by);
    check("elle emporte la façade personnelle", !!item.gear["g-perso"], JSON.stringify(item.gear));
    check("elle porte son genre", item.kind === "pedal", item.kind);

    const sansSession = await appel("/api/shared");
    check("l'étagère n'est pas publique", sansSession.code === 401, String(sansSession.code));

    /* --- la reprendre : par le chemin d'un fichier importé --- */
    const w = run(path.join(RACINE, "public", "index.html"), { search: "" });
    const pb = w.__pb;
    const avant = pb.library().length;
    pb.setShared([item]);
    pb.takeShared(item.id);
    check("la reprise ajoute la fiche", pb.library().length === avant + 1,
      pb.library().length + " au lieu de " + (avant + 1));
    check("et la façade qui va avec", !!pb.allGear()["g-perso"]);
    const reprise = pb.library().filter((x) => x.name.indexOf("Mon réglage") === 0)[0];
    check("la fiche reprise garde ses valeurs", !!reprise && reprise.gear === "g-perso",
      JSON.stringify(reprise && reprise.gear));

    /* la reprendre deux fois ne remplace pas la première */
    pb.takeShared(item.id);
    const doubles = pb.library().filter((x) => String(x.name).indexOf("Mon réglage") === 0);
    check("une seconde reprise ne remplace rien", doubles.length === 2,
      doubles.map((x) => x.name).join(" | "));

    /* --- republier remplace, ne double pas --- */
    const encore = await appel("/api/shared", {
      method: "POST", cookie: cChef,
      body: { preset: { ...fiche, name: "Mon réglage v2" }, gear: { "g-perso": facade } } });
    check("republier remplace la copie", encore.code === 200 && encore.corps.replaced === true,
      JSON.stringify(encore.corps));
    const apres = await appel("/api/shared", { cookie: cAmi });
    check("l'étagère n'en contient toujours qu'une", apres.corps.items.length === 1);
    check("et c'est la nouvelle version", apres.corps.items[0].name === "Mon réglage v2",
      apres.corps.items[0].name);

    /* --- retirer --- */
    const parUnAutre = await appel("/api/shared/delete", {
      method: "POST", cookie: cAmi, body: { id: item.id } });
    check("un tiers ne retire pas la fiche d'autrui", parUnAutre.code === 403, String(parUnAutre.code));

    const parAdmin = await appel("/api/shared/delete", {
      method: "POST", cookie: cChef, body: { id: item.id } });
    check("l'auteur la retire", parAdmin.code === 200, String(parAdmin.code));
    check("l'étagère est vide",
      (await appel("/api/shared", { cookie: cAmi })).corps.items.length === 0);

    /* --- un compte supprimé emporte ses publications --- */
    await appel("/api/shared", {
      method: "POST", cookie: cAmi, body: { preset: { ...fiche, id: "u-ami" }, gear: {} } });
    check("l'ami publie à son tour",
      (await appel("/api/shared", { cookie: cChef })).corps.items.length === 1);
    await appel("/api/account/delete", {
      method: "POST", cookie: cAmi, body: { password: "mot-de-passe-de-l-ami" } });
    const orphelines = await appel("/api/shared", { cookie: cChef });
    check("son départ retire ses fiches de l'étagère",
      orphelines.corps.items.length === 0, JSON.stringify(orphelines.corps.items));
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
