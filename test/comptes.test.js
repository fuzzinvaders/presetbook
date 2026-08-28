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

/* --- la feuille : trois champs, et rien qui traîne dans le gestionnaire de mots de passe --- */
pb.openAccount();
const f = w.__nodes.get("veil").innerHTML;
["name", "password", "again"].forEach((champ) => {
  check("le champ « " + champ + " » est là", f.indexOf('name="' + champ + '"') > 0);
});
check("les deux mots de passe sont masqués",
  (f.match(/type="password"/g) || []).length === 2);
check("le navigateur ne propose pas le mot de passe courant",
  (f.match(/autocomplete="new-password"/g) || []).length === 2, f.slice(0, 60));
check("le formulaire n'est pas rempli automatiquement", f.indexOf('autocomplete="off"') > 0);
check("l'écran dit que la session ne change pas", f.indexOf("Ta session ne change pas") > 0);
check("il annonce l'absence de récupération", f.indexOf("récupération par courriel") > 0);

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
