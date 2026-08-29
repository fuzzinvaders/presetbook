/**
 * L'écran de création de compte : ce qu'il montre, et ce qu'il refuse
 * avant même d'appeler le serveur.
 *   node test/comptes.test.js
 */
"use strict";
const path = require("node:path");
const { run } = require("./sandbox.js");

let failed = 0;
function check(label, ok, detail) {
  if (ok) console.log("  ok    " + label);
  else { failed++; console.log("  ÉCHEC " + label + (detail ? " — " + detail : "")); }
}

const page = path.join(__dirname, "..", "public", "index.html");
console.log("Création de comptes");

/* --- l'entrée n'apparaît qu'une fois connecté --- */
const w = run(page, { search: "" });
const pb = w.__pb;
pb.renderWho();
check("aucune entrée sans session", w.__nodes.get("who").innerHTML === "");

pb.setSession({ id: "u1", name: "remi" });
pb.renderWho();
const who = w.__nodes.get("who").innerHTML;
check("le bouton Comptes apparaît une fois connecté", who.indexOf('id="btn-account"') > 0, who);
check("la déconnexion est toujours là", who.indexOf('id="btn-logout"') > 0);

/* --- ce que voit un compte ordinaire --- */
pb.setAdmin(false);
pb.openAccount();
const ordinaire = w.__nodes.get("veil").innerHTML;
check("un compte ordinaire peut changer son mot de passe",
  ordinaire.indexOf('id="pw-form"') > 0);
check("il ne peut pas ouvrir de compte",
  ordinaire.indexOf('id="acc-form"') < 0, "le formulaire de création est visible");
check("il ne voit pas la liste des comptes", ordinaire.indexOf('id="acc-list"') < 0);
check("il peut supprimer le sien", ordinaire.indexOf('id="del-form"') > 0);
check("prévenu que tout part avec", ordinaire.indexOf("toutes ses fiches") > 0);
check("et invité à sauvegarder d'abord", ordinaire.indexOf("Sauvegarde") > 0);

/* --- ce que voit l'administrateur --- */
pb.setAdmin(true);
pb.openAccount();
const f = w.__nodes.get("veil").innerHTML;

/** Le morceau de HTML d'un formulaire donné, pour ne pas compter chez le voisin. */
function form(id) {
  const d = f.indexOf('id="' + id + '"');
  return d < 0 ? "" : f.slice(d, f.indexOf("</form>", d));
}
const creation = form("acc-form");
const motDePasse = form("pw-form");

check("l'administrateur a les deux formulaires", creation.length > 0 && motDePasse.length > 0);
check("il voit la liste des comptes", f.indexOf('id="acc-list"') > 0);
check("il ne peut pas supprimer son propre compte ici",
  f.indexOf('id="del-form"') < 0, "le formulaire de suppression lui est proposé");
check("et on lui dit pourquoi", f.indexOf("premier compte créé") > 0);

["name", "password", "again"].forEach((champ) => {
  check("création : le champ « " + champ + " » est là", creation.indexOf('name="' + champ + '"') > 0);
});
check("création : les deux mots de passe sont masqués",
  (creation.match(/type="password"/g) || []).length === 2);
check("création : le navigateur ne propose pas un mot de passe existant",
  (creation.match(/autocomplete="new-password"/g) || []).length === 2);
check("création : rien n'est rempli automatiquement", creation.indexOf('autocomplete="off"') > 0);
check("l'écran dit que la session ne change pas", f.indexOf("Ta session ne change pas") > 0);
check("il annonce l'absence de récupération", f.indexOf("récupération par courriel") > 0);

["current", "password", "again"].forEach((champ) => {
  check("changement : le champ « " + champ + " » est là",
    motDePasse.indexOf('name="' + champ + '"') > 0);
});
check("changement : les trois champs sont masqués",
  (motDePasse.match(/type="password"/g) || []).length === 3);
check("changement : le mot de passe actuel est proposé par le gestionnaire",
  motDePasse.indexOf('autocomplete="current-password"') > 0);
check("changement : les deux nouveaux ne le sont pas",
  (motDePasse.match(/autocomplete="new-password"/g) || []).length === 2);
check("il prévient que les autres sessions tombent",
  motDePasse.indexOf("autres sessions seront fermées") > 0);

/* --- les refus du changement, avant tout appel réseau --- */
function essaiPw(actuel, neuf, encore) {
  pb.openAccount();
  pb.submitPassword({
    elements: { current: { value: actuel }, password: { value: neuf }, again: { value: encore } },
    querySelector: () => ({ disabled: false }),
  });
  const err = w.__nodes.get("pw-err");
  return err ? err.textContent : "";
}
check("deux nouveaux différents sont refusés",
  essaiPw("ancien-mot-de-passe", "nouveau-mot-1", "nouveau-mot-2").indexOf("identiques") > 0,
  essaiPw("ancien-mot-de-passe", "nouveau-mot-1", "nouveau-mot-2"));
check("un nouveau trop court est refusé",
  essaiPw("ancien-mot-de-passe", "court", "court").indexOf("10 caractères") > 0);
