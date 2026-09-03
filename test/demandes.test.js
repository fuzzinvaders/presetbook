/**
 * Les demandes de compte : un formulaire public, une file pour l'administrateur.
 *   node test/demandes.test.js
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

const RACINE = path.join(__dirname, "..");
const page = path.join(RACINE, "public", "index.html");
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE_PORT = 8760 + (process.pid % 100);

/** Un serveur jetable, avec son propre dossier de données. */
async function serveur(port, env) {
  const dossier = await fsp.mkdtemp(path.join(os.tmpdir(), "pb-dem-"));
  const p = spawn(process.execPath, [path.join(RACINE, "server.js")], {
    env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", DATA_DIR: dossier, ...env },
    stdio: "ignore",
  });
  for (let i = 0; i < 60; i++) {
    try { await fetch(`http://127.0.0.1:${port}/healthz`); break; } catch { await attendre(100); }
  }
  const appel = async (chemin, opts = {}) => {
    const r = await fetch(`http://127.0.0.1:${port}` + chemin, {
      method: opts.method || "GET",
      headers: { ...(opts.body ? { "Content-Type": "application/json" } : {}),
                 ...(opts.cookie ? { Cookie: opts.cookie } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let corps = null;
    try { corps = await r.json(); } catch { corps = null; }
    return { code: r.status, corps, cookie: (r.headers.get("set-cookie") || "").split(";")[0] || null };
  };
  return { appel, arret: async () => { p.kill(); await attendre(250);
    await fsp.rm(dossier, { recursive: true, force: true }).catch(() => {}); } };
}

(async function () {
  console.log("Demandes de compte");

  /* ---------------- fermé par défaut ---------------- */
  const ferme = await serveur(BASE_PORT, {});
  try {
    await ferme.appel("/api/register", {
      method: "POST", body: { name: "chef", password: "mot-de-passe-du-chef" } });
    const d = await ferme.appel("/api/requests", {
      method: "POST", body: { name: "curieux", email: "a@b.fr" } });
    /* 404 plutôt que 403 : annoncer une porte close la ferait chercher. */
    check("sans ALLOW_REQUESTS, la route n'existe pas", d.code === 404, String(d.code));
    const s = await ferme.appel("/api/session");
    check("et l'interface ne propose rien", s.corps.canRequest === false, String(s.corps.canRequest));
  } finally { await ferme.arret(); }

  /* ---------------- ouvert ---------------- */
  const ouvert = await serveur(BASE_PORT + 1, { ALLOW_REQUESTS: "1" });
  try {
    const neuf = await ouvert.appel("/api/session");
    check("sur une instance sans compte, on n'en demande pas : on crée le sien",
      neuf.corps.canRequest === false, String(neuf.corps.canRequest));

    const admin = await ouvert.appel("/api/register", {
      method: "POST", body: { name: "chef", password: "mot-de-passe-du-chef" } });
    const cAdmin = admin.cookie;
    check("l'administrateur est en place", admin.code === 201);

    const s1 = await ouvert.appel("/api/session");
    check("dès qu'un compte existe, la demande a un sens", s1.corps.canRequest === true);
    check("l'administrateur, lui, ne se la voit pas proposer",
      (await ouvert.appel("/api/session", { cookie: cAdmin })).corps.canRequest === false);

    const d1 = await ouvert.appel("/api/requests", {
      method: "POST", body: { name: "bassiste33", email: "bassiste@exemple.fr", note: "vu sur le forum" } });
    check("une demande valable est acceptée", d1.code === 201, JSON.stringify(d1.corps));

    /* Le nom porte un « s » : l'expression régulière de l'adresse l'avait un
       temps exclu, et « bassiste » était refusé quand « d@x.fr » passait. */
    check("un nom et une adresse ordinaires passent",
      d1.code === 201, "une adresse contenant un s doit être acceptée");

    const court = await ouvert.appel("/api/requests", {
      method: "POST", body: { name: "x", email: "a@b.fr" } });
    check("un identifiant trop court est refusé", court.code === 422, String(court.code));
    const mail = await ouvert.appel("/api/requests", {
      method: "POST", body: { name: "correct", email: "pasuneadresse" } });
    check("une adresse qui n'en est pas est refusée", mail.code === 422, String(mail.code));

    const doublon = await ouvert.appel("/api/requests", {
      method: "POST", body: { name: "autre", email: "BASSISTE@exemple.fr" } });
    check("la même adresse deux fois est acceptée sans rien dire", doublon.code === 201,
      "répondre « déjà demandé » dirait à un inconnu qui a écrit ici");

    const anonyme = await ouvert.appel("/api/requests");
    check("un anonyme ne lit pas la file", anonyme.code === 403, String(anonyme.code));

    const file = await ouvert.appel("/api/requests", { cookie: cAdmin });
    check("l'administrateur lit la file", file.code === 200 && file.corps.requests.length === 1,
      JSON.stringify(file.corps));
    const r0 = file.corps.requests[0];
    check("la demande porte l'identifiant, l'adresse et le mot",
      r0.name === "bassiste33" && r0.email === "bassiste@exemple.fr" && r0.note === "vu sur le forum",
      JSON.stringify(r0));
    check("le doublon n'a rien ajouté", file.corps.requests.length === 1);

    check("la pastille compte pour l'administrateur",
      (await ouvert.appel("/api/session", { cookie: cAdmin })).corps.requests === 1);
    check("et reste à zéro pour les autres",
      (await ouvert.appel("/api/session")).corps.requests === 0);

    const ecarte = await ouvert.appel("/api/requests/delete", {
      method: "POST", cookie: cAdmin, body: { id: r0.id } });
    check("l'administrateur écarte une demande", ecarte.code === 200, String(ecarte.code));
    check("elle a bien disparu — l'adresse ne traîne pas",
      (await ouvert.appel("/api/requests", { cookie: cAdmin })).corps.requests.length === 0);
    check("écarter deux fois ne casse rien",
      (await ouvert.appel("/api/requests/delete", { method: "POST", cookie: cAdmin,
        body: { id: r0.id } })).code === 404);
  } finally { await ouvert.arret(); }

  /* ---------------- le plafond par adresse ---------------- */
  const plein = await serveur(BASE_PORT + 2, { ALLOW_REQUESTS: "1" });
  try {
    await plein.appel("/api/register", {
      method: "POST", body: { name: "chef", password: "mot-de-passe-du-chef" } });
    const codes = [];
    for (let i = 1; i <= 4; i++) {
      codes.push((await plein.appel("/api/requests", {
        method: "POST", body: { name: "gens" + i, email: "gens" + i + "@exemple.fr" } })).code);
    }
    check("trois demandes par adresse et par jour, pas quatre",
      codes.join() === "201,201,201,429", codes.join());
  } finally { await plein.arret(); }

  /* ---------------- l'inscription ouverte rend la demande inutile ---------------- */
  const libre = await serveur(BASE_PORT + 3, { ALLOW_REQUESTS: "1", ALLOW_REGISTER: "1" });
  try {
    await libre.appel("/api/register", {
      method: "POST", body: { name: "chef", password: "mot-de-passe-du-chef" } });
    check("quand chacun peut s'inscrire, on ne demande pas",
      (await libre.appel("/api/session")).corps.canRequest === false);
  } finally { await libre.arret(); }

  /* ---------------- le réglage se laisse lire ----------------
     La comparaison était stricte : un .env enregistré avec des fins de ligne
     Windows donne « 1\r », qui ne vaut pas « 1 ». Le formulaire restait fermé
     sans un mot, et on cherche longtemps une erreur qu'on n'a pas faite. */
  for (const [etiquette, valeur, attendu] of [
    ["une valeur propre", "1", true],
    ["un retour chariot de .env Windows", "1\r", true],
    ["une espace en fin de ligne", "1 ", true],
    ["« true » plutôt que « 1 »", "true", true],
    ["une valeur vide", "", false],
    ["un « 0 » explicite", "0", false],
  ]) {
    const srv = await serveur(BASE_PORT + 10, { ALLOW_REQUESTS: valeur });
    try {
      await srv.appel("/api/register", {
        method: "POST", body: { name: "chef", password: "mot-de-passe-du-chef" } });
      const ouvert2 = (await srv.appel("/api/session")).corps.canRequest;
      check("ALLOW_REQUESTS accepte " + etiquette, ouvert2 === attendu,
        JSON.stringify(valeur) + " -> " + ouvert2);
    } finally { await srv.arret(); }
  }

  /* Une valeur qu'on ne comprend pas ne doit pas disparaître en silence. */
  {
    const { spawn: lancer } = require("node:child_process");
    const dossier = await fsp.mkdtemp(path.join(os.tmpdir(), "pb-drap-"));
    let sortie = "";
    const p = lancer(process.execPath, [path.join(RACINE, "server.js")], {
      /* Le port 0 laisse le système en choisir un libre. Un port fixe rendait
         ce contrôle tributaire de ce qui traîne sur la machine — il a échoué
         une fois pour cette seule raison, sans qu'aucun code soit en cause. */
      env: { ...process.env, PORT: "0", HOST: "127.0.0.1",
             DATA_DIR: dossier, ALLOW_REQUESTS: "oui!" },
    });
    p.stdout.on("data", (c) => { sortie += c; });
    p.stderr.on("data", (c) => { sortie += c; });
    /* On attend la ligne du journal, pas une réponse HTTP : c'est elle qu'on éprouve. */
    for (let i = 0; i < 60 && !/demandes de compte/.test(sortie); i++) await attendre(100);
    check("une valeur non reconnue est signalée au démarrage",
      /réglage ignoré, valeur non reconnue : ALLOW_REQUESTS/.test(sortie),
      sortie.slice(0, 300));
    check("et le démarrage annonce l'état du formulaire",
      /demandes de compte : fermées/.test(sortie), sortie.slice(0, 300));
    p.kill(); await attendre(250);
    await fsp.rm(dossier, { recursive: true, force: true }).catch(() => {});
  }

  /* ---------------- l'écran ---------------- */
  const w = run(page, { search: "" });
  const pb = w.__pb;
  const porteHtml = () => w.__nodes.get("gate").innerHTML;

  pb.showGate2();
  check("la porte dit ce qu'est l'application",
    porteHtml().indexOf("gate-what") > 0 && porteHtml().indexOf("retrouver ses réglages") > 0,
    porteHtml().slice(0, 200));

  check("sans le réglage, aucun bouton de demande",
    porteHtml().indexOf('data-gm="request"') < 0);

  pb.getSession().canRequest = true;
  pb.showGate2();
  check("avec le réglage, le bouton apparaît",
    porteHtml().indexOf('data-gm="request"') > 0, porteHtml().slice(-300));

  pb.setGateMode("request");
  pb.showGate2();
  const form = porteHtml();
  check("le formulaire demande un identifiant, une adresse et un mot",
    form.indexOf('name="name"') > 0 && form.indexOf('name="email"') > 0 && form.indexOf('name="note"') > 0,
    form.slice(0, 200));
  check("il dit à quoi sert l'adresse et qu'elle ne reste pas",
    form.indexOf("ne sert qu'à ça et disparaît") > 0, form.slice(0, 300));
  check("le formulaire de connexion s'efface pendant ce temps",
    form.indexOf('id="gate-form"') < 0);
  check("on peut revenir en arrière", form.indexOf('data-gm="login"') > 0);
  check("la démonstration ne s'affiche pas en même temps",
    form.indexOf('id="gate-demo"') < 0);

  pb.setGateMode("login");

  /* --- la pastille et le bandeau --- */
  pb.setSession({ id: "u", name: "chef" }, false);
  pb.setAdmin(true);
  pb.getSession().requests = 0;
  pb.renderWho();
  check("sans demande, pas de pastille", w.__nodes.get("who").innerHTML.indexOf("badge") < 0);
  pb.getSession().requests = 3;
  pb.renderWho();
  check("avec des demandes, la pastille les compte",
    /class="badge">3</.test(w.__nodes.get("who").innerHTML),
    w.__nodes.get("who").innerHTML);

  pb.announceRequests();
  const bandeau = w.__nodes.get("toast");
  check("le bandeau prévient l'administrateur", bandeau.children.length === 2,
    String(bandeau.children.length));
  check("et propose d'ouvrir l'écran", bandeau.children[1].textContent === "Voir",
    bandeau.children[1].textContent);

  pb.setAdmin(false);
  bandeau.children.length = 0;
  pb.announceRequests();
  check("un compte ordinaire n'est pas prévenu", bandeau.children.length === 0);

  /* Le formulaire vit dans la porte, pas dans le voile : brancher l'envoi sur
     le mauvais élément le rendait muet — le bouton ne faisait rien du tout. */
  const srcPorte = require("node:fs").readFileSync(page, "utf8");
  const bloc = srcPorte.slice(srcPorte.indexOf('getElementById("gate").addEventListener("submit"'),
                              srcPorte.indexOf('getElementById("gate").addEventListener("submit"') + 420);
  check("la porte écoute l'envoi du formulaire de demande",
    bloc.indexOf('ask-form') > 0, bloc.slice(0, 200));
  check("et le traite avant le chemin de connexion, qui lirait un mot de passe absent",
    bloc.indexOf('ask-form') < bloc.indexOf('elements.password'),
    bloc.indexOf('ask-form') + ' contre ' + bloc.indexOf('elements.password'));

  /* --- le message prêt à partir --- */
  const lienMail = pb.mailtoInvite("Test", "quelquun@exemple.fr",
    "https://presetbook.exemple.fr/?invite=UN-JETON");
  const corps = decodeURIComponent((lienMail.match(/body=(.*)$/) || [])[1] || "");

  check("c'est bien une adresse mailto", lienMail.indexOf("mailto:") === 0, lienMail.slice(0, 40));
  check("le destinataire est prérempli",
    decodeURIComponent(lienMail.slice(7).split("?")[0]) === "quelquun@exemple.fr",
    lienMail.slice(0, 60));
  check("l'objet est prérempli",
    decodeURIComponent((lienMail.match(/subject=([^&]*)/) || [])[1] || "")
      === "Ton invitation pour Presetbook",
    lienMail.slice(0, 90));
  check("le corps salue la personne par le nom qu'elle a demandé",
    corps.indexOf("Bonjour Test,") === 0, corps.slice(0, 40));
  check("il porte le lien d'invitation",
    corps.indexOf("https://presetbook.exemple.fr/?invite=UN-JETON") > 0, corps);
  check("il dit ce qu'il faut savoir : une fois, une semaine, mot de passe choisi",
    /une fois/.test(corps) && /une semaine/.test(corps) && /mot de passe/.test(corps), corps);

  /* RFC 6068 veut des CRLF. Avec des LF seuls, certains clients — Outlook le
     premier — recollent les paragraphes en un seul bloc. */
  check("les sauts de ligne sont des CRLF", /%0D%0A/.test(lienMail),
    "des LF seuls colleraient les paragraphes dans certains clients");
  check("et aucun LF n'est resté isolé",
    !/%0A/.test(lienMail.replace(/%0D%0A/g, "")), lienMail.slice(-120));

  /* Un mailto trop long est tronqué par certains clients : le nôtre doit rester
     très en deçà, jeton compris. */
  check("l'adresse reste courte", lienMail.length < 900, String(lienMail.length));

  /* Une apostrophe ou un accent dans le nom ne doit rien casser. */
  const accents = pb.mailtoInvite("Rémi l'Ancien", "a@b.fr", "https://x/?invite=Z");
  check("un nom accentué ou apostrophé passe l'encodage",
    decodeURIComponent((accents.match(/body=(.*)$/) || [])[1] || "")
      .indexOf("Bonjour Rémi l'Ancien,") === 0,
    accents.slice(0, 80));

  const enMail = run(page, { search: "?lang=en" }).__pb
    .mailtoInvite("Test", "a@b.fr", "https://x/?invite=Z");
  check("le message suit la langue",
    decodeURIComponent((enMail.match(/subject=([^&]*)/) || [])[1] || "")
      === "Your Presetbook invitation",
    enMail.slice(0, 80));
  check("et son corps aussi",
    decodeURIComponent((enMail.match(/body=(.*)$/) || [])[1] || "").indexOf("Hello Test,") === 0);

  const srcMail = require("node:fs").readFileSync(page, "utf8");
  check("le bouton est posé à côté de « Copier le lien »",
    srcMail.indexOf('id="req-mail"') > 0 && /Ouvrir dans la messagerie/.test(srcMail));
  check("son href est écrit après coup, jeton compris",
    /req-mail"\)/.test(srcMail.replace(/getElementById\("req-mail"\)/g, 'req-mail")'))
    || /lienMail\.setAttribute\("href"/.test(srcMail),
    "sans cela le lien resterait sur « # »");

  /* --- la session est relue après une connexion --- */
  const src = require("node:fs").readFileSync(page, "utf8");
  check("la connexion relit la session, sinon l'administrateur ne l'est pas encore",
    /refreshSession\(\)\.then\(loadFromApi\)/.test(src),
    "sans cette relecture, session.isAdmin reste celui de l'anonyme");

  /* --- les deux langues --- */
  const en = run(page, { search: "?lang=en" }).__pb;
  [["Demander un compte", "Ask for an account"],
   ["Demandes de compte", "Account requests"],
   ["Envoyer la demande", "Send the request"],
   ["Préparer l'invitation", "Prepare the invitation"],
   ["Écarter", "Dismiss"],
   ["Quelqu'un demande un compte.", "Someone is asking for an account."]].forEach(function (p) {
    check("« " + p[0] + " » est traduit", en.t(p[0]) === p[1], en.t(p[0]));
  });

  console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
  process.exit(failed ? 1 : 0);
})();
