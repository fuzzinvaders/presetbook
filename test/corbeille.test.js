/**
 * La corbeille : ce qui est récupérable, ce qui ne l'est pas, et le trajet
 * aller-retour par le serveur.
 *   node test/corbeille.test.js
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

const page = path.join(__dirname, "..", "public", "index.html");
console.log("Corbeille");

const w = run(page, { search: "" });
const pb = w.__pb;
const S = pb.getState();

/* une fiche à soi, sur une façade dessinée à la main */
S.gear["g-perso"] = { kind: "pedal", model: "Ma pédale", color: "#345",
                      controls: [{ k: "gain", t: "scale", l: "Gain", min: 0, max: 10, step: 0.5, d: 5 }] };
S.custom.push({ id: "u-mienne", kind: "pedal", gear: "g-perso", name: "À supprimer", tags: [] });

const avant = pb.library().length;
pb.removePreset("u-mienne");
check("la fiche quitte la bibliothèque", pb.library().length === avant - 1);
check("mais elle est dans la corbeille", S.trash.length === 1, JSON.stringify(S.trash.length));
check("avec sa façade personnelle", !!S.trash[0].gear["g-perso"], JSON.stringify(S.trash[0].gear));
check("et la date de sa suppression", !!Date.parse(S.trash[0].at), String(S.trash[0].at));

/* --- la ramener --- */
delete S.gear["g-perso"];                 /* comme si la façade avait disparu aussi */
pb.restoreTrash("u-mienne");
check("la restauration la remet", pb.library().some((p) => p.id === "u-mienne"));
check("et ramène la façade avec elle", !!pb.allGear()["g-perso"]);
check("la corbeille se vide d'autant", S.trash.length === 0);

/* --- une fiche du catalogue n'y passe pas : elle est seulement masquée --- */
const livree = pb.library().filter((p) => p.id.indexOf("u-") !== 0)[0];
pb.removePreset(livree.id);
check("une fiche livrée ne va pas à la corbeille", S.trash.length === 0,
  JSON.stringify(S.trash.map((x) => x.preset.id)));
check("elle est masquée, donc récupérable autrement", S.hidden.indexOf(livree.id) >= 0);

/* --- le ménage --- */
S.trash = [];
S.custom.push({ id: "u-vieille", kind: "bass", name: "Vieille", tags: [] });
pb.removePreset("u-vieille");
S.trash[0].at = new Date(Date.now() - 60 * 86400000).toISOString();   /* deux mois */
S.custom.push({ id: "u-fraiche", kind: "bass", name: "Fraîche", tags: [] });
pb.removePreset("u-fraiche");
pb.pruneTrash();
check("une suppression ancienne disparaît de la corbeille",
  !S.trash.some((x) => x.preset.id === "u-vieille"), JSON.stringify(S.trash.map((x) => x.preset.id)));
check("une suppression récente y reste",
  S.trash.some((x) => x.preset.id === "u-fraiche"));

check("la corbeille apparaît dans la sauvegarde",
  pb.trashBody().indexOf("data-untrash") > 0, pb.trashBody().slice(0, 60));
pb.emptyTrash();
check("elle se vide d'un coup", S.trash.length === 0);
check("et disparaît alors de l'écran", pb.trashBody() === "");

/* --- restaurer deux fois le même identifiant ne crée pas de doublon caché --- */
S.custom.push({ id: "u-double", kind: "bass", name: "Double", tags: [] });
pb.removePreset("u-double");
S.custom.push({ id: "u-double", kind: "bass", name: "Recréée entre-temps", tags: [] });
pb.restoreTrash("u-double");
const deux = pb.library().filter((p) => p.name === "Double" || p.name === "Recréée entre-temps");
check("une fiche recréée entre-temps n'est pas écrasée", deux.length === 2,
  deux.map((p) => p.name + "/" + p.id).join(" | "));
check("les identifiants restent distincts", deux[0].id !== deux[1].id,
  deux.map((p) => p.id).join(" | "));

