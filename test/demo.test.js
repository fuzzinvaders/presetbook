/**
 * Le compte de démonstration, sur un vrai serveur : ses droits, ses limites,
 * et surtout ce qu'il ne doit pas casser.
 *   node test/demo.test.js
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

const PORT = 8100 + (process.pid % 400);
const BASE = "http://127.0.0.1:" + PORT;
const RACINE = path.join(__dirname, "..");
let dossier = null;
let serveur = null;

function attendre(ms) { return new Promise((r) => setTimeout(r, ms)); }

/**
 * Le serveur tourne derrière une enveloppe qui déclenche l'arrêt propre sur une
 * ligne reçue en entrée. Windows ne délivre pas SIGTERM à un processus enfant —
 * un simple kill() sauterait le gestionnaire d'arrêt, et le test ne dirait rien
 * de ce qu'il prétend vérifier.
 */
const ENVELOPPE =
  "require(process.env.PB_SERVER);" +
  "process.stdin.on('data', function(){ process.emit('SIGTERM'); });";

async function demarrer() {
  serveur = spawn(process.execPath, ["-e", ENVELOPPE], {
    env: {
      ...process.env,
      PB_SERVER: path.join(RACINE, "server.js"),
      PORT: String(PORT), HOST: "127.0.0.1", DATA_DIR: dossier, DEMO_LOGIN: "demo:demo",
    },
    stdio: ["pipe", "ignore", "ignore"],
  });
  for (let i = 0; i < 60; i++) {
    try { await fetch(BASE + "/healthz"); return; } catch { await attendre(100); }
  }
  throw new Error("le serveur n'a pas démarré");
}

/** Arrêt propre, sans laisser le temps à l'écriture différée des sessions. */
async function arreter() {
  if (!serveur) return;
  const fini = new Promise((r) => serveur.once("exit", r));
  serveur.stdin.write("stop\n");
  await Promise.race([fini, attendre(4000)]);
  if (serveur.exitCode === null) serveur.kill();
  await attendre(200);
  serveur = null;
}

