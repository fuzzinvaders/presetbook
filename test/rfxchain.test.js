/**
 * Vérifie le codec .RfxChain sur un fichier réel.
 *   node test/rfxchain.test.js [chemin.RfxChain]
 * Sans argument, utilise l'échantillon de test/fixtures.
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const RFX = require("../public/rfxchain.js");

const file = process.argv[2] || path.join(__dirname, "fixtures", "90srock.RfxChain");
const original = fs.readFileSync(file, "latin1");

let failed = 0;
function check(label, ok, detail) {
  if (ok) console.log("  ok    " + label);
  else { failed++; console.log("  ÉCHEC " + label + (detail ? " — " + detail : "")); }
}
function near(a, b, eps) { return Math.abs(a - b) <= (eps === undefined ? 0.001 : eps); }

console.log("Lecture de " + path.basename(file));
const parsed = RFX.parse(original);
check("6 effets détectés", parsed.fx.length === 6, parsed.fx.length + " trouvés");

const names = parsed.fx.map((f) => f.name);
check("plugins identifiés", names.join(",") === "BOD,ReaEQ,ReaComp,Saturation,ReaVerbate,ReaTune", names.join(","));
check("bypass lu", parsed.fx.map((f) => (f.bypassed ? 1 : 0)).join("") === "000011",
  parsed.fx.map((f) => (f.bypassed ? 1 : 0)).join(""));

const bod = parsed.fx[0];
check("BOD décodé en XML", bod.decoded === "bod");
check("BOD_Input = 0,694", near(bod.params.Input, 0.694));
check("BOD_Drive = 0,079", near(bod.params.Drive, 0.079));
check("BOD_Bass = 0,551", near(bod.params.Bass, 0.551));
check("BOD_Treble = 0,652", near(bod.params.Treble, 0.652));
check("BOD_Output = 0,903", near(bod.params.Output, 0.903));

const eq = parsed.fx[1];
check("ReaEQ décodé", eq.decoded === "reaeq");
check("6 bandes", (eq.bands || []).length === 6, (eq.bands || []).length + "");
if (eq.bands && eq.bands.length === 6) {
  const f = eq.bands.map((b) => Math.round(b.freq));
  const g = eq.bands.map((b) => Math.round(b.gainDb * 10) / 10);
  const t = eq.bands.map((b) => b.typeName);
  check("fréquences 40/90/300/900/2500/6500", f.join(",") === "40,90,300,900,2500,6500", f.join(","));
  check("gains 0/+2/−2/+3/+2,5/0", g.join(",") === "0,2,-2,3,2.5,0", g.join(","));
  check("types High Pass / Band / Low Pass", t[0] === "High Pass" && t[1] === "Band" && t[5] === "Low Pass", t.join(","));
  check("bande passante 1,6 sur 90 Hz", near(eq.bands[1].bw, 1.6));
}

const js = parsed.fx[3];
check("JSFX reconnu (loser/Saturation)", js.path === "loser/Saturation", js.path);
check("curseur Drive = 0,05", js.sliders[0] === "0.05", js.sliders[0]);

const comp = parsed.fx[2];
check("ReaComp décodé", comp.decoded === "reacomp", comp.decoded);
if (comp.params) {
  check("Threshold −5,0 dB", near(comp.params.threshold, -5, 0.02), String(comp.params.threshold));
  check("Ratio 4,00 : 1", near(comp.params.ratio, 4, 0.01), String(comp.params.ratio));
  check("Attack 20 ms", near(comp.params.attack, 20, 0.01), String(comp.params.attack));
  check("Release 90 ms", near(comp.params.release, 90, 0.05), String(comp.params.release));
  check("RMS size 5 ms", near(comp.params.rms, 5, 0.01), String(comp.params.rms));
  check("Knee 6 dB", near(comp.params.knee, 6, 0.01), String(comp.params.knee));
  check("Dry à −∞ (−150 dB)", near(comp.params.dry, -150, 0.01), String(comp.params.dry));
  check("Wet 0 dB", near(comp.params.wet, 0, 0.01), String(comp.params.wet));
  check("Detector Main inputs", comp.params.detector === "Main inputs", comp.params.detector);
}

check("Lowpass ReaComp 20000 Hz", near(comp.params.lowpass, 20000, 1), String(comp.params.lowpass));
check("Hipass ReaComp 0 Hz", near(comp.params.hipass, 0, 1), String(comp.params.hipass));

const verb = parsed.fx[4];
check("ReaVerbate décodé", verb.decoded === "reaverbate", verb.decoded);
if (verb.params) {
  check("Lowpass 3000 Hz", near(verb.params.lowpass, 3000, 1), String(verb.params.lowpass));
  check("Hipass 250 Hz", near(verb.params.hipass, 250, 1), String(verb.params.hipass));
  check("Dampening ≈ 80", near(verb.params.damp, 79.7, 0.5), String(verb.params.damp));
  check("Width 0,575", near(verb.params.width, 0.575, 0.001), String(verb.params.width));
}

const opaques = parsed.fx.filter((f) => f.decoded === "opaque").map((f) => f.name);
check("bloc conservé : ReaTune", opaques.join(",") === "ReaTune", opaques.join(","));

/* --- aller-retour sans modification : le fichier doit être identique --- */
const rebuilt = RFX.build(parsed);
const norm = (s) => s.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").replace(/\n+$/, "");
check("reconstruction à l'identique", norm(rebuilt) === norm(original),
  "longueurs " + norm(rebuilt).length + " vs " + norm(original).length);

