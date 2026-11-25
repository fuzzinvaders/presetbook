/**
 * Presetbook — le Zoom B2 FOUR : catalogue des effets et règles de contrôle.
 * Copyright (C) 2026 fuzzinvaders
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Tout ce qui figure ici est relevé dans les documents de Zoom, et rien d'autre :
 *
 *   - « B2 FOUR Effect Types and Parameters » (©2023, réf. Z2I-4875-01) : les
 *     104 effets, leurs paramètres, leurs plages et leurs listes de valeurs ;
 *   - le mode d'emploi du B2 FOUR : 300 mémoires de patch, 5 effets au plus,
 *     un seul effet des catégories ampli et pédale, tempo de 40 à 250 bpm, les
 *     caractères permis dans un nom, et les six modèles de DI ;
 *   - « B2 FOUR Patch Memory List » (Preset Ver. 1.00, réf. Z2I-4880-01) : la
 *     numérotation réelle (patchs d'usine 001 à 250) et la longueur des noms.
 *
 * Ce que ces documents ne donnent pas n'est pas inventé : aucune valeur par
 * défaut (elles n'y figurent pas), aucune unité qui n'y est pas imprimée, aucun
 * pas de réglage pour les fréquences (seules les bornes sont publiées). Les
 * descriptions d'effets de Zoom ne sont pas reprises — leur reproduction est
 * interdite par le document — : seuls les faits le sont (noms, paramètres,
 * plages).
 *
 * Ce format décrit un patch pour Presetbook. Ce n'est pas un fichier que le
 * B2 FOUR peut charger : on recopie les réglages sur l'appareil.
 *
 * Le module sert la page (window.ZB2F) et les tests sous Node (module.exports).
 */
