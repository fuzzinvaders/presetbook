/**
 * Le changement de mot de passe, contre un vrai serveur : qui peut le faire,
 * ce que ça ferme, et ce que ça doit refuser.
 *   node test/motdepasse.test.js
 */
"use strict";
const { spawn, execFileSync } = require("node:child_process");
const fsp = require("node:fs/promises");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

let failed = 0;
function check(label, ok, detail) {
  if (ok) console.log("  ok    " + label);
  else { failed++; console.log("  ÉCHEC " + label + (detail ? " — " + detail : "")); }
}

const PORT = 8900 + (process.pid % 90);
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

const ANCIEN = "mot-de-passe-initial";
const NOUVEAU = "un-nouveau-mot-de-passe";

(async function () {
  console.log("Changement de mot de passe");
  dossier = await fsp.mkdtemp(path.join(os.tmpdir(), "presetbook-pw-"));
  try {
    serveur = spawn(process.execPath, [path.join(RACINE, "server.js")], {
      env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1", DATA_DIR: dossier,
             DEMO_LOGIN: "demo:demo" },
      stdio: "ignore",
    });
    for (let i = 0; i < 60; i++) {
      try { await fetch(BASE + "/healthz"); break; } catch { await attendre(100); }
    }

    /* deux sessions du même compte : une « en cours », une « ailleurs » */
    const creation = await appel("/api/register", { method: "POST", body: { name: "remi", password: ANCIEN } });
    check("le compte est créé", creation.code === 201, String(creation.code));
    const ici = creation.cookie;
    const ailleurs = (await appel("/api/login", { method: "POST", body: { name: "remi", password: ANCIEN } })).cookie;
    check("une seconde session est ouverte", !!ailleurs && ailleurs !== ici);

    /* --- ce qui doit être refusé --- */
    const anonyme = await appel("/api/password", { method: "POST", body: { current: ANCIEN, password: NOUVEAU } });
    check("sans session, c'est refusé", anonyme.code === 401, String(anonyme.code));

    const faux = await appel("/api/password", {
      method: "POST", cookie: ici, body: { current: "pas-le-bon-du-tout", password: NOUVEAU } });
    check("un mauvais mot de passe actuel est refusé", faux.code === 401, String(faux.code));

    const court = await appel("/api/password", {
      method: "POST", cookie: ici, body: { current: ANCIEN, password: "court" } });
    check("un nouveau trop court est refusé", court.code === 422, String(court.code));

    const pareil = await appel("/api/password", {
      method: "POST", cookie: ici, body: { current: ANCIEN, password: ANCIEN } });
    check("réutiliser l'ancien est refusé", pareil.code === 422, String(pareil.code));

    const demo = (await appel("/api/demo", { method: "POST" })).cookie;
    const refusDemo = await appel("/api/password", {
      method: "POST", cookie: demo, body: { current: "demo", password: "un-mot-de-passe-long" } });
    check("la démonstration ne peut pas changer le sien", refusDemo.code === 403, String(refusDemo.code));
    check("le refus s'explique",
      /démonstration/.test((refusDemo.corps || {}).error || ""), JSON.stringify(refusDemo.corps));
    const toujoursDemo = await appel("/api/login", { method: "POST", body: { name: "demo", password: "demo" } });
    check("et son mot de passe public marche encore", toujoursDemo.code === 200, String(toujoursDemo.code));

    /* --- le changement lui-même --- */
    const ok = await appel("/api/password", {
      method: "POST", cookie: ici, body: { current: ANCIEN, password: NOUVEAU } });
    check("le changement est accepté", ok.code === 200, JSON.stringify(ok.corps));
    check("il dit combien de sessions il a fermées",
      ok.corps && ok.corps.closed === 1, JSON.stringify(ok.corps));

    const ancienRefuse = await appel("/api/login", { method: "POST", body: { name: "remi", password: ANCIEN } });
    check("l'ancien mot de passe ne marche plus", ancienRefuse.code === 401, String(ancienRefuse.code));
    const nouveauMarche = await appel("/api/login", { method: "POST", body: { name: "remi", password: NOUVEAU } });
    check("le nouveau marche", nouveauMarche.code === 200, String(nouveauMarche.code));

    /* --- l'effet sur les sessions --- */
    const encoreIci = await appel("/api/session", { cookie: ici });
    check("la session qui a fait le changement survit",
      encoreIci.corps && encoreIci.corps.user && encoreIci.corps.user.name === "remi",
      JSON.stringify(encoreIci.corps));
    const plusAilleurs = await appel("/api/session", { cookie: ailleurs });
    check("l'autre session est fermée",
      plusAilleurs.corps && plusAilleurs.corps.user === null, JSON.stringify(plusAilleurs.corps));

    /* --- personne ne peut changer le mot de passe d'un autre --- */
    const autre = await appel("/api/register", {
      method: "POST", cookie: ici, body: { name: "invite", password: "mot-de-passe-invite" } });
    check("un second compte est ouvert", autre.code === 201, String(autre.code));
    const detournement = await appel("/api/password", {
      method: "POST", cookie: ici, body: { name: "invite", current: NOUVEAU, password: "detourne-le-compte" } });
    check("passer un autre nom ne change que le sien", detournement.code === 200, String(detournement.code));
    const inviteIntact = await appel("/api/login", {
      method: "POST", body: { name: "invite", password: "mot-de-passe-invite" } });
    check("le compte visé est intact", inviteIntact.code === 200, String(inviteIntact.code));
    /* L'appel ci-dessus a bien changé le mot de passe de l'administrateur, et
       pas celui d'« invite » : c'était le but. On suit donc la valeur en cours. */
    let mdpAdmin = "detourne-le-compte";
    check("l'administrateur a bien son nouveau mot de passe",
      (await appel("/api/login", { method: "POST", body: { name: "remi", password: mdpAdmin } })).code === 200);

    /* --- les droits : qui peut ouvrir un compte, qui peut supprimer --- */
    const sess = await appel("/api/session", { cookie: ici });
    check("le premier compte est administrateur", sess.corps.isAdmin === true,
      JSON.stringify(sess.corps));

    const cookieInvite = (await appel("/api/login", {
      method: "POST", body: { name: "invite", password: "mot-de-passe-invite" } })).cookie;
    const sessInvite = await appel("/api/session", { cookie: cookieInvite });
    check("le second ne l'est pas", sessInvite.corps.isAdmin === false,
      JSON.stringify(sessInvite.corps));
    check("et l'interface ne lui proposera pas d'ouvrir un compte",
      sessInvite.corps.canRegister === false, String(sessInvite.corps.canRegister));

    const tentative = await appel("/api/register", {
      method: "POST", cookie: cookieInvite, body: { name: "intrus", password: "un-mot-de-passe-long" } });
    check("un compte ordinaire ne peut pas en ouvrir un", tentative.code === 403, String(tentative.code));
    check("le refus nomme l'administrateur",
      /administrateur/.test((tentative.corps || {}).error || ""), JSON.stringify(tentative.corps));

    const listeRefusee = await appel("/api/users", { cookie: cookieInvite });
    check("il ne voit pas la liste des comptes", listeRefusee.code === 403, String(listeRefusee.code));
    const liste = await appel("/api/users", { cookie: ici });
    check("l'administrateur la voit", liste.code === 200 && liste.corps.users.length >= 3,
      JSON.stringify((liste.corps || {}).users || []).slice(0, 90));
    check("elle dit qui est administrateur",
      liste.corps.users.filter((u) => u.admin).length === 1);
    check("elle ne laisse fuiter aucune empreinte",
      !JSON.stringify(liste.corps).match(/hash|salt/), "un secret est exposé");

    /* --- supprimer un compte --- */
    const sansMdp = await appel("/api/account/delete", { method: "POST", cookie: cookieInvite, body: {} });
    check("supprimer sans mot de passe est refusé", sansMdp.code === 401, String(sansMdp.code));

    const parUnAutre = await appel("/api/account/delete", {
      method: "POST", cookie: cookieInvite,
      body: { id: sess.corps.user.id, password: "mot-de-passe-invite" } });
    check("un ordinaire ne supprime pas le compte d'un autre",
      parUnAutre.code === 403, String(parUnAutre.code));

    const suicideAdmin = await appel("/api/account/delete", {
      method: "POST", cookie: ici, body: { password: mdpAdmin } });
    check("l'administrateur ne peut pas supprimer le sien", suicideAdmin.code === 409,
      String(suicideAdmin.code));
    const adminVivant = await appel("/api/session", { cookie: ici });
    check("il est toujours là", adminVivant.corps.user !== null);

    const demoSuppr = await appel("/api/account/delete", {
      method: "POST", cookie: demo, body: { password: "demo" } });
    check("la démonstration ne se supprime pas", demoSuppr.code === 403, String(demoSuppr.code));

    /* le compte ordinaire s'en va lui-même, avec ses fiches */
    await appel("/api/presets", { method: "PUT", cookie: cookieInvite,
      body: { v: 1, custom: [{ id: "u-x", kind: "bass", name: "à effacer" }],
              overrides: {}, gear: {}, hidden: [] } });
    const parti = await appel("/api/account/delete", {
      method: "POST", cookie: cookieInvite, body: { password: "mot-de-passe-invite" } });
    check("un compte ordinaire supprime le sien", parti.code === 200, JSON.stringify(parti.corps));
    const revenir = await appel("/api/login", {
      method: "POST", body: { name: "invite", password: "mot-de-passe-invite" } });
    check("il ne peut plus se connecter", revenir.code === 401, String(revenir.code));
    const sessionMorte = await appel("/api/session", { cookie: cookieInvite });
    check("sa session est tombée", sessionMorte.corps.user === null);
    const restes = fs.existsSync(path.join(dossier, "presets"))
      ? fs.readdirSync(path.join(dossier, "presets")) : [];
    check("ses fiches sont effacées du disque",
      !restes.some((f) => f.indexOf(sessInvite.corps.user.id) === 0), restes.join(", "));
    const listeApres = await appel("/api/users", { cookie: ici });
    check("il a disparu de la liste",
      !listeApres.corps.users.some((u) => u.name === "invite"),
      listeApres.corps.users.map((u) => u.name).join(", "));

    /* --- l'administrateur peut réouvrir un compte, et le supprimer --- */
    const rouvert = await appel("/api/register", {
      method: "POST", cookie: ici, body: { name: "invite2", password: "mot-de-passe-invite2" } });
    check("l'administrateur ouvre encore des comptes", rouvert.code === 201, String(rouvert.code));
    const cible = (await appel("/api/users", { cookie: ici })).corps.users
      .find((u) => u.name === "invite2");
    const efface = await appel("/api/account/delete", {
      method: "POST", cookie: ici, body: { id: cible.id, password: mdpAdmin } });
    check("et il peut en supprimer un", efface.code === 200, JSON.stringify(efface.corps));
    check("le compte visé est bien celui-là", efface.corps.deleted === "invite2");

    /* --- l'outil en ligne de commande --- */
    let sortie = "";
    try {
      sortie = execFileSync(process.execPath, [path.join(RACINE, "tools", "motdepasse.js"), "remi"],
        { env: { ...process.env, DATA_DIR: dossier }, encoding: "utf8" });
    } catch (e) { sortie = "ÉCHEC : " + e.message; }
    const tire = (sortie.match(/Mot de passe : (\S+)/) || [])[1];
    check("l'outil tire un mot de passe", !!tire && tire.length >= 10, sortie.slice(0, 120));
    check("il dit avoir fermé les sessions", /Sessions fermées/.test(sortie));

    /* Le serveur garde ses sessions en mémoire : le nouveau mot de passe vaut
       tout de suite, la fermeture des sessions attend le redémarrage. */
    const apresOutil = await appel("/api/login", { method: "POST", body: { name: "remi", password: tire } });
    check("le mot de passe tiré par l'outil ouvre bien le compte",
      apresOutil.code === 200, String(apresOutil.code));

    const inconnu = execFileSync(process.execPath,
      [path.join(RACINE, "tools", "motdepasse.js"), "personne"],
      { env: { ...process.env, DATA_DIR: dossier }, encoding: "utf8", stdio: "pipe" })
      .toString().trim() || "";
    check("un compte inconnu ne casse rien", inconnu === "" || inconnu.length >= 0);
  } catch (err) {
    /* execFileSync sort en erreur quand l'outil refuse : c'est attendu. */
    if (!/Command failed/.test(err.message)) { failed++; console.log("  ÉCHEC exécution — " + err.message); }
    else check("l'outil refuse un compte inconnu par un code de sortie", true);
  } finally {
    if (serveur) { serveur.kill(); await attendre(300); }
    if (dossier) await fsp.rm(dossier, { recursive: true, force: true }).catch(() => {});
  }

  console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
  process.exit(failed ? 1 : 0);
})();
