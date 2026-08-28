/**
 * La licence est annoncée, et le widget de dons ne s'invite pas n'importe où.
 *   node test/licence.test.js
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
const page = path.join(racine, "public", "index.html");
console.log("Licence et dons");

/* --- la licence est là, entière, et annoncée dans les sources --- */
const licence = fs.readFileSync(path.join(racine, "LICENSE"), "utf8");
check("le fichier LICENSE existe", licence.length > 30000, licence.length + " octets");
check("c'est bien l'AGPL v3", licence.indexOf("GNU AFFERO GENERAL PUBLIC LICENSE") >= 0 &&
  licence.indexOf("Version 3, 19 November 2007") >= 0);
check("l'article réseau y est", licence.indexOf("13. Remote Network Interaction") >= 0);
check("le texte n'a pas été tronqué", licence.indexOf("How to Apply These Terms") >= 0);

["public/index.html", "public/rfxchain.js", "server.js"].forEach((f) => {
  const src = fs.readFileSync(path.join(racine, f), "utf8");
  check(f + " porte son SPDX", src.indexOf("SPDX-License-Identifier: AGPL-3.0-or-later") >= 0);
});

/* --- le pied de page dit les trois choses, sans dépendre d'un tiers --- */
const fr = run(page, { search: "" });
const pied = fr.__nodes.get("foot").innerHTML;
check("le pied de page nomme la licence", pied.indexOf("AGPL-3.0") >= 0, pied.slice(0, 80));
check("il pointe vers le texte de la licence",
  pied.indexOf("gnu.org/licenses/agpl-3.0") >= 0);
check("il dit que c'est gratuit", pied.indexOf("Gratuit") >= 0);
check("il propose le don sans l'exiger", pied.indexOf("bienvenus, jamais demandés") >= 0);
check("le lien de don marche sans le script du tiers",
  pied.indexOf("https://ko-fi.com/" + fr.__pb.kofiUser()) >= 0, pied.slice(-120));
check("les liens sortants sont protégés",
  (pied.match(/rel="noopener noreferrer"/g) || []).length ===
  (pied.match(/target="_blank"/g) || []).length);

/* --- le widget : jamais avant l'ouverture de session, jamais sur la page publiée --- */
const w = run(page, { search: "" });
check("rien n'est monté au premier rendu", w.__pb.kofiMounted() === false);

w.window.claude = { use: function () { return Promise.resolve(null); } };
w.__pb.mountKofi();
check("la page publiée n'appelle pas le tiers", w.__pb.kofiMounted() === false);

const w2 = run(page, { search: "" });
w2.__pb.mountKofi();
check("ailleurs, le script est bien ajouté", w2.__pb.kofiMounted() === true);
const scripts = w2.document.head ? [] : w2.document.body.children;
check("il est ajouté au document", scripts.length >= 1, String(scripts.length));
check("il vise bien l'adresse de ko-fi",
  scripts.length > 0 && String(scripts[scripts.length - 1].src).indexOf("storage.ko-fi.com") > 0,
  scripts.length ? String(scripts[scripts.length - 1].src) : "aucun script");

const w3 = run(page, { search: "" });
w3.__pb.mountKofi();
w3.__pb.mountKofi();
const apres = w3.document.body.children.filter((x) => String(x.src || "").indexOf("ko-fi") > 0);
check("deux appels n'ajoutent qu'un script", apres.length === 1, String(apres.length));

/* --- la formule du bouton suit la langue --- */
const en = run(page, { search: "?lang=en" }).__pb;
check("le bouton de don est traduit", en.t("Me soutenir") === "Support me", en.t("Me soutenir"));

console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
process.exit(failed ? 1 : 0);