(function (root) {
  "use strict";

  var DEVICE = "zoom-b2four";
  /** Le document dont le catalogue est tiré. Une autre version = un autre jeu d'effets possible. */
  var CATALOG = "B2FOUR-FX/Z2I-4875-01";
  /** Version du format d'échange de Presetbook (le « v » des enveloppes). */
  var FORMAT = 1;

  var LIMITS = {
    maxFx: 5,                          /* mode d'emploi : « Up to 5 effects » */
    uniqueCats: ["BASS AMP", "PEDAL"], /* un seul ampli, une seule pédale par patch */
    patchMin: 1, patchMax: 300,        /* 300 mémoires, numérotées à partir de 001 */
    factoryMax: 250,                   /* liste d'usine : 001 à 250, sans trou */
    tempoMin: 40, tempoMax: 250,
    /* Caractères permis dans un nom de patch, d'après le mode d'emploi. */
    nameChars: /^[!%&'+,\-.=_ A-Za-z0-9]*$/,
    /* Aucune longueur n'est documentée ; les 250 noms d'usine n'en dépassent
       jamais 14. Au-delà, on prévient sans refuser. */
    nameObserved: 14
  };

  /** Les six modèles de DI et la position OFF. Réglage global de l'appareil. */
  var DI_MODELS = ["OFF", "TUBE 1", "TUBE 2", "TUBE 3", "SOLID STATE 1", "SOLID STATE 2", "SOLID STATE 3"];

  /**
   * Les catégories de Zoom, dans l'ordre du document. « groupe » range chacune
   * dans les familles demandées pour Presetbook ; le nom de Zoom reste la
   * référence.
   */
  var CATEGORIES = [
    { id: "DYNAMICS",    l: "Dynamique",             groupe: "Compresseurs et limiteurs" },
    { id: "FILTER",      l: "Filtres et égaliseurs", groupe: "Égaliseurs et filtres" },
    { id: "DRIVE",       l: "Saturation",            groupe: "Overdrive, distorsion et fuzz" },
    { id: "PREAMP",      l: "Préamplis",             groupe: "Préamplis et amplificateurs" },
    { id: "MODULATION",  l: "Modulation",            groupe: "Chorus, flanger et modulation" },
    { id: "PITCH SHIFT", l: "Transposition",         groupe: "Traitements complémentaires" },
    { id: "SYNTH",       l: "Synthé",                groupe: "Traitements complémentaires" },
    { id: "DELAY",       l: "Delays",                groupe: "Delay et reverb" },
    { id: "REVERB",      l: "Réverbérations",        groupe: "Delay et reverb" },
    { id: "SFX",         l: "Effets spéciaux",       groupe: "Traitements complémentaires" },
    { id: "PEDAL",       l: "Pédale d'expression",   groupe: "Traitements complémentaires" },
    { id: "BASS AMP",    l: "Amplis basse",          groupe: "Préamplis et amplificateurs" }
  ];

  /* ------------------------------------------------ fabriques de paramètres */

  /** Un nombre borné. « pas » suit les décimales imprimées (1.0 – 10.0 → 0,1). */
  function n(k, min, max, o) {
    var d = { k: k, min: min, max: max, step: 1 };
    if (o) for (var x in o) d[x] = o[x];
    return d;
  }
  /** Une valeur choisie dans une liste, telle qu'imprimée. */
  function l(k, opts, o) {
    var d = { k: k, opts: opts };
    if (o) for (var x in o) d[x] = o[x];
    return d;
  }
  /** Une fréquence, stockée en Hz. Seules les bornes sont publiées. */
  function hz(k, min, max, o) { return n(k, min, max, merge({ u: "Hz", step: null }, o)); }
  function merge(a, b) { if (b) for (var x in b) a[x] = b[x]; return a; }

  var VOL = n("VOL", 0, 100);
  var c100 = function (k) { return n(k, 0, 100); };
  var ON_OFF = ["OFF", "ON"];
  var UP_DOWN = ["UP", "DOWN"];
  var SENSE_SANS_ZERO = { skip: [0] };              /* « -10 – -1, 1 – 10 » */
  var EQ7 = ["50Hz", "120Hz", "400Hz", "500Hz", "800Hz", "4.5kHz", "10kHz"].map(function (k) {
    return n(k, -12, 12, { step: 0.1 });
  });
  /* Le troisième choix des delays est une icône de métronome : le temps suit
     alors le tempo du patch, et se lit en valeur de note (non documentée). */
  var MODE_DELAY = l("MODE", ["SHORT", "LONG", "METRONOME"]);
  var TIME_SYNC = { sync: { k: "MODE", v: "METRONOME" } };
  var TAIL = l("TAIL", ON_OFF);
  /* Tableau 2 du document : les couleurs de la pédale de transposition. */
  var COULEURS_PEDALE = ["+1 OCT", "+2 OCT", "-1 SEMI", "-2 OCT", "DOWN", "-/+ OCT", "-5/+4TH", "DETUNE", "DWN/OCT"];

  /* ----------------------------------------------------------- catalogue */

  /** [nom exact, catégorie, paramètres]. L'ordre est celui du document. */
  var LISTE = [
    /* DYNAMICS */
    ["DYNAMIC COMPRESSOR", "DYNAMICS", [n("SENSE", 0, 10), l("ATTACK", ["SLOW", "FAST"]), c100("TONE"), VOL]],
    ["BLACK OPTICAL COMPRESSOR", "DYNAMICS", [c100("COMP"), c100("LO"), c100("HI"), VOL]],
    ["OPTICAL COMPRESSOR", "DYNAMICS", [n("DRIVE", 0, 10), c100("LO"), c100("HI"), VOL]],
    ["DUAL COMPRESSOR", "DYNAMICS", [hz("FREQ", 300, 1500), n("LOCOMP", 0, 50), n("HICOMP", 0, 50), VOL]],
    ["MULTIBAND COMPRESSOR", "DYNAMICS", [c100("COMP"), c100("LOTHR"), c100("HITHR"), VOL]],
    ["GLAM COMPRESSOR", "DYNAMICS", [c100("COMP"), n("SHAPE", 0, 10), VOL, c100("DRY")]],
    ["160 COMPRESSOR", "DYNAMICS", [n("THRSHLD", -60, 0), n("RATIO", 1, 10, { step: 0.1 }), l("KNEE", ["SOFT", "HARD"]), VOL]],
    ["1176 LIMITER", "DYNAMICS", [n("INPUT", 0, 80), l("RATIO", ["4:1", "8:1", "12:1", "20:1"]), n("RELEASE", 10, 70), n("OUTPUT", 0, 80)]],
    ["ZOOM NOISE REDUCTION", "DYNAMICS", [l("DETECT", ["GTRIN", "EFXIN"]), c100("DEPTH"), c100("THRSHLD"), c100("DECAY")]],
    ["SLOW ATTACK", "DYNAMICS", [n("TIME", 1, 50), n("CURVE", 0, 10), c100("TONE"), VOL]],

    /* FILTER */
    ["BASS AUTO WAH", "FILTER", [n("SENSE", -10, 10, SENSE_SANS_ZERO), n("RESO", 0, 10), c100("DRY"), VOL]],
    ["ENVELOPE FILTER", "FILTER", [c100("THRSHLD"), c100("ATTACK"), l("MODE", UP_DOWN), VOL]],
    ["AUTO FILTER", "FILTER", [l("MODE", UP_DOWN), n("SENSE", 1, 10), n("PEAK", 0, 10), c100("DRY")]],
    ["ZTRON FILTER", "FILTER", [n("SENSE", -10, 10, SENSE_SANS_ZERO), n("RESO", 0, 10), c100("DRY"), VOL]],
    ["BASS CRY FILTER", "FILTER", [n("RANGE", 1, 10), n("RESO", 0, 10), n("SENSE", -10, 10, SENSE_SANS_ZERO), c100("BALANCE")]],
    ["ENVELOPE GENERATOR FILTER", "FILTER", [c100("FREQ1"), c100("FREQ2"), c100("RESO"),
      /* Seules les bornes sont imprimées : « HPF2 – LPF4 ». */
      { k: "TYPE", t: "text", doc: "HPF2 – LPF4" }, c100("SPEED"), c100("BALANCE"), VOL]],
    ["SEQUENCE FILTER", "FILTER", [n("STEP", 2, 8), n("PATTERN", 1, 8), n("SPEED", 1, 50), n("RESO", 0, 10)]],
    ["BASS GRAPHIC EQ", "FILTER", EQ7.concat([VOL])],
    ["STEREO BASS GRAPHIC EQ", "FILTER", EQ7.concat([VOL])],
    ["BASS PARAMETRIC EQ", "FILTER", [hz("FREQ", 20, 20000), n("Q", 0.5, 16, { step: 0.1 }), n("GAIN", -20, 20, { step: 0.1 }), VOL]],
    ["LOW EQ", "FILTER", [l("TYPE", ["SHELF", "HPF"]), hz("FREQ", 20, 640),
      n("GAIN", -12, 12, { step: 0.1, inactif: { k: "TYPE", v: ["HPF"] } }), VOL]],
    ["HIGH EQ", "FILTER", [l("TYPE", ["SHELF", "LPF"]), hz("FREQ", 500, 20000),
      n("GAIN", -12, 12, { step: 0.1, inactif: { k: "TYPE", v: ["LPF"] } }), VOL]],
    ["SPLITTER", "FILTER", [hz("FREQ", 80, 2500), c100("LO"), c100("HI"), VOL]],
    ["EXCITER", "FILTER", [c100("BASS"), c100("TREBLE"), VOL, l("ON/OFF", ["LATCH", "UNLATCH"])]],

    /* DRIVE */
    ["EP DRIVE", "DRIVE", [c100("GAIN"), n("BASS", -10, 10), n("TREBLE", -10, 10), VOL]],
    ["RC DRIVE", "DRIVE", [c100("GAIN"), c100("BASS"), c100("TREBLE"), VOL]],
    ["BASS TS DRIVE", "DRIVE", [c100("GAIN"), c100("TONE"), c100("BALANCE"), VOL]],
    ["BASS OVER DRIVE", "DRIVE", [c100("GAIN"), c100("TONE"), c100("BALANCE"), VOL]],
    ["BLUEBERRY DRIVE", "DRIVE", [c100("GAIN"), c100("TONE"), c100("BLEND"), VOL]],
    ["DARK OVERDRIVE", "DRIVE", [c100("GAIN"), l("ATTACK", ["CUT", "FLAT", "BOOST"]), c100("BLEND"), VOL]],
    ["SQUEAK DISTORTION", "DRIVE", [c100("GAIN"), c100("FILTER"), VOL, c100("DRY")]],
    ["VOODOO-B DISTORTION", "DRIVE", [c100("GAIN"), c100("TONE"), c100("BLEND"), VOL]],
    ["BASS OCTAVE FUZZ", "DRIVE", [c100("BOOST"), c100("TONE"), c100("FUZZ"), c100("DRY")]],
    ["NEW YORK MUFF FUZZ", "DRIVE", [c100("SUSTAIN"), c100("TONE"), c100("BALANCE"), VOL]],
    ["BASS FUZZ SMILE", "DRIVE", [c100("GAIN"), c100("TONE"), c100("BALANCE"), VOL]],
    ["BASS METAL DRIVE", "DRIVE", [c100("GAIN"), c100("TONE"), c100("BALANCE"), VOL]],
    ["TS+BOOST DRIVE", "DRIVE", [c100("GAIN"), c100("TONE"), VOL, n("COMP", 0, 2), c100("BOOST"),
      c100("BASS"), c100("TREBLE"), l("ORDER", ["BOOST-OD", "OD-BOOST"])]],

    /* PREAMP */
    ["BASS DRIVER PREAMP", "PREAMP", [c100("BASS"), c100("TREBLE"), c100("PRESENC"), c100("BLEND"), c100("GAIN"), VOL,
      l("MID-FREQ", ["500 Hz", "1.0 kHz"]), c100("MID")]],
    ["D.I PLUS PREAMP", "PREAMP", [c100("BASS"), c100("MID"), c100("TREBLE"),
      /* COLOR agit sur le canal clair, BLEND et GAIN sur le canal saturé. */
      l("COLOR", ON_OFF, { inactif: { k: "CHANNEL", v: ["DIST"] } }), l("CHANNEL", ["CLEAN", "DIST"]),
      n("BLEND", 0, 100, { inactif: { k: "CHANNEL", v: ["CLEAN"] } }),
      n("GAIN", 0, 100, { inactif: { k: "CHANNEL", v: ["CLEAN"] } }), VOL]],
    ["DARK PREAMP", "PREAMP", [c100("BASS"), c100("LO-MID"), c100("HI-MID"), c100("TREBLE"), c100("BLEND"), c100("GAIN"), VOL,
      l("BOOST", ["OFF", "LO", "HI", "LO+HI"])]],
    ["CLEAR DRIVER PREAMP", "PREAMP", [c100("BASS"), hz("MID-FREQ", 100, 1000), c100("MID"), c100("TREBLE"), c100("PRESENC"),
      c100("BLEND"), c100("GAIN"), VOL]],
    ["1073 PREAMP", "PREAMP", [n("GAIN", 20, 50), l("BASS-F", ["55 Hz", "220 Hz"]), n("BASS", -50, 50), hz("MID-F", 350, 3200),
      n("MID", -50, 50), l("TRBL-F", ["10 kHz", "16 kHz"]), n("TREBLE", -50, 50), VOL]],
    ["SOLID PREAMP", "PREAMP", [c100("GAIN"), c100("HARMNIC"), l("LOTYPE", ["SHELF", "PEQ"]), hz("LO-FREQ", 40, 600),
      n("LO", -50, 50), hz("HI-FREQ", 1500, 22000), n("HI", -50, 50), VOL]],
    ["DI-5 PREAMP", "PREAMP", [c100("GAIN"), n("TONE", 1, 6, { off: true }), l("HICUT", ON_OFF), VOL]],
    ["SB PREAMP 1", "PREAMP", [n("BASS", 0, 10), n("MID", -10, 10), n("TREBLE", 0, 10), VOL]],
    ["BBB PREAMP", "PREAMP", [c100("GAIN"), n("BASS", -10, 10), n("TREBLE", -10, 10), VOL]],
    ["SUPER LOW PREAMP", "PREAMP", [c100("GAIN"), c100("ENHANCE"), c100("SUB"), c100("LO"), c100("MID"), c100("HI"),
      c100("BALANCE"), VOL]],
    ["DJENT PREAMP", "PREAMP", [c100("BASS"), c100("LO-MID"), c100("HI-MID"), c100("TREBLE"), l("HIBOOST", ON_OFF),
      hz("LOCUT", 20, 120, { off: true }), c100("GAIN"), VOL]],

    /* MODULATION */
    ["CLONE CHORUS", "MODULATION", [l("DEPTH", ["1", "2"]), c100("RATE"), c100("TONE"), c100("MIX")]],
    ["CHORUS ONE", "MODULATION", [c100("DEPTH"), c100("RATE"), c100("TONE"), c100("MIX")]],
    ["TRI CHORUS", "MODULATION", [c100("DEPTH"), c100("SPEED"), c100("TONE"), c100("MIX")]],
    ["BASS STEREO CHORUS", "MODULATION", [c100("DEPTH"), n("RATE", 1, 50), hz("LOCUT", 60, 800, { off: true }), c100("MIX")]],
    ["BASS VINTAGE FLANGER", "MODULATION", [c100("DEPTH"), n("RATE", 0, 50), n("RESO", -10, 10), hz("LOCUT", 60, 800, { off: true })]],
    ["KICK FLANGER", "MODULATION", [c100("PRE DLY"), c100("DEPTH"), c100("RATE"), c100("RESO"), c100("MIX"), c100("RESET-F"),
      l("ON/OFF", ["LATCH", "UNLATCH"])]],
    ["BASS DETUNE", "MODULATION", [n("CENT", -50, 50, { u: "cent" }), n("PRE DLY", 0, 50), n("TONE", 0, 10), c100("MIX")]],
    ["TREMOLO", "MODULATION", [l("WAVE", ["TRIANGLE", "TUBE", "SQUARE"]), c100("DEPTH"), c100("RATE"), VOL]],
    ["PHASER", "MODULATION", [l("COLOR", ["4 STG", "8 STG", "INV 4", "INV 8"]), c100("DEPTH"), n("RATE", 1, 50), c100("RESO")]],
    ["BASS PHASER", "MODULATION", [l("COLOR", ["1", "2"]), c100("DEPTH"), c100("RATE"), c100("RESO")]],
    ["THE VIBE", "MODULATION", [n("SPEED", 0, 50), c100("DEPTH"), l("MODE", ["VIBRT", "CHORS"]), VOL]],

    /* PITCH SHIFT */
    ["BASS OCTAVER", "PITCH SHIFT", [c100("OCT"), n("LO", 0, 10), n("HI", 0, 10), c100("DRY")]],
    ["BASS ANALOG OCTAVER", "PITCH SHIFT", [c100("OCT1"), c100("OCT2"), c100("MOD"), c100("DRY")]],
    ["PITCHSHIFT", "PITCH SHIFT", [n("SHIFT", -12, 12, { extra: [24], u: "demi-tons" }), n("FINE", -25, 25, { u: "cent" }),
      n("TONE", 0, 10), c100("BALANCE")]],
    ["BASS MONO PITCH SHIFTER", "PITCH SHIFT", [n("SHIFT", -12, 12, { extra: [24], u: "demi-tons" }), n("FINE", -25, 25, { u: "cent" }),
      n("TONE", 0, 10), c100("BALANCE")]],
    ["HARMONY PITCH SHIFTER", "PITCH SHIFT", [l("SCALE", ["-6", "-5", "-4", "-3", "-m", "m", "3", "4", "5", "6"]),
      l("KEY", ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]), n("TONE", 0, 10), c100("MIX")]],
    ["BASS POLYPHONIC PITCH SHIFTER", "PITCH SHIFT", [n("SHIFT", -24, 12, { u: "demi-tons" }), c100("TONE"), c100("WET"), c100("DRY")]],

    /* SYNTH */
    ["BASS SYNTHESIZER", "SYNTH", [l("MODE", UP_DOWN), c100("SENSE"), c100("ATTACK"), c100("RANGE"), c100("RESO"), c100("OCT"),
      c100("BALANCE"), VOL]],
    ["Z-SYNTHESIZER", "SYNTH", [n("FREQ", 0, 10), n("RANGE", 0, 20), c100("DECAY"), n("RESO", 0, 20), l("WAVE", ["SAW", "SQUARE"]),
      n("TONE", 0, 10), c100("BALANCE"), VOL]],
    ["BASS TALK SYNTHESIZER", "SYNTH", [l("TYPE", ["IA", "UE", "UA", "OA"]), c100("SENSE"), c100("ATTACK"), c100("RESO"),
      n("TONE", 0, 10), c100("OCT"), c100("BALANCE"), VOL]],

    /* DELAY */
    ["DELAY", "DELAY", [n("TIME", 1, 4000, merge({ u: "ms" }, TIME_SYNC)), MODE_DELAY, c100("REPEAT"), c100("MIX")]],
    ["ANALOG DELAY", "DELAY", [n("TIME", 1, 4000, merge({ u: "ms" }, TIME_SYNC)), MODE_DELAY, c100("REPEAT"), c100("MIX")]],
    ["TAPE ECHO", "DELAY", [n("TIME", 1, 2000, TIME_SYNC), MODE_DELAY, c100("REPEAT"), c100("MIX")]],
    ["DUAL DELAY", "DELAY", [n("TIMEA", 0, 1490, { sync: { k: "MODE", v: "METRONOME" } }),
      n("TIMEB", 0, 1490, { sync: { k: "MODE", v: "METRONOME" } }), l("MODE", ["TIME", "METRONOME"]), c100("BALANCE"),
      n("REP A", 0, 110), n("REP B", 0, 110), c100("DLYMX"),
      /* « MN-0 – ST-50 » : sortie mono (MN) ou stéréo (ST), profondeur 0 à 50. */
      { k: "DEPTH", t: "text", doc: "MN-0 – ST-50", motif: "^(MN|ST)-([0-9]|[1-4][0-9]|50)$" }]],
    ["REVERSE DELAY", "DELAY", [n("TIME", 10, 2000, merge({ u: "ms" }, TIME_SYNC)), MODE_DELAY, c100("REPEAT"), c100("BALANCE")]],
    ["MODULATION DELAY", "DELAY", [n("TIME", 1, 2000, TIME_SYNC), MODE_DELAY, c100("REPEAT"), c100("MIX")]],
    ["HOLD DELAY", "DELAY", [n("TIME", 1, 4000, TIME_SYNC), MODE_DELAY, c100("REPEAT"), n("HI-DMP", 0, 10), c100("TONE"),
      c100("MIX"), l("P-P", ["MONO", "P-P"]), TAIL]],

    /* REVERB */
    ["ROOM REVERB", "REVERB", [n("PRE DLY", 1, 100), n("DECAY", 1, 30), c100("MIX"), TAIL]],
    ["BRGHT ROOM REVERB", "REVERB", [n("PRE DLY", 1, 100), n("DECAY", 1, 30), n("TONE", 0, 10), c100("MIX")]],
    ["SPRING REVERB", "REVERB", [n("PRE DLY", 1, 100), n("DECAY", 1, 30), c100("MIX"), TAIL]],
    ["PLATE REVERB", "REVERB", [n("PRE DLY", 1, 200), c100("DECAY"), c100("MIX"), TAIL]],
    ["HALL REVERB", "REVERB", [n("PRE DLY", 1, 100), n("DECAY", 1, 30), c100("MIX"), TAIL]],
    ["BRGHT HALL REVERB", "REVERB", [n("PRE DLY", 1, 100), n("DECAY", 1, 30), n("TONE", 0, 10), c100("MIX")]],
    ["HD HALL REVERB", "REVERB", [n("PRE DLY", 1, 200), c100("DECAY"), c100("MIX"), TAIL]],
    ["AIR REVERB", "REVERB", [n("SIZE", 1, 100), n("REFLECT", 0, 10), c100("MIX"), TAIL]],

    /* SFX */
    ["LOOP ROLL", "SFX", [n("TIME", 10, 4000), n("DUTY", 25, 100), c100("BALANCE"), l("ON/OFF", ["LATCH", "UNLATCH"])]],
    ["PHASER+DISTORTION", "SFX", [n("MODE", 1, 4), n("RATE", 0, 50), n("RESO", 0, 10), VOL]],
    ["FRETLESS SIMULATOR", "SFX", [n("SENSE", 0, 30), n("COLOR", 1, 10), n("TONE", 1, 50), VOL]],
    ["BOMBER", "SFX", [n("DECAY", 1, 100), n("TONE", 0, 10), c100("MIX"), l("ON/OFF", ["LATCH", "TRIGGER"])]],

    /* PEDAL — « pedal: true » : réglable à la pédale d'expression (icône P). */
    ["OUTPUT VOLUME PEDAL", "PEDAL", []],
    ["PEDAL VOLUME", "PEDAL", [n("VOL", 0, 100, { pedal: true }), c100("MIN"), c100("MAX"), l("CURVE", ["A", "B"])]],
    ["BASS WAH", "PEDAL", [n("FREQ", 0, 100, { pedal: true }), c100("RANGE"), c100("DRY"), VOL]],
    ["BASS PEDAL PITCH", "PEDAL", [n("BEND", 0, 100, { pedal: true }), l("COLOR", COULEURS_PEDALE), n("TONE", 0, 10), l("MODE", UP_DOWN)]],
    ["BASS PEDAL MONO PITCH", "PEDAL", [n("BEND", 0, 100, { pedal: true }), l("COLOR", COULEURS_PEDALE), n("TONE", 0, 10), l("MODE", UP_DOWN)]],
    ["PEDAL RESONANCE", "PEDAL", [n("FREQ", 1, 50, { pedal: true }), n("RESO", 0, 10), c100("DRY"), VOL]],

    /* BASS AMP — le baffle est compris dans le modèle : aucun réglage à part. */
    ["FLIPTOP", "BASS AMP", [l("BRIGHT", ON_OFF), n("TREBLE", -20, 20, { step: 0.1 }), n("MID", -20, 20, { step: 0.1 }),
      n("BASS", -20, 20, { step: 0.1 }), c100("GAIN"), l("ULTRA", ["OFF", "HI", "LOW", "BOTH"]), VOL, c100("BLEND")]],
    ["AMPG SVT", "BASS AMP", [n("BASS", -20, 20, { step: 0.1 }), hz("MID-FREQ", 32, 6300), n("MID", -20, 20, { step: 0.1 }),
      n("TREBLE", -20, 20, { step: 0.1 }), c100("GAIN"), l("ULTRA", ["OFF", "LOW", "HI", "BOTH", "CUT"]), VOL, c100("BLEND")]],
    ["AG 750", "BASS AMP", [c100("BASS"), c100("MID"), c100("TREBLE"), c100("GAIN"), l("BRIGHT", ON_OFF), l("DEEP", ON_OFF),
      VOL, c100("BLEND")]],
    ["SMR400", "BASS AMP", [n("BASS", -15, 15, { step: 0.1 }), hz("MID-FREQ", 32, 6300), n("MID", -15, 15, { step: 0.1 }),
      n("TREBLE", -15, 15, { step: 0.1 }), c100("GAIN"), c100("ENHANCE"), VOL, c100("BLEND")]],
    ["EBH360", "BASS AMP", [n("BASS", -10, 10, { step: 0.1 }), n("MID", -10, 10, { step: 0.1 }), n("TREBLE", -10, 10, { step: 0.1 }),
      c100("BRIGHT"), c100("DRIVE"), VOL, l("CHARA", ON_OFF), c100("BLEND")]],
    ["MINI MARK-B", "BASS AMP", [c100("GAIN"), c100("VINTAGE"), c100("SHAPE"), VOL, c100("BLEND")]],
    ["TE400SMX", "BASS AMP", [l("STYLE", ["PICK", "SLAP", "FINGER"]), n("BASS", -15, 15, { step: 0.1 }),
      n("MID", -15, 15, { step: 0.1 }), n("TREBLE", -15, 15, { step: 0.1 }), c100("GAIN"), l("SHAPE", ["OFF", "1", "2"]),
      VOL, c100("BLEND")]],
    ["B-MAN100", "BASS AMP", [n("BASS", 10, 100), hz("MID-FREQ", 32, 6300), n("MID", 10, 100), n("TREBLE", 10, 100),
      n("GAIN", 10, 100), l("DEEP", ON_OFF), n("VOL", 10, 100), c100("BLEND")]],
    ["AC 370", "BASS AMP", [c100("BASS"), hz("MID-FREQ", 32, 6300), c100("MID"), c100("TREBLE"), c100("GAIN"),
      l("BRIGHT", ON_OFF), VOL, c100("BLEND")]],
    ["SUN CB", "BASS AMP", [l("INPUT", ["NORMAL", "BRIGHT"]), c100("BASS"), c100("MID"), c100("TREBLE"),
      /* « OFF – 100 » : OFF passe sur le canal clair. */
      n("DIST", 0, 100, { off: true }), l("HIBOOST", ON_OFF), VOL, c100("BLEND")]],
    ["MONOTONE", "BASS AMP", [c100("BASS"), c100("MID"), c100("TREBLE"), c100("PRESENC"),
      l("MODE", ["DARK", "NORMAL", "BRIGHT"]), VOL, c100("BLEND")]]
  ];

  var FX = {}, ORDRE = [];
  LISTE.forEach(function (e) {
    FX[e[0]] = { name: e[0], cat: e[1], params: e[2] };
    ORDRE.push(e[0]);
  });

  function catDef(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return null;
  }
  function paramDef(fx, k) {
    var d = FX[fx];
    if (!d) return null;
    for (var i = 0; i < d.params.length; i++) if (d.params[i].k === k) return d.params[i];
    return null;
  }

  /* -------------------------------------------------------------- lecture */

  function decimales(step) {
    if (!step) return 0;
    var s = String(step), i = s.indexOf(".");
    return i < 0 ? 0 : s.length - i - 1;
  }

  /** 1500 → « 1.5 kHz », 640 → « 640 Hz » : la notation du document. */
  function fmtHz(v) {
    v = Number(v);
    if (v >= 1000) {
      var k = v / 1000;
      return (Math.round(k * 10) / 10).toFixed(k >= 10 && k === Math.round(k) ? 0 : 1) + " kHz";
    }
    return Math.round(v) + " Hz";
  }

  /** Une valeur telle que l'afficherait la fiche. null : pas encore réglée. */
  function fmtValue(def, v) {
    if (v === undefined || v === null || v === "") return null;
    if (v === "OFF") return "OFF";
    if (def.opts || def.t === "text" || typeof v === "string") return String(v);
    if (def.u === "Hz") return fmtHz(v);
    var s = Number(v).toFixed(decimales(def.step));
    return def.u ? s + " " + def.u : s;
  }

  /** Un paramètre que le réglage d'un autre rend sans effet. */
  function isInactive(def, p) {
    if (!def.inactif || !p) return false;
    return def.inactif.v.indexOf(p[def.inactif.k]) >= 0;
  }

  /**
   * La valeur respecte-t-elle ce que le document publie ? Renvoie null si oui,
   * sinon un message à motif (traduit par la page).
   */
  function checkValue(def, v, p) {
    if (v === undefined || v === null || v === "") return null;       /* « à régler » */
    if (def.sync && p && p[def.sync.k] === def.sync.v && typeof v === "string") return null;
    if (def.t === "text") {
      if (typeof v !== "string") return { m: "attend du texte" };
      if (def.motif && !new RegExp(def.motif).test(v)) return { m: "hors de {0}", a: [def.doc] };
      return null;
    }
    if (def.opts) {
      return def.opts.indexOf(String(v)) >= 0 ? null : { m: "hors liste ({0})", a: [def.opts.join(", ")] };
    }
    if (v === "OFF" && def.off) return null;
    if (typeof v !== "number" || !isFinite(v)) return { m: "n'est pas un nombre" };
    if (def.extra && def.extra.indexOf(v) >= 0) return null;
    if (def.skip && def.skip.indexOf(v) >= 0) return { m: "{0} n'est pas une valeur permise", a: [String(v)] };
    if (v < def.min || v > def.max) {
      return { m: "hors plage ({0} à {1})", a: [fmtValue(def, def.min), fmtValue(def, def.max)] };
    }
    if (def.step) {
      var f = Math.pow(10, decimales(def.step));
      if (Math.abs(Math.round(v * f) - v * f) > 1e-6) return { m: "trop de décimales" };
    }
    return null;
  }

  /* ----------------------------------------------------------- contrôles */

  function msg(m, a) { return { m: m, a: a || [] }; }

  /**
   * Les erreurs empêchent l'import d'une fiche ; les avertissements la laissent
   * entrer telle quelle, valeurs conservées, mais le signalent.
   */
  function validatePreset(p) {
    var errors = [], warnings = [];
    if (!p || typeof p !== "object") return { errors: [msg("La fiche n'est pas un objet.")], warnings: [] };
    if (p.kind !== "zoom") errors.push(msg("Genre inattendu : {0}", [String(p.kind)]));
    if (!p.name || typeof p.name !== "string") errors.push(msg("Nom manquant."));
    if (!Array.isArray(p.chain)) {
      errors.push(msg("La chaîne d'effets manque."));
      return { errors: errors, warnings: warnings };
    }
    if (p.catalog && p.catalog !== CATALOG) {
      warnings.push(msg("Catalogue {0}, celui-ci connaît {1} : à vérifier.", [String(p.catalog), CATALOG]));
    }
    if (p.chain.length > LIMITS.maxFx) {
      errors.push(msg("{0} effets : le B2 FOUR en accepte {1} au plus.", [p.chain.length, LIMITS.maxFx]));
    }
    var parCat = {};
    p.chain.forEach(function (s, i) {
      var rang = i + 1;
      if (!s || typeof s !== "object") { errors.push(msg("Bloc {0} illisible.", [rang])); return; }
      var d = FX[s.fx];
      if (!d) { errors.push(msg("Bloc {0} : effet inconnu « {1} ».", [rang, String(s.fx)])); return; }
      parCat[d.cat] = (parCat[d.cat] || 0) + 1;
      var vals = s.p && typeof s.p === "object" ? s.p : {};
      Object.keys(vals).forEach(function (k) {
        var pd = paramDef(s.fx, k);
        if (!pd) { warnings.push(msg("Bloc {0} ({1}) : paramètre non reconnu « {2} », conservé.", [rang, s.fx, k])); return; }
        var e = checkValue(pd, vals[k], vals);
        if (e) warnings.push(msg("Bloc {0} ({1}) : {2} = {3} — {4}.", [rang, s.fx, k, String(vals[k]), e]));
      });
    });
    LIMITS.uniqueCats.forEach(function (c) {
      if ((parCat[c] || 0) > 1) errors.push(msg("Un seul effet {0} par patch, il y en a {1}.", [c, parCat[c]]));
    });
    if (p.patch !== undefined && p.patch !== null && p.patch !== "") {
      var num = Number(p.patch);
      if (!(num === Math.round(num) && num >= LIMITS.patchMin && num <= LIMITS.patchMax)) {
        warnings.push(msg("Patch {0} : le B2 FOUR va de 001 à 300.", [String(p.patch)]));
      }
    }
    if (p.tempo !== undefined && p.tempo !== null && p.tempo !== "") {
      var tp = Number(p.tempo);
      if (!(tp >= LIMITS.tempoMin && tp <= LIMITS.tempoMax)) {
        warnings.push(msg("Tempo {0} : le B2 FOUR va de 40 à 250 bpm.", [String(p.tempo)]));
      }
    }
    var nom = nomPatch(p);
    if (!LIMITS.nameChars.test(nom)) warnings.push(msg("Le nom « {0} » contient des caractères que le B2 FOUR n'affiche pas.", [nom]));
    if (nom.length > LIMITS.nameObserved) {
      warnings.push(msg("Le nom « {0} » dépasse 14 caractères, la longueur des noms d'usine.", [nom]));
    }
    if (p.bass !== undefined && p.bass !== null && typeof p.bass !== "object") errors.push(msg("Bloc basse illisible."));
    /* Un preset est une famille sonore qui sert plusieurs morceaux. */
    if (p.songs !== undefined && p.songs !== null) {
      if (!Array.isArray(p.songs)) errors.push(msg("La liste des morceaux est illisible."));
      else p.songs.forEach(function (m, i) {
        if (!m || typeof m !== "object" || typeof m.title !== "string" || !m.title.trim()) {
          warnings.push(msg("Morceau {0} sans titre.", [i + 1]));
        }
      });
    }
    if (p.family !== undefined && p.family !== null && typeof p.family !== "string") {
      warnings.push(msg("Famille illisible : {0}.", [String(p.family)]));
    }
    if (p.level && typeof p.level === "object" && p.level.state &&
        ["a-verifier", "equilibre"].indexOf(p.level.state) < 0) {
      warnings.push(msg("État de niveau inconnu : {0}.", [String(p.level.state)]));
    }
    return { errors: errors, warnings: warnings };
  }

  /** Le nom tel qu'il ira sur l'appareil : celui du patch s'il est donné. */
  function nomPatch(p) { return String((p && (p.patchName || p.name)) || ""); }

  /**
   * Une banque : l'enveloppe, puis chaque fiche. Une enveloppe d'une version
   * plus récente est refusée entière — on ne lit pas un format qu'on ne
   * connaît pas en espérant qu'il ressemble au nôtre.
   */
  function validateBank(env) {
    var errors = [], warnings = [], fiches = [];
    if (!env || typeof env !== "object") return { errors: [msg("Le fichier n'est pas un objet.")], warnings: [], presets: [] };
    if (env.presetbook !== "bank") errors.push(msg("Ce n'est pas une banque."));
    if (typeof env.v !== "number") errors.push(msg("Version du format manquante."));
    else if (env.v > FORMAT) errors.push(msg("Format {0}, plus récent que celui de cette version ({1}) : mets Presetbook à jour.", [env.v, FORMAT]));
    if (env.device !== DEVICE) errors.push(msg("Appareil {0}, attendu {1}.", [String(env.device), DEVICE]));
    if (env.catalog && env.catalog !== CATALOG) warnings.push(msg("Catalogue {0}, celui-ci connaît {1} : à vérifier.", [String(env.catalog), CATALOG]));
    if (!Array.isArray(env.presets)) errors.push(msg("La liste des fiches manque."));
    var cfg = env.config || {};
    if (cfg.di !== undefined && cfg.di !== null && DI_MODELS.indexOf(cfg.di) < 0) {
      warnings.push(msg("DI MODEL inconnu : {0}.", [String(cfg.di)]));
    }
    if (errors.length) return { errors: errors, warnings: warnings, presets: [] };
    var vus = {};
    env.presets.forEach(function (p) {
      var r = validatePreset(p);
      if (p && p.patch !== undefined && p.patch !== null && p.patch !== "") {
        if (vus[p.patch]) r.warnings.push(msg("Patch {0} déjà pris par « {1} ».", [String(p.patch), vus[p.patch]]));
        else vus[p.patch] = p.name;
      }
      fiches.push({ preset: p, errors: r.errors, warnings: r.warnings });
    });
    redondances(fiches);
    return { errors: errors, warnings: warnings, presets: fiches };
  }

  /** Les morceaux d'une fiche : « songs » d'abord, « song » pour les fiches d'avant. */
  function morceaux(p) {
    if (p && Array.isArray(p.songs)) return p.songs.filter(function (m) { return m && m.title; });
    return p && p.song && p.song.title ? [p.song] : [];
  }
  function cle(m) { return m.title + (m.artist ? " — " + m.artist : ""); }

  /**
   * Ce qui sépare deux fiches, bloc par bloc. null quand la chaîne diffère
   * (autres effets, autre ordre, autre état) : ce ne sont alors pas deux
   * réglages d'un même son. Une différence est « petite » quand elle reste
   * sous le dixième de la course du paramètre — ou sous un quart d'octave
   * pour une fréquence — et qu'aucun choix de liste ne change.
   */
  function ecarts(a, b) {
    var ca = (a && a.chain) || [], cb = (b && b.chain) || [], out = [], i;
    if (ca.length !== cb.length) return null;
    for (i = 0; i < ca.length; i++) {
      if (!ca[i] || !cb[i] || ca[i].fx !== cb[i].fx || (ca[i].on !== false) !== (cb[i].on !== false)) return null;
      var pa = ca[i].p || {}, pb = cb[i].p || {}, vus = {};
      Object.keys(pa).concat(Object.keys(pb)).forEach(function (k) {
        if (vus[k]) return;
        vus[k] = 1;
        var va = pa[k], vb = pb[k];
        if (va === vb || (va == null && vb == null)) return;
        var def = paramDef(ca[i].fx, k), petit = false;
        if (def && !def.opts && typeof va === "number" && typeof vb === "number") {
          if (def.u === "Hz") petit = Math.max(va, vb) / Math.max(1, Math.min(va, vb)) <= 1.19;
          else petit = Math.abs(va - vb) <= 0.1 * (def.max - def.min);
        }
        out.push({ bloc: i + 1, fx: ca[i].fx, k: k, a: va, b: vb, petit: petit });
      });
    }
    return out;
  }
  function procheDe(a, b) {
    var e = ecarts(a, b);
    if (!e) return { proche: false, identique: false, ecarts: null };
    return { proche: e.every(function (x) { return x.petit; }), identique: e.length === 0, ecarts: e };
  }

  /**
   * Une banque compacte vit de familles bien distinctes. Deux fiches aux
   * mêmes réglages, ou presque, sont un patch de trop ; deux fiches
   * principales pour un même morceau, une hésitation à trancher. Signalé,
   * jamais refusé : c'est au musicien de décider.
   */
  function redondances(fiches) {
    var ok = fiches.filter(function (x) { return !x.errors.length && x.preset; });
    var i, j;
    for (i = 0; i < ok.length; i++) for (j = i + 1; j < ok.length; j++) {
      var a = ok[i].preset, b = ok[j].preset, r = procheDe(a, b);
      if (!r.proche) continue;
      var lien = b.variantOf === a.id || a.variantOf === b.id;
      if (r.identique) {
        ok[j].warnings.push(lien ? msg("La variante « {0} » ne change rien à « {1} ».", [b.name, a.name])
                                 : msg("« {0} » a exactement les réglages de « {1} » : un seul patch suffit.", [b.name, a.name]));
      } else {
        ok[j].warnings.push(lien ? msg("La variante « {0} » diffère à peine de « {1} » : est-elle utile ?", [b.name, a.name])
                                 : msg("« {0} » et « {1} » ne diffèrent que de petits réglages : une seule famille suffirait sans doute.", [b.name, a.name]));
      }
    }
    var principal = {};
    ok.forEach(function (x) {
      if (x.preset.variantOf) return;
      morceaux(x.preset).forEach(function (m) {
        var k = cle(m);
        if (principal[k] && principal[k] !== x.preset.name) {
          x.warnings.push(msg("« {0} » est déjà couvert par « {1} » : un seul preset principal par morceau.", [k, principal[k]]));
        } else principal[k] = x.preset.name;
      });
    });
  }

  /** L'enveloppe d'une banque, prête à écrire. */
  function bankEnvelope(name, config, presets, gear) {
    return {
      v: FORMAT, presetbook: "bank", device: DEVICE, catalog: CATALOG,
      name: name || "", config: { di: config && config.di ? config.di : null },
      presets: presets || [], gear: gear || {}
    };
  }

  /** Une fiche vide, prête à remplir. */
  function blankPreset(id) {
    return {
      id: id, kind: "zoom", gear: "b2four", catalog: CATALOG, name: "", tags: [], patch: null, tempo: null,
      song: null, songs: [], family: "", bass: null, chain: [],
      level: { state: "a-verifier", note: "" }, variant: "", variantOf: null, notes: ""
    };
  }

  var api = {
    DEVICE: DEVICE, CATALOG: CATALOG, FORMAT: FORMAT, LIMITS: LIMITS, DI_MODELS: DI_MODELS,
    CATEGORIES: CATEGORIES, FX: FX, ORDER: ORDRE,
    catDef: catDef, paramDef: paramDef, fmtValue: fmtValue, fmtHz: fmtHz, isInactive: isInactive,
    checkValue: checkValue, validatePreset: validatePreset, validateBank: validateBank,
    bankEnvelope: bankEnvelope, blankPreset: blankPreset, nomPatch: nomPatch,
    morceaux: morceaux, cleMorceau: cle, procheDe: procheDe, ecarts: ecarts
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ZB2F = api;
})(typeof window !== "undefined" ? window : this);
