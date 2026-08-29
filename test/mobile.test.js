/**
 * Le téléphone et l'installation : la balise viewport, les règles étroites,
 * le manifeste, les icônes, et la stratégie du service worker.
 *   node test/mobile.test.js
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { run } = require("./sandbox.js");

let failed = 0;
function check(label, ok, detail) {
  if (ok) console.log("  ok    " + label);
  else { failed++; console.log("  ÉCHEC " + label + (detail ? " — " + detail : "")); }
}

const racine = path.join(__dirname, "..");
const pageF = path.join(racine, "public", "index.html");
const src = fs.readFileSync(pageF, "utf8");
const tete = src.slice(0, 2000);
console.log("Téléphone et installation");

/* --- la balise sans laquelle tout le reste est inutile --- */
check("la balise viewport est là", /<meta name="viewport"/.test(tete), tete.slice(0, 60));
check("elle suit la largeur de l'appareil",
  /width=device-width/.test(tete) && /initial-scale=1/.test(tete));
check("elle couvre les encoches", /viewport-fit=cover/.test(tete));
check("l'encodage est déclaré", /<meta charset="utf-8">/.test(tete));
check("les deux thèmes sont annoncés",
  (tete.match(/name="theme-color"/g) || []).length === 2, tete);

/* --- les règles qui empêchaient le débordement mesuré à 390 px --- */
function regle(sel) {
  const i = src.indexOf(sel);
  return i < 0 ? "" : src.slice(i, src.indexOf("}", i) + 1);
}
check("la rangée d'onglets passe à la ligne", /flex-wrap:wrap/.test(regle(".tabs{")), regle(".tabs{"));
check("le sélecteur de regroupement aussi", /flex-wrap:wrap/.test(regle(".seg{")));
check("le pied des cartes aussi", /flex-wrap:wrap/.test(regle(".card-f{")));
check("une colonne ne dépasse jamais l'écran",
  /minmax\(min\(300px,100%\),1fr\)/.test(regle(".grid{")), regle(".grid{"));
check("les marges tiennent compte des encoches",
  /env\(safe-area-inset-left\)/.test(regle(".wrap{")));
check("un bloc de règles pour les écrans étroits existe", src.indexOf("@media (max-width:620px)") > 0);
check("les cibles tactiles sont agrandies",
  src.indexOf("@media (pointer:coarse)") > 0 && /min-height:40px/.test(src));
check("les champs ne font pas zoomer iOS",
  src.indexOf("input[type=\"password\"], textarea, select, label.fld input{ font-size:16px; }") > 0 ||
  /font-size:16px;\s*}/.test(src.slice(src.indexOf("Le clavier iOS"))), "règle des 16 px absente");

/* --- le manifeste --- */
const man = JSON.parse(fs.readFileSync(path.join(racine, "public", "manifest.webmanifest"), "utf8"));
check("le manifeste est un JSON valide", !!man.name);
check("il demande une fenêtre autonome", man.display === "standalone", man.display);
check("les chemins sont relatifs, donc il marche sous un sous-dossier",
  man.start_url === "." && man.scope === ".", man.start_url + " / " + man.scope);
check("il déclare une icône masquable",
  man.icons.some((i) => i.purpose === "maskable"));
check("il déclare le 512 en PNG",
  man.icons.some((i) => i.sizes === "512x512" && i.type === "image/png"));
man.icons.forEach((i) => {
  check("l'icône « " + i.src + " » existe", fs.existsSync(path.join(racine, "public", i.src)));
});
check("la page renvoie au manifeste", /<link rel="manifest" href="manifest.webmanifest">/.test(tete));
check("l'icône iOS est référencée et présente",
  /apple-touch-icon/.test(tete) && fs.existsSync(path.join(racine, "public", "icone-180.png")));

/* --- le service worker : la stratégie compte plus que son existence --- */
const sw = fs.readFileSync(path.join(racine, "public", "sw.js"), "utf8");
check("le service worker existe", sw.length > 500);
check("il va au réseau d'abord",
  sw.indexOf("fetch(req)") < sw.indexOf("caches.match(req)"),
  "le cache est consulté avant le réseau : une version périmée serait servie");
check("il ne met jamais l'API en cache", /\/api\//.test(sw) && /horsCache/.test(sw));
check("il laisse /healthz au réseau", /healthz/.test(sw));
check("il ignore les autres origines", /url.origin !== self.location.origin/.test(sw));
check("il ne met en cache que les réponses valables", /rep.ok && rep.type === "basic"/.test(sw));
check("il prend la main immédiatement",
  /skipWaiting/.test(sw) && /clients.claim/.test(sw));
check("il fait le ménage des anciens caches", /caches.delete/.test(sw));
check("il répond quelque chose hors ligne sans cache", /503/.test(sw));
check("l'enregistrement revalide le script",
  /updateViaCache: "none"/.test(src),
  "sans cela le navigateur garderait le worker en cache une heure");

/* --- le bouton d'installation --- */
const w = run(pageF, { search: "" });
const pb = w.__pb;
const bouton = w.__nodes.get("btn-install");
/* Le gabarit le pose caché — le bac à sable ne lit pas les attributs du HTML,
   donc on le vérifie dans la source, puis on éprouve le comportement. */
check("le gabarit le pose caché", /id="btn-install" hidden/.test(src), "attribut hidden absent");
pb.installable();
check("il reste caché tant que rien n'est proposé", bouton.hidden === true, String(bouton.hidden));
check("il porte un libellé", bouton.innerHTML === "Installer", bouton.innerHTML);

pb.setInstallPrompt({ prompt: function () { this.appele = true; } });
pb.installable();
check("il apparaît quand le navigateur le propose", bouton.hidden === false, String(bouton.hidden));

let demande = false;
pb.setInstallPrompt({ prompt: function () { demande = true; } });
pb.doInstall();
check("le clic déclenche l'invite du navigateur", demande === true);
pb.installable();
check("et le bouton repart", bouton.hidden === true, String(bouton.hidden));

/* L'invite d'installation et le jeton d'invitation sont deux choses. Elles ont
   porté le même nom de variable, si bien qu'un navigateur proposant d'installer
   l'application faisait croire à la page qu'elle tenait une invitation : sur une
   instance neuve, la création du premier compte échouait sur « Cette invitation
   n'est plus valable. » */
const propre = run(pageF, { search: "" }).__pb;
check("aucune invitation au départ", propre.getInvite() === null, String(propre.getInvite()));
propre.setInstallPrompt({ prompt: function () {} });
check("le navigateur proposant l'installation n'invente pas d'invitation",
  propre.getInvite() === null, JSON.stringify(propre.getInvite()));

const invite = run(pageF, { search: "?invite=UN-JETON" }).__pb;
invite.setInstallPrompt({ prompt: function () {} });
check("et il n'écrase pas un vrai jeton", invite.getInvite() === "UN-JETON",
  String(invite.getInvite()));

const en = run(pageF, { search: "?lang=en" }).__pb;
check("le bouton est traduit", en.t("Installer") === "Install", en.t("Installer"));

/* --- le raccourci du manifeste ouvre bien un écran --- */
const neuf = run(pageF, { search: "?new=1" });
check("« ?new=1 » ouvre le choix du genre",
  neuf.__nodes.get("veil").innerHTML.indexOf("data-newkind") > 0,
  neuf.__nodes.get("veil").innerHTML.slice(0, 80));
man.shortcuts.forEach((r) => {
  check("le raccourci « " + r.name + " » vise une URL relative", r.url.indexOf("?") === 0, r.url);
});

console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
process.exit(failed ? 1 : 0);