/* --- conversion en maillons Presetbook --- */
const chain = RFX.toChain(parsed);
check("5 maillons + 1 = 6", chain.length === 6);
check("nom Presetbook du BOD", chain[0].plugin === "TSE BOD", chain[0].plugin);
check("nom Presetbook du JSFX", chain[3].plugin === "JS: Saturation", chain[3].plugin);
check("BOD bass dans le maillon", near(chain[0].p.bass, 0.551));
check("bandes portées dans le maillon", chain[1].bands.length === 6);
check("maillon ReaVerbate hors circuit", chain[4].on === false);
check("empreinte rfx conservée", !!chain[0].rfx && !!chain[2].rfx.chunk64);

/* --- réécriture depuis les maillons --- */
const out = RFX.fromChain(chain);
const reparsed = RFX.parse(out);
check("réécriture relisible", reparsed.fx.length === 6, reparsed.fx.length + "");
check("BOD relu après réécriture", near(reparsed.fx[0].params.Bass, 0.551),
  reparsed.fx[0].params ? String(reparsed.fx[0].params.Bass) : "aucun paramètre");
check("ReaEQ relu après réécriture",
  reparsed.fx[1].bands && Math.round(reparsed.fx[1].bands[3].freq) === 900 &&
  near(reparsed.fx[1].bands[3].gainDb, 3, 0.01),
  reparsed.fx[1].bands ? JSON.stringify(reparsed.fx[1].bands[3]) : "aucune bande");
check("ReaComp réencodé à l'octet près", reparsed.fx[2].chunk64 === parsed.fx[2].chunk64,
  "avant " + parsed.fx[2].chunk64.length + " / après " + reparsed.fx[2].chunk64.length);
check("ReaVerbate réencodé à l'octet près", reparsed.fx[4].chunk64 === parsed.fx[4].chunk64,
  "avant " + parsed.fx[4].chunk64.length + " / après " + reparsed.fx[4].chunk64.length);
check("bloc opaque intact (ReaTune)", reparsed.fx[5].chunk64 === parsed.fx[5].chunk64);
check("bypass préservé", reparsed.fx.map((f) => (f.bypassed ? 1 : 0)).join("") === "000011",
  reparsed.fx.map((f) => (f.bypassed ? 1 : 0)).join(""));

/* --- modification puis relecture --- */
const edited = JSON.parse(JSON.stringify(chain));
edited[0].p.drive = 0.42;
edited[1].bands[3].g = -6;
edited[3].p.drive = 0.2;
edited[2].p.threshold = -18.5;
edited[2].p.ratio = 6;
edited[2].p.attack = 45;
edited[2].p.hipass = 120;
edited[4].p.wet = -24;
edited[4].p.room = 35;
edited[4].p.lowpass = 5200;
const outEdited = RFX.parse(RFX.fromChain(edited));
check("Drive du BOD modifié", near(outEdited.fx[0].params.Drive, 0.42), String(outEdited.fx[0].params.Drive));
check("gain de bande modifié", near(outEdited.fx[1].bands[3].gainDb, -6, 0.01), String(outEdited.fx[1].bands[3].gainDb));
check("curseur JSFX modifié", outEdited.fx[3].sliders[0] === "0.2", outEdited.fx[3].sliders[0]);
check("Threshold ReaComp modifié", near(outEdited.fx[2].params.threshold, -18.5, 0.02), String(outEdited.fx[2].params.threshold));
check("Ratio ReaComp modifié", near(outEdited.fx[2].params.ratio, 6, 0.01), String(outEdited.fx[2].params.ratio));
check("Attack ReaComp modifié", near(outEdited.fx[2].params.attack, 45, 0.02), String(outEdited.fx[2].params.attack));
check("Hipass ReaComp modifié", near(outEdited.fx[2].params.hipass, 120, 1), String(outEdited.fx[2].params.hipass));
check("Wet ReaVerbate modifié", near(outEdited.fx[4].params.wet, -24, 0.02), String(outEdited.fx[4].params.wet));
check("Room ReaVerbate modifié", near(outEdited.fx[4].params.room, 35, 0.1), String(outEdited.fx[4].params.room));
check("Lowpass ReaVerbate modifié", near(outEdited.fx[4].params.lowpass, 5200, 1), String(outEdited.fx[4].params.lowpass));