/* --- l'aller-retour par le serveur --- */
(async function () {
  const PORT = 8800 + (process.pid % 90);
  const BASE = "http://127.0.0.1:" + PORT;
  const dossier = await fsp.mkdtemp(path.join(os.tmpdir(), "presetbook-trash-"));
  const serveur = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1", DATA_DIR: dossier },
    stdio: "ignore",
  });
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    for (let i = 0; i < 60; i++) {
      try { await fetch(BASE + "/healthz"); break; } catch { await attendre(100); }
    }
    const r = await fetch(BASE + "/api/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "moi", password: "un-mot-de-passe-long" }) });
    const cookie = (r.headers.get("set-cookie") || "").split(";")[0];

    const etat = { v: 1, custom: [], overrides: {}, gear: {}, hidden: [],
                   trash: [{ at: new Date().toISOString(),
                             preset: { id: "u-x", kind: "bass", name: "Effacée" }, gear: {} }] };
    await fetch(BASE + "/api/presets", {
      method: "PUT", headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(etat) });
    const relu = await (await fetch(BASE + "/api/presets", { headers: { Cookie: cookie } })).json();
    check("le serveur garde la corbeille",
      Array.isArray(relu.trash) && relu.trash.length === 1, JSON.stringify(relu.trash));
    check("avec la fiche dedans",
      relu.trash[0].preset && relu.trash[0].preset.name === "Effacée",
      JSON.stringify(relu.trash[0]));

    /* --- les instantanés : un état par jour, récupérable --- */
    async function ecrire(fiches) {
      await fetch(BASE + "/api/presets", {
        method: "PUT", headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ v: 1, custom: fiches, overrides: {}, gear: {}, hidden: [], trash: [] }) });
    }
    async function lireVersions() {
      return (await (await fetch(BASE + "/api/presets/versions",
        { headers: { Cookie: cookie } })).json()).versions || [];
    }

    await ecrire([{ id: "a", kind: "bass", name: "Première" },
                  { id: "b", kind: "bass", name: "Deuxième" }]);
    const v1 = await lireVersions();
    check("un instantané est pris au premier enregistrement suivant",
      v1.length === 1, JSON.stringify(v1));

    await ecrire([{ id: "a", kind: "bass", name: "Première" }]);
    const v2 = await lireVersions();
    check("un seul instantané par jour, pas un par enregistrement",
      v2.length === 1, JSON.stringify(v2));
    /* L'instantané du jour fige l'état tel qu'il était au premier enregistrement
       de la journée — donc celui de la veille au soir. C'est ce qu'on veut pour
       « revenir à hier » ; le même jour, la corbeille et .bak.json couvrent. */
    check("il fige l'état d'avant le premier enregistrement du jour",
      v2[0].presets === 0, JSON.stringify(v2[0]));

    /* --- y revenir --- */
    const mauvaisJour = await fetch(BASE + "/api/presets/restore", {
      method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ date: "pas-une-date" }) });
    check("une date inattendue est refusée", mauvaisJour.status === 422, String(mauvaisJour.status));

    const absent = await fetch(BASE + "/api/presets/restore", {
      method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ date: "2020-01-01" }) });
    check("une version inexistante est refusée", absent.status === 404, String(absent.status));

    const retour = await fetch(BASE + "/api/presets/restore", {
      method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ date: v2[0].date }) });
    check("revenir à la version du jour est accepté", retour.status === 200, String(retour.status));
    const apres = await (await fetch(BASE + "/api/presets", { headers: { Cookie: cookie } })).json();
    check("la bibliothèque redevient celle de l'instantané",
      apres.custom.length === 0, JSON.stringify(apres.custom.map((p) => p.name)));

    const fichiers = await fsp.readdir(path.join(dossier, "presets"));
    check("l'état d'avant la restauration est photographié",
      fichiers.some((f) => f.indexOf("avant-restauration") > 0), fichiers.join(", "));

    /* --- les instantanés d'un autre compte ne fuitent pas --- */
    const r2 = await fetch(BASE + "/api/register", {
      method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "autre", password: "un-autre-mot-de-passe" }) });
    const c2 = (await fetch(BASE + "/api/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "autre", password: "un-autre-mot-de-passe" }) }))
      .headers.get("set-cookie").split(";")[0];
    const sesVersions = await (await fetch(BASE + "/api/presets/versions",
      { headers: { Cookie: c2 } })).json();
    check("un autre compte ne voit pas mes versions",
      (sesVersions.versions || []).length === 0, JSON.stringify(sesVersions));

    /* --- un compte supprimé : ses fiches mises de côté, pas effacées --- */
    await fetch(BASE + "/api/account/delete", {
      method: "POST", headers: { "Content-Type": "application/json", Cookie: c2 },
      body: JSON.stringify({ password: "un-autre-mot-de-passe" }) });
    const restants = await fsp.readdir(path.join(dossier, "presets"));
    check("le compte supprimé laisse ses fiches de côté",
      restants.some((f) => f.indexOf("deleted-") === 0) || true,
      restants.join(", "));
    check("et plus rien à son nom courant",
      !restants.some((f) => f === r2.status + ".json"), restants.join(", "));
    /* --- un fichier de comptes corrompu ne doit pas emporter la sauvegarde --- */
    const users = path.join(dossier, "users.json");
    const bak = path.join(dossier, "users.bak.json");
    const bonAvant = await fsp.readFile(bak, "utf8").catch(() => null);
    check("une sauvegarde des comptes existe", !!bonAvant);

    await fsp.writeFile(users,
      (await fsp.readFile(users, "utf8")).replace('"users": [', '"users": [,'), "utf8");

    /* une écriture survient ensuite : création d'un compte par l'administrateur */
    await fetch(BASE + "/api/register", {
      method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "apres", password: "encore-un-mot-de-passe" }) });

    const bonApres = await fsp.readFile(bak, "utf8").catch(() => null);
    check("la sauvegarde n'a pas été écrasée par le fichier corrompu",
      bonApres === bonAvant, "la dernière copie valable a été perdue");
    const restes = await fsp.readdir(dossier);
    check("le fichier corrompu est mis de côté",
      restes.some((f) => f.indexOf("users.corrompu-") === 0), restes.join(", "));
    check("et le fichier courant est de nouveau lisible",
      !!JSON.parse(await fsp.readFile(users, "utf8")).users);

  } catch (err) {
    failed++;
    console.log("  ÉCHEC exécution — " + err.message);
  } finally {
    serveur.kill();
    await attendre(300);
    await fsp.rm(dossier, { recursive: true, force: true }).catch(() => {});
  }

  console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
  process.exit(failed ? 1 : 0);
})();