/** Un appel qui retient le cookie de session passé en paramètre. */
async function appel(chemin, opts = {}) {
  const r = await fetch(BASE + chemin, {
    method: opts.method || "GET",
    headers: {
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(opts.cookie ? { Cookie: opts.cookie } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const brut = (r.headers.get("set-cookie") || "").split(";")[0];
  let corps = null;
  try { corps = await r.json(); } catch { corps = null; }
  return { code: r.status, corps, cookie: brut || null };
}

(async function () {
  console.log("Compte de démonstration");
  dossier = await fsp.mkdtemp(path.join(os.tmpdir(), "presetbook-demo-"));
  try {
    await demarrer();

    /* --- une installation neuve reste réclamable --- */
    let s = await appel("/api/session");
    check("le compte de démonstration est annoncé",
      s.corps && s.corps.demo && s.corps.demo.name === "demo", JSON.stringify(s.corps));
    check("il ne fait pas croire que le serveur a un propriétaire",
      s.corps.firstRun === true, "firstRun=" + s.corps.firstRun);
    check("le propriétaire peut donc encore créer son compte",
      s.corps.canRegister === true, "canRegister=" + s.corps.canRegister);

    /* --- entrer en démo --- */
    const parBouton = await appel("/api/demo", { method: "POST" });
    check("un clic ouvre la session de démonstration",
      parBouton.code === 200 && parBouton.corps.user.name === "demo", String(parBouton.code));
    const demo = parBouton.cookie;

    const parMotDePasse = await appel("/api/login", { method: "POST", body: { name: "demo", password: "demo" } });
    check("les identifiants demo / demo fonctionnent aussi",
      parMotDePasse.code === 200, String(parMotDePasse.code));

    /* --- ce que la démo a le droit de faire --- */
    const ecriture = await appel("/api/presets", {
      method: "PUT", cookie: demo,
      body: { v: 1, custom: [{ id: "u-demo", kind: "bass", name: "Essai" }], overrides: {}, gear: {}, hidden: [] },
    });
    check("elle peut enregistrer ses propres fiches", ecriture.code === 200, String(ecriture.code));

    /* --- ce qu'elle ne doit surtout pas pouvoir faire --- */
    const intrus = await appel("/api/register", {
      method: "POST", cookie: demo, body: { name: "intrus", password: "un-mot-de-passe-long" },
    });
    check("elle ne peut pas créer de compte", intrus.code === 403, String(intrus.code));
    check("le refus est explicite",
      intrus.corps && /démonstration/.test(intrus.corps.error || ""), JSON.stringify(intrus.corps));

    const vueDemo = await appel("/api/session", { cookie: demo });
    check("sa session est marquée comme démonstration", vueDemo.corps.isDemo === true);
    check("l'interface ne lui proposera pas de créer un compte",
      vueDemo.corps.canRegister === false, "canRegister=" + vueDemo.corps.canRegister);

    /* --- le propriétaire garde la main --- */
    const proprio = await appel("/api/register", {
      method: "POST", body: { name: "proprietaire", password: "un-mot-de-passe-long" },
    });
    check("le premier vrai compte se crée normalement", proprio.code === 201, String(proprio.code));
    const owner = proprio.cookie;

    const invite = await appel("/api/register", {
      method: "POST", cookie: owner, body: { name: "invite", password: "un-autre-mot-de-passe" },
    });
    check("lui peut ouvrir un compte à quelqu'un", invite.code === 201, String(invite.code));
    check("sans perdre sa propre session", invite.corps.switched === false);

    const anonyme = await appel("/api/register", {
      method: "POST", body: { name: "inconnu", password: "encore-un-mot-de-passe" },
    });
    check("la création se referme pour les anonymes", anonyme.code === 403, String(anonyme.code));

    /* --- les données ne se mélangent pas --- */
    await appel("/api/presets", {
      method: "PUT", cookie: owner,
      body: { v: 1, custom: [{ id: "u-mien", kind: "amp", name: "À garder" }], overrides: {}, gear: {}, hidden: [] },
    });
    const cotéDemo = await appel("/api/presets", { cookie: demo });
    check("la démo ne voit pas les fiches du propriétaire",
      cotéDemo.corps.custom.length === 1 && cotéDemo.corps.custom[0].id === "u-demo",
      JSON.stringify(cotéDemo.corps.custom));

    /* --- la limite d'entrées --- */
    let dernier = 200;
    for (let i = 0; i < 25 && dernier !== 429; i++) dernier = (await appel("/api/demo", { method: "POST" })).code;
    check("les entrées en démo sont plafonnées par adresse", dernier === 429, String(dernier));

    /* --- l'arrêt n'égare pas les sessions --- */
    /* Par le mot de passe : le plafond d'entrées en démo vient d'être atteint
       juste au-dessus, et /api/demo refuserait. */
    const tardive = await appel("/api/login", { method: "POST", body: { name: "demo", password: "demo" } });
    const juste = tardive.cookie;          /* ouverte à l'instant, avant l'écriture différée */
    check("la session témoin est bien ouverte", tardive.code === 200 && !!juste, String(tardive.code));

    /* --- la remise à zéro au redémarrage --- */
    await arreter();
    await demarrer();

    const survivante = await appel("/api/session", { cookie: juste });
    check("une session ouverte juste avant l'arrêt survit",
      survivante.corps && survivante.corps.user && survivante.corps.user.name === "demo",
      JSON.stringify(survivante.corps));
    const apres = await appel("/api/presets", { cookie: demo });
    check("les fiches de la démo repartent de zéro",
      apres.corps && apres.corps.custom.length === 0, JSON.stringify(apres.corps && apres.corps.custom));
    const gardees = await appel("/api/presets", { cookie: owner });
    check("celles du propriétaire survivent",
      gardees.corps.custom.length === 1 && gardees.corps.custom[0].id === "u-mien",
      JSON.stringify(gardees.corps.custom));
    check("la session de la démo reste valable après redémarrage",
      apres.code === 200, String(apres.code));
  } catch (err) {
    failed++;
    console.log("  ÉCHEC exécution — " + err.message);
  } finally {
    await arreter();
    if (dossier) await fsp.rm(dossier, { recursive: true, force: true }).catch(() => {});
  }

  console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
  process.exit(failed ? 1 : 0);
})();