check("réutiliser l'ancien est refusé",
  essaiPw("le-meme-mot-de-passe", "le-meme-mot-de-passe", "le-meme-mot-de-passe")
    .indexOf("identique à l'ancien") > 0,
  essaiPw("le-meme-mot-de-passe", "le-meme-mot-de-passe", "le-meme-mot-de-passe"));

/* --- les refus, avant tout appel réseau --- */
function essai(nom, mdp, encore) {
  const veil = w.__nodes.get("veil");
  pb.openAccount();
  const faux = {
    elements: { name: { value: nom }, password: { value: mdp }, again: { value: encore } },
    querySelector: () => ({ disabled: false }),
  };
  pb.submitAccount(faux);
  const err = w.__nodes.get("acc-err");
  return err ? err.textContent : "";
}

check("deux mots de passe différents sont refusés",
  essai("alice", "motdepasse123", "motdepasse124").indexOf("identiques") > 0,
  essai("alice", "motdepasse123", "motdepasse124"));
check("un mot de passe trop court est refusé",
  essai("alice", "court", "court").indexOf("10 caractères") > 0,
  essai("alice", "court", "court"));
check("son propre identifiant est refusé",
  essai("remi", "motdepasse123", "motdepasse123").indexOf("ton propre identifiant") > 0,
  essai("remi", "motdepasse123", "motdepasse123"));
check("la casse ne contourne pas ce refus",
  essai("REMI", "motdepasse123", "motdepasse123").indexOf("ton propre identifiant") > 0,
  essai("REMI", "motdepasse123", "motdepasse123"));

/* un cas valide part au réseau : dans le bac à sable il échoue, mais pas sur une validation */
const auReseau = essai("alice", "motdepasse123", "motdepasse123");
check("un cas valide n'est pas retenu par la validation",
  auReseau.indexOf("identiques") < 0 && auReseau.indexOf("10 caractères") < 0,
  auReseau);

/* --- une invitation, côté page --- */
const inv = run(page, { search: "?invite=UN-JETON-DE-TEST" });
check("le jeton est lu depuis l'URL", inv.__pb.getInvite() === "UN-JETON-DE-TEST",
  String(inv.__pb.getInvite()));
inv.__pb.showGate2();
const porteInv = inv.__nodes.get("gate").innerHTML;
check("l'écran ouvre directement la création de compte",
  porteInv.indexOf('data-gm="register" aria-selected="true"') > 0, porteInv.slice(0, 140));
check("il explique que la personne choisit ses identifiants",
  porteInv.indexOf("Choisis toi-même ton identifiant") > 0);
check("le lien d'invitation se fabrique depuis l'origine",
  inv.__pb.inviteLink("abc").indexOf("?invite=abc") > 0, inv.__pb.inviteLink("abc"));

const sansInv = run(page, { search: "" });
check("sans jeton, rien n'est retenu", sansInv.__pb.getInvite() === null);

/* --- le compte de démonstration, côté page --- */
const g = run(page, { search: "" });
g.__pb.showGate();
check("sans démonstration configurée, aucun bouton",
  g.__nodes.get("gate").innerHTML.indexOf("gate-demo") < 0);

g.__pb.setDemo({ name: "demo" });
g.__pb.showGate();
const porte = g.__nodes.get("gate").innerHTML;
check("le bouton d'entrée apparaît", porte.indexOf('id="gate-demo"') > 0, porte.slice(0, 80));
/* La promesse, pas la tournure : le visiteur doit savoir que rien ne tient, et
   qu'il arrive sur un écran propre plutôt que sur les essais d'un inconnu. */
check("l'écran prévient de la remise à zéro", porte.indexOf("repart de zéro") > 0, porte.slice(0, 200));
check("il dit que l'écran est propre à l'arrivée", porte.indexOf("à ton arrivée") > 0);
check("et par où repartir avec ce qu'on y a fait", porte.indexOf("Sauvegarde") > 0);
check("aucun mot de passe n'est affiché", porte.indexOf("demo</") < 0 && !/value="demo"/.test(porte));

g.__pb.setSession({ id: "d", name: "demo" }, true);
g.__pb.renderWho();
const enDemo = g.__nodes.get("who").innerHTML;
check("l'en-tête dit qu'on est en démonstration", enDemo.indexOf("démonstration") > 0, enDemo);
check("le bouton Comptes disparaît en démonstration",
  enDemo.indexOf('id="btn-account"') < 0, enDemo);

g.__pb.setSession({ id: "u", name: "remi" }, false);
g.__pb.renderWho();
check("il revient pour un vrai compte",
  g.__nodes.get("who").innerHTML.indexOf('id="btn-account"') > 0);

/* --- la version anglaise de l'écran --- */
const en = run(page, { search: "?lang=en" }).__pb;
en.setSession({ id: "u1", name: "remi" });
en.renderWho();
en.openAccount();
check("l'écran est traduit", en.t("Créer le compte") === "Create the account", en.t("Créer le compte"));
check("les refus sont traduits",
  en.t("Les deux mots de passe ne sont pas identiques.") === "The two passwords do not match.");

console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
process.exit(failed ? 1 : 0);