/* --- écrire une chaîne sans aucun import --- */
const aLaMain = [
  { plugin: 'TSE BOD', on: true, p: { input: 0.7, drive: 0.2, blend: 0.6, bass: 0.55,
                                      treble: 0.6, presence: 0.5, level: 0.8, output: 0.9 } },
  { plugin: 'ReaComp', on: true, p: { threshold: -12, ratio: 4, attack: 20, release: 90,
                                      knee: 6, rms: 5, wet: 0, dry: -150, lowpass: 20000,
                                      hipass: 0, detector: 'Main inputs' } },
  { plugin: 'ReaEQ', on: false, bands: [{ t: 'High Pass', f: 40, g: 0, bw: 1 },
                                        { t: 'Band', f: 900, g: 3, bw: 1 }] },
  { plugin: 'JS: Saturation', on: true, p: { drive: 0.08 } }
];
const neuf = RFX.parse(RFX.fromChain(aLaMain));
check("chaîne fabriquée de zéro relisible", neuf.fx.length === 4, String(neuf.fx.length));
check("identités correctes", neuf.fx.map(function(f){ return f.name; }).join(",") ===
  "BOD,ReaComp,ReaEQ,Saturation", neuf.fx.map(function(f){ return f.name; }).join(","));
check("réglages du BOD écrits", near(neuf.fx[0].params.Drive, 0.2), String(neuf.fx[0].params.Drive));
check("réglages de ReaComp écrits", near(neuf.fx[1].params.threshold, -12, 0.02) &&
  near(neuf.fx[1].params.attack, 20, 0.02), JSON.stringify(neuf.fx[1].params));
check("bandes de ReaEQ écrites", neuf.fx[2].bands.length === 2 &&
  Math.round(neuf.fx[2].bands[1].freq) === 900, JSON.stringify(neuf.fx[2].bands));
check("curseur JSFX écrit", neuf.fx[3].sliders[0] === "0.08", neuf.fx[3].sliders[0]);
check("bypass respecté", neuf.fx.map(function(f){ return f.bypassed ? 1 : 0; }).join("") === "0010",
  neuf.fx.map(function(f){ return f.bypassed ? 1 : 0; }).join(""));
check("un identifiant d effet par maillon",
  (RFX.fromChain(aLaMain).match(/FXID {/g) || []).length === 4);

var refusPlugin = null;
try { RFX.fromChain([{ plugin: "Autre plugin", on: true, p: {} }]); }
catch (e) { refusPlugin = e.message; }
check("un plugin sans gabarit fait refuser l export", !!refusPlugin, "aucune erreur");
check("le refus nomme le plugin et les possibles",
  !!refusPlugin && refusPlugin.indexOf("Autre plugin") >= 0 && refusPlugin.indexOf("ReaComp") >= 0,
  refusPlugin || "");
check("les gabarits couvrent les cinq plugins établis",
  Object.keys(RFX.TEMPLATES).length === 5, String(Object.keys(RFX.TEMPLATES).length));

/* --- l'export se trouve depuis la carte, sans ouvrir l'éditeur --- */
const { run } = require("./sandbox.js");
const page = path.join(__dirname, "..", "public", "index.html");
function boutons(opts) {
  const w = run(page, opts);
  return (w.__nodes.get("list").innerHTML.match(/data-act="rfx"/g) || []).length;
}
check("une carte de chaîne porte le bouton d'export",
  boutons({ search: "?kind=reaper", RFX }) === 1, String(boutons({ search: "?kind=reaper", RFX })));
check("sans le codec servi, le bouton disparaît",
  boutons({ search: "?kind=reaper" }) === 0, String(boutons({ search: "?kind=reaper" })));
check("une carte d'instrument n'en porte pas",
  boutons({ search: "?kind=bass", RFX }) === 0, String(boutons({ search: "?kind=bass", RFX })));

/* exportRfx accepte une fiche : c'est ce qui permet l'appel depuis la carte */
const app = run(page, { search: "", RFX });
const chaine = app.__pb.library().filter((p) => p.kind === "reaper")[0];
let ecrit = null;
try { ecrit = RFX.fromChain(chaine.chain); } catch (e) { ecrit = "ÉCHEC : " + e.message; }
check("la chaîne d'une carte s'écrit sans passer par l'éditeur",
  typeof ecrit === "string" && ecrit.indexOf("BYPASS") === 0, String(ecrit).slice(0, 60));
console.log("\n" + (failed ? failed + " échec(s)" : "tout est vert"));
process.exit(failed ? 1 : 0);
