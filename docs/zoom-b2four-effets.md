# Zoom B2 FOUR — effets et paramètres pris en charge

Document généré par `node tools/zoom-docs.js` à partir de `public/zoom-b2four.js`. Ne pas modifier à la main.

Source : *B2 FOUR Effect Types and Parameters* (ZOOM, ©2023, réf. Z2I-4875-01). Noms, paramètres et plages
sont ceux du document ; ses descriptions ne sont pas reproduites. Aucune valeur par défaut n'y figure, donc aucune
n'est stockée. Les fréquences sont enregistrées en Hz ; seules leurs bornes sont publiées.

**104 effets, 522 paramètres, 12 catégories.**

| Catégorie Zoom | Libellé | Famille | Effets |
| --- | --- | --- | --- |
| DYNAMICS | Dynamique | Compresseurs et limiteurs | 10 |
| FILTER | Filtres et égaliseurs | Égaliseurs et filtres | 14 |
| DRIVE | Saturation | Overdrive, distorsion et fuzz | 13 |
| PREAMP | Préamplis | Préamplis et amplificateurs | 11 |
| MODULATION | Modulation | Chorus, flanger et modulation | 11 |
| PITCH SHIFT | Transposition | Traitements complémentaires | 6 |
| SYNTH | Synthé | Traitements complémentaires | 3 |
| DELAY | Delays | Delay et reverb | 7 |
| REVERB | Réverbérations | Delay et reverb | 8 |
| SFX | Effets spéciaux | Traitements complémentaires | 4 |
| PEDAL | Pédale d'expression | Traitements complémentaires | 6 |
| BASS AMP | Amplis basse | Préamplis et amplificateurs | 11 |

Règles : 5 effets au plus par patch ; un seul effet de la catégorie BASS AMP et un seul de la catégorie PEDAL.
Le baffle est compris dans chaque modèle BASS AMP : le B2 FOUR n'en propose pas à part. Le DI MODEL
(OFF, TUBE 1, TUBE 2, TUBE 3, SOLID STATE 1, SOLID STATE 2, SOLID STATE 3) est un réglage global de l'appareil, enregistré au niveau de la banque.

## DYNAMICS — Dynamique

### DYNAMIC COMPRESSOR

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| SENSE | 0 – 10 |  |
| ATTACK | SLOW, FAST |  |
| TONE | 0 – 100 |  |
| VOL | 0 – 100 |  |

### BLACK OPTICAL COMPRESSOR

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| COMP | 0 – 100 |  |
| LO | 0 – 100 |  |
| HI | 0 – 100 |  |
| VOL | 0 – 100 |  |

### OPTICAL COMPRESSOR

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| DRIVE | 0 – 10 |  |
| LO | 0 – 100 |  |
| HI | 0 – 100 |  |
| VOL | 0 – 100 |  |

### DUAL COMPRESSOR

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| FREQ | 300 Hz – 1.5 kHz | unité : Hz ; pas non publié |
| LOCOMP | 0 – 50 |  |
| HICOMP | 0 – 50 |  |
| VOL | 0 – 100 |  |

### MULTIBAND COMPRESSOR

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| COMP | 0 – 100 |  |
| LOTHR | 0 – 100 |  |
| HITHR | 0 – 100 |  |
| VOL | 0 – 100 |  |

### GLAM COMPRESSOR

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| COMP | 0 – 100 |  |
| SHAPE | 0 – 10 |  |
| VOL | 0 – 100 |  |
| DRY | 0 – 100 |  |

### 160 COMPRESSOR

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| THRSHLD | -60 – 0 |  |
| RATIO | 1.0 – 10.0 | pas : 0,1 |
| KNEE | SOFT, HARD |  |
| VOL | 0 – 100 |  |

### 1176 LIMITER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| INPUT | 0 – 80 |  |
| RATIO | 4:1, 8:1, 12:1, 20:1 |  |
| RELEASE | 10 – 70 |  |
| OUTPUT | 0 – 80 |  |

### ZOOM NOISE REDUCTION

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| DETECT | GTRIN, EFXIN |  |
| DEPTH | 0 – 100 |  |
| THRSHLD | 0 – 100 |  |
| DECAY | 0 – 100 |  |

### SLOW ATTACK

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| TIME | 1 – 50 |  |
| CURVE | 0 – 10 |  |
| TONE | 0 – 100 |  |
| VOL | 0 – 100 |  |

## FILTER — Filtres et égaliseurs

### BASS AUTO WAH

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| SENSE | -10 – 10 (sauf 0) |  |
| RESO | 0 – 10 |  |
| DRY | 0 – 100 |  |
| VOL | 0 – 100 |  |

### ENVELOPE FILTER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| THRSHLD | 0 – 100 |  |
| ATTACK | 0 – 100 |  |
| MODE | UP, DOWN |  |
| VOL | 0 – 100 |  |

### AUTO FILTER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| MODE | UP, DOWN |  |
| SENSE | 1 – 10 |  |
| PEAK | 0 – 10 |  |
| DRY | 0 – 100 |  |

### ZTRON FILTER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| SENSE | -10 – 10 (sauf 0) |  |
| RESO | 0 – 10 |  |
| DRY | 0 – 100 |  |
| VOL | 0 – 100 |  |

### BASS CRY FILTER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| RANGE | 1 – 10 |  |
| RESO | 0 – 10 |  |
| SENSE | -10 – 10 (sauf 0) |  |
| BALANCE | 0 – 100 |  |

### ENVELOPE GENERATOR FILTER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| FREQ1 | 0 – 100 |  |
| FREQ2 | 0 – 100 |  |
| RESO | 0 – 100 |  |
| TYPE | HPF2 – LPF4 (texte, bornes seules publiées) |  |
| SPEED | 0 – 100 |  |
| BALANCE | 0 – 100 |  |
| VOL | 0 – 100 |  |

### SEQUENCE FILTER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| STEP | 2 – 8 |  |
| PATTERN | 1 – 8 |  |
| SPEED | 1 – 50 |  |
| RESO | 0 – 10 |  |

### BASS GRAPHIC EQ

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| 50Hz | -12.0 – 12.0 | pas : 0,1 |
| 120Hz | -12.0 – 12.0 | pas : 0,1 |
| 400Hz | -12.0 – 12.0 | pas : 0,1 |
| 500Hz | -12.0 – 12.0 | pas : 0,1 |
| 800Hz | -12.0 – 12.0 | pas : 0,1 |
| 4.5kHz | -12.0 – 12.0 | pas : 0,1 |
| 10kHz | -12.0 – 12.0 | pas : 0,1 |
| VOL | 0 – 100 |  |

### STEREO BASS GRAPHIC EQ

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| 50Hz | -12.0 – 12.0 | pas : 0,1 |
| 120Hz | -12.0 – 12.0 | pas : 0,1 |
| 400Hz | -12.0 – 12.0 | pas : 0,1 |
| 500Hz | -12.0 – 12.0 | pas : 0,1 |
| 800Hz | -12.0 – 12.0 | pas : 0,1 |
| 4.5kHz | -12.0 – 12.0 | pas : 0,1 |
| 10kHz | -12.0 – 12.0 | pas : 0,1 |
| VOL | 0 – 100 |  |

### BASS PARAMETRIC EQ

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| FREQ | 20 Hz – 20 kHz | unité : Hz ; pas non publié |
| Q | 0.5 – 16.0 | pas : 0,1 |
| GAIN | -20.0 – 20.0 | pas : 0,1 |
| VOL | 0 – 100 |  |

### LOW EQ

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| TYPE | SHELF, HPF |  |
| FREQ | 20 Hz – 640 Hz | unité : Hz ; pas non publié |
| GAIN | -12.0 – 12.0 | pas : 0,1 ; sans effet si TYPE = HPF |
| VOL | 0 – 100 |  |

### HIGH EQ

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| TYPE | SHELF, LPF |  |
| FREQ | 500 Hz – 20 kHz | unité : Hz ; pas non publié |
| GAIN | -12.0 – 12.0 | pas : 0,1 ; sans effet si TYPE = LPF |
| VOL | 0 – 100 |  |

### SPLITTER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| FREQ | 80 Hz – 2.5 kHz | unité : Hz ; pas non publié |
| LO | 0 – 100 |  |
| HI | 0 – 100 |  |
| VOL | 0 – 100 |  |

### EXCITER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| BASS | 0 – 100 |  |
| TREBLE | 0 – 100 |  |
| VOL | 0 – 100 |  |
| ON/OFF | LATCH, UNLATCH |  |

## DRIVE — Saturation

### EP DRIVE

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| GAIN | 0 – 100 |  |
| BASS | -10 – 10 |  |
| TREBLE | -10 – 10 |  |
| VOL | 0 – 100 |  |

### RC DRIVE

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| GAIN | 0 – 100 |  |
| BASS | 0 – 100 |  |
| TREBLE | 0 – 100 |  |
| VOL | 0 – 100 |  |

### BASS TS DRIVE

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| GAIN | 0 – 100 |  |
| TONE | 0 – 100 |  |
| BALANCE | 0 – 100 |  |
| VOL | 0 – 100 |  |

### BASS OVER DRIVE

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| GAIN | 0 – 100 |  |
| TONE | 0 – 100 |  |
| BALANCE | 0 – 100 |  |
| VOL | 0 – 100 |  |

### BLUEBERRY DRIVE

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| GAIN | 0 – 100 |  |
| TONE | 0 – 100 |  |
| BLEND | 0 – 100 |  |
| VOL | 0 – 100 |  |

### DARK OVERDRIVE

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| GAIN | 0 – 100 |  |
| ATTACK | CUT, FLAT, BOOST |  |
| BLEND | 0 – 100 |  |
| VOL | 0 – 100 |  |

### SQUEAK DISTORTION

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| GAIN | 0 – 100 |  |
| FILTER | 0 – 100 |  |
| VOL | 0 – 100 |  |
| DRY | 0 – 100 |  |

### VOODOO-B DISTORTION

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| GAIN | 0 – 100 |  |
| TONE | 0 – 100 |  |
| BLEND | 0 – 100 |  |
| VOL | 0 – 100 |  |

### BASS OCTAVE FUZZ

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| BOOST | 0 – 100 |  |
| TONE | 0 – 100 |  |
| FUZZ | 0 – 100 |  |
| DRY | 0 – 100 |  |

### NEW YORK MUFF FUZZ

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| SUSTAIN | 0 – 100 |  |
| TONE | 0 – 100 |  |
| BALANCE | 0 – 100 |  |
| VOL | 0 – 100 |  |

### BASS FUZZ SMILE

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| GAIN | 0 – 100 |  |
| TONE | 0 – 100 |  |
| BALANCE | 0 – 100 |  |
| VOL | 0 – 100 |  |

### BASS METAL DRIVE

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| GAIN | 0 – 100 |  |
| TONE | 0 – 100 |  |
| BALANCE | 0 – 100 |  |
| VOL | 0 – 100 |  |

### TS+BOOST DRIVE

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| GAIN | 0 – 100 |  |
| TONE | 0 – 100 |  |
| VOL | 0 – 100 |  |
| COMP | 0 – 2 |  |
| BOOST | 0 – 100 |  |
| BASS | 0 – 100 |  |
| TREBLE | 0 – 100 |  |
| ORDER | BOOST-OD, OD-BOOST |  |

## PREAMP — Préamplis

### BASS DRIVER PREAMP

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| BASS | 0 – 100 |  |
| TREBLE | 0 – 100 |  |
| PRESENC | 0 – 100 |  |
| BLEND | 0 – 100 |  |
| GAIN | 0 – 100 |  |
| VOL | 0 – 100 |  |
| MID-FREQ | 500 Hz, 1.0 kHz |  |
| MID | 0 – 100 |  |

### D.I PLUS PREAMP

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| BASS | 0 – 100 |  |
| MID | 0 – 100 |  |
| TREBLE | 0 – 100 |  |
| COLOR | OFF, ON | sans effet si CHANNEL = DIST |
| CHANNEL | CLEAN, DIST |  |
| BLEND | 0 – 100 | sans effet si CHANNEL = CLEAN |
| GAIN | 0 – 100 | sans effet si CHANNEL = CLEAN |
| VOL | 0 – 100 |  |

### DARK PREAMP

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| BASS | 0 – 100 |  |
| LO-MID | 0 – 100 |  |
| HI-MID | 0 – 100 |  |
| TREBLE | 0 – 100 |  |
| BLEND | 0 – 100 |  |
| GAIN | 0 – 100 |  |
| VOL | 0 – 100 |  |
| BOOST | OFF, LO, HI, LO+HI |  |

### CLEAR DRIVER PREAMP

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| BASS | 0 – 100 |  |
| MID-FREQ | 100 Hz – 1.0 kHz | unité : Hz ; pas non publié |
| MID | 0 – 100 |  |
| TREBLE | 0 – 100 |  |
| PRESENC | 0 – 100 |  |
| BLEND | 0 – 100 |  |
| GAIN | 0 – 100 |  |
| VOL | 0 – 100 |  |

### 1073 PREAMP

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| GAIN | 20 – 50 |  |
| BASS-F | 55 Hz, 220 Hz |  |
| BASS | -50 – 50 |  |
| MID-F | 350 Hz – 3.2 kHz | unité : Hz ; pas non publié |
| MID | -50 – 50 |  |
| TRBL-F | 10 kHz, 16 kHz |  |
| TREBLE | -50 – 50 |  |
| VOL | 0 – 100 |  |

### SOLID PREAMP

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| GAIN | 0 – 100 |  |
| HARMNIC | 0 – 100 |  |
| LOTYPE | SHELF, PEQ |  |
| LO-FREQ | 40 Hz – 600 Hz | unité : Hz ; pas non publié |
| LO | -50 – 50 |  |
| HI-FREQ | 1.5 kHz – 22 kHz | unité : Hz ; pas non publié |
| HI | -50 – 50 |  |
| VOL | 0 – 100 |  |

### DI-5 PREAMP

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| GAIN | 0 – 100 |  |
| TONE | OFF, 1 – 6 |  |
| HICUT | OFF, ON |  |
| VOL | 0 – 100 |  |

### SB PREAMP 1

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| BASS | 0 – 10 |  |
| MID | -10 – 10 |  |
| TREBLE | 0 – 10 |  |
| VOL | 0 – 100 |  |

### BBB PREAMP

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| GAIN | 0 – 100 |  |
| BASS | -10 – 10 |  |
| TREBLE | -10 – 10 |  |
| VOL | 0 – 100 |  |

### SUPER LOW PREAMP

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| GAIN | 0 – 100 |  |
| ENHANCE | 0 – 100 |  |
| SUB | 0 – 100 |  |
| LO | 0 – 100 |  |
| MID | 0 – 100 |  |
| HI | 0 – 100 |  |
| BALANCE | 0 – 100 |  |
| VOL | 0 – 100 |  |

### DJENT PREAMP

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| BASS | 0 – 100 |  |
| LO-MID | 0 – 100 |  |
| HI-MID | 0 – 100 |  |
| TREBLE | 0 – 100 |  |
| HIBOOST | OFF, ON |  |
| LOCUT | OFF, 20 Hz – 120 Hz | unité : Hz ; pas non publié |
| GAIN | 0 – 100 |  |
| VOL | 0 – 100 |  |

## MODULATION — Modulation

### CLONE CHORUS

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| DEPTH | 1, 2 |  |
| RATE | 0 – 100 |  |
| TONE | 0 – 100 |  |
| MIX | 0 – 100 |  |

### CHORUS ONE

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| DEPTH | 0 – 100 |  |
| RATE | 0 – 100 |  |
| TONE | 0 – 100 |  |
| MIX | 0 – 100 |  |

### TRI CHORUS

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| DEPTH | 0 – 100 |  |
| SPEED | 0 – 100 |  |
| TONE | 0 – 100 |  |
| MIX | 0 – 100 |  |

### BASS STEREO CHORUS

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| DEPTH | 0 – 100 |  |
| RATE | 1 – 50 |  |
| LOCUT | OFF, 60 Hz – 800 Hz | unité : Hz ; pas non publié |
| MIX | 0 – 100 |  |

### BASS VINTAGE FLANGER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| DEPTH | 0 – 100 |  |
| RATE | 0 – 50 |  |
| RESO | -10 – 10 |  |
| LOCUT | OFF, 60 Hz – 800 Hz | unité : Hz ; pas non publié |

### KICK FLANGER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| PRE DLY | 0 – 100 |  |
| DEPTH | 0 – 100 |  |
| RATE | 0 – 100 |  |
| RESO | 0 – 100 |  |
| MIX | 0 – 100 |  |
| RESET-F | 0 – 100 |  |
| ON/OFF | LATCH, UNLATCH |  |

### BASS DETUNE

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| CENT | -50 cent – 50 cent | unité : cent |
| PRE DLY | 0 – 50 |  |
| TONE | 0 – 10 |  |
| MIX | 0 – 100 |  |

### TREMOLO

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| WAVE | TRIANGLE, TUBE, SQUARE |  |
| DEPTH | 0 – 100 |  |
| RATE | 0 – 100 |  |
| VOL | 0 – 100 |  |

### PHASER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| COLOR | 4 STG, 8 STG, INV 4, INV 8 |  |
| DEPTH | 0 – 100 |  |
| RATE | 1 – 50 |  |
| RESO | 0 – 100 |  |

### BASS PHASER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| COLOR | 1, 2 |  |
| DEPTH | 0 – 100 |  |
| RATE | 0 – 100 |  |
| RESO | 0 – 100 |  |

### THE VIBE

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| SPEED | 0 – 50 |  |
| DEPTH | 0 – 100 |  |
| MODE | VIBRT, CHORS |  |
| VOL | 0 – 100 |  |

## PITCH SHIFT — Transposition

### BASS OCTAVER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| OCT | 0 – 100 |  |
| LO | 0 – 10 |  |
| HI | 0 – 10 |  |
| DRY | 0 – 100 |  |

### BASS ANALOG OCTAVER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| OCT1 | 0 – 100 |  |
| OCT2 | 0 – 100 |  |
| MOD | 0 – 100 |  |
| DRY | 0 – 100 |  |

### PITCHSHIFT

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| SHIFT | -12 demi-tons – 12 demi-tons, 24 | unité : demi-tons |
| FINE | -25 cent – 25 cent | unité : cent |
| TONE | 0 – 10 |  |
| BALANCE | 0 – 100 |  |

### BASS MONO PITCH SHIFTER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| SHIFT | -12 demi-tons – 12 demi-tons, 24 | unité : demi-tons |
| FINE | -25 cent – 25 cent | unité : cent |
| TONE | 0 – 10 |  |
| BALANCE | 0 – 100 |  |

### HARMONY PITCH SHIFTER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| SCALE | -6, -5, -4, -3, -m, m, 3, 4, 5, 6 |  |
| KEY | C, C#, D, D#, E, F, F#, G, G#, A, A#, B |  |
| TONE | 0 – 10 |  |
| MIX | 0 – 100 |  |

### BASS POLYPHONIC PITCH SHIFTER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| SHIFT | -24 demi-tons – 12 demi-tons | unité : demi-tons |
| TONE | 0 – 100 |  |
| WET | 0 – 100 |  |
| DRY | 0 – 100 |  |

## SYNTH — Synthé

### BASS SYNTHESIZER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| MODE | UP, DOWN |  |
| SENSE | 0 – 100 |  |
| ATTACK | 0 – 100 |  |
| RANGE | 0 – 100 |  |
| RESO | 0 – 100 |  |
| OCT | 0 – 100 |  |
| BALANCE | 0 – 100 |  |
| VOL | 0 – 100 |  |

### Z-SYNTHESIZER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| FREQ | 0 – 10 |  |
| RANGE | 0 – 20 |  |
| DECAY | 0 – 100 |  |
| RESO | 0 – 20 |  |
| WAVE | SAW, SQUARE |  |
| TONE | 0 – 10 |  |
| BALANCE | 0 – 100 |  |
| VOL | 0 – 100 |  |

### BASS TALK SYNTHESIZER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| TYPE | IA, UE, UA, OA |  |
| SENSE | 0 – 100 |  |
| ATTACK | 0 – 100 |  |
| RESO | 0 – 100 |  |
| TONE | 0 – 10 |  |
| OCT | 0 – 100 |  |
| BALANCE | 0 – 100 |  |
| VOL | 0 – 100 |  |

## DELAY — Delays

### DELAY

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| TIME | 1 ms – 4000 ms | unité : ms ; en MODE = METRONOME, suit le tempo (valeur de note) |
| MODE | SHORT, LONG, METRONOME |  |
| REPEAT | 0 – 100 |  |
| MIX | 0 – 100 |  |

### ANALOG DELAY

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| TIME | 1 ms – 4000 ms | unité : ms ; en MODE = METRONOME, suit le tempo (valeur de note) |
| MODE | SHORT, LONG, METRONOME |  |
| REPEAT | 0 – 100 |  |
| MIX | 0 – 100 |  |

### TAPE ECHO

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| TIME | 1 – 2000 | en MODE = METRONOME, suit le tempo (valeur de note) |
| MODE | SHORT, LONG, METRONOME |  |
| REPEAT | 0 – 100 |  |
| MIX | 0 – 100 |  |

### DUAL DELAY

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| TIMEA | 0 – 1490 | en MODE = METRONOME, suit le tempo (valeur de note) |
| TIMEB | 0 – 1490 | en MODE = METRONOME, suit le tempo (valeur de note) |
| MODE | TIME, METRONOME |  |
| BALANCE | 0 – 100 |  |
| REP A | 0 – 110 |  |
| REP B | 0 – 110 |  |
| DLYMX | 0 – 100 |  |
| DEPTH | MN-0 – ST-50 (motif ^(MN|ST)-([0-9]|[1-4][0-9]|50)$) |  |

### REVERSE DELAY

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| TIME | 10 ms – 2000 ms | unité : ms ; en MODE = METRONOME, suit le tempo (valeur de note) |
| MODE | SHORT, LONG, METRONOME |  |
| REPEAT | 0 – 100 |  |
| BALANCE | 0 – 100 |  |

### MODULATION DELAY

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| TIME | 1 – 2000 | en MODE = METRONOME, suit le tempo (valeur de note) |
| MODE | SHORT, LONG, METRONOME |  |
| REPEAT | 0 – 100 |  |
| MIX | 0 – 100 |  |

### HOLD DELAY

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| TIME | 1 – 4000 | en MODE = METRONOME, suit le tempo (valeur de note) |
| MODE | SHORT, LONG, METRONOME |  |
| REPEAT | 0 – 100 |  |
| HI-DMP | 0 – 10 |  |
| TONE | 0 – 100 |  |
| MIX | 0 – 100 |  |
| P-P | MONO, P-P |  |
| TAIL | OFF, ON |  |

## REVERB — Réverbérations

### ROOM REVERB

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| PRE DLY | 1 – 100 |  |
| DECAY | 1 – 30 |  |
| MIX | 0 – 100 |  |
| TAIL | OFF, ON |  |

### BRGHT ROOM REVERB

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| PRE DLY | 1 – 100 |  |
| DECAY | 1 – 30 |  |
| TONE | 0 – 10 |  |
| MIX | 0 – 100 |  |

### SPRING REVERB

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| PRE DLY | 1 – 100 |  |
| DECAY | 1 – 30 |  |
| MIX | 0 – 100 |  |
| TAIL | OFF, ON |  |

### PLATE REVERB

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| PRE DLY | 1 – 200 |  |
| DECAY | 0 – 100 |  |
| MIX | 0 – 100 |  |
| TAIL | OFF, ON |  |

### HALL REVERB

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| PRE DLY | 1 – 100 |  |
| DECAY | 1 – 30 |  |
| MIX | 0 – 100 |  |
| TAIL | OFF, ON |  |

### BRGHT HALL REVERB

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| PRE DLY | 1 – 100 |  |
| DECAY | 1 – 30 |  |
| TONE | 0 – 10 |  |
| MIX | 0 – 100 |  |

### HD HALL REVERB

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| PRE DLY | 1 – 200 |  |
| DECAY | 0 – 100 |  |
| MIX | 0 – 100 |  |
| TAIL | OFF, ON |  |

### AIR REVERB

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| SIZE | 1 – 100 |  |
| REFLECT | 0 – 10 |  |
| MIX | 0 – 100 |  |
| TAIL | OFF, ON |  |

## SFX — Effets spéciaux

### LOOP ROLL

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| TIME | 10 – 4000 |  |
| DUTY | 25 – 100 |  |
| BALANCE | 0 – 100 |  |
| ON/OFF | LATCH, UNLATCH |  |

### PHASER+DISTORTION

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| MODE | 1 – 4 |  |
| RATE | 0 – 50 |  |
| RESO | 0 – 10 |  |
| VOL | 0 – 100 |  |

### FRETLESS SIMULATOR

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| SENSE | 0 – 30 |  |
| COLOR | 1 – 10 |  |
| TONE | 1 – 50 |  |
| VOL | 0 – 100 |  |

### BOMBER

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| DECAY | 1 – 100 |  |
| TONE | 0 – 10 |  |
| MIX | 0 – 100 |  |
| ON/OFF | LATCH, TRIGGER |  |

## PEDAL — Pédale d'expression

### OUTPUT VOLUME PEDAL

Aucun paramètre.

### PEDAL VOLUME

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| VOL | 0 – 100 | pédale d'expression (P) |
| MIN | 0 – 100 |  |
| MAX | 0 – 100 |  |
| CURVE | A, B |  |

### BASS WAH

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| FREQ | 0 – 100 | pédale d'expression (P) |
| RANGE | 0 – 100 |  |
| DRY | 0 – 100 |  |
| VOL | 0 – 100 |  |

### BASS PEDAL PITCH

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| BEND | 0 – 100 | pédale d'expression (P) |
| COLOR | +1 OCT, +2 OCT, -1 SEMI, -2 OCT, DOWN, -/+ OCT, -5/+4TH, DETUNE, DWN/OCT |  |
| TONE | 0 – 10 |  |
| MODE | UP, DOWN |  |

### BASS PEDAL MONO PITCH

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| BEND | 0 – 100 | pédale d'expression (P) |
| COLOR | +1 OCT, +2 OCT, -1 SEMI, -2 OCT, DOWN, -/+ OCT, -5/+4TH, DETUNE, DWN/OCT |  |
| TONE | 0 – 10 |  |
| MODE | UP, DOWN |  |

### PEDAL RESONANCE

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| FREQ | 1 – 50 | pédale d'expression (P) |
| RESO | 0 – 10 |  |
| DRY | 0 – 100 |  |
| VOL | 0 – 100 |  |

## BASS AMP — Amplis basse

### FLIPTOP

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| BRIGHT | OFF, ON |  |
| TREBLE | -20.0 – 20.0 | pas : 0,1 |
| MID | -20.0 – 20.0 | pas : 0,1 |
| BASS | -20.0 – 20.0 | pas : 0,1 |
| GAIN | 0 – 100 |  |
| ULTRA | OFF, HI, LOW, BOTH |  |
| VOL | 0 – 100 |  |
| BLEND | 0 – 100 |  |

### AMPG SVT

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| BASS | -20.0 – 20.0 | pas : 0,1 |
| MID-FREQ | 32 Hz – 6.3 kHz | unité : Hz ; pas non publié |
| MID | -20.0 – 20.0 | pas : 0,1 |
| TREBLE | -20.0 – 20.0 | pas : 0,1 |
| GAIN | 0 – 100 |  |
| ULTRA | OFF, LOW, HI, BOTH, CUT |  |
| VOL | 0 – 100 |  |
| BLEND | 0 – 100 |  |

### AG 750

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| BASS | 0 – 100 |  |
| MID | 0 – 100 |  |
| TREBLE | 0 – 100 |  |
| GAIN | 0 – 100 |  |
| BRIGHT | OFF, ON |  |
| DEEP | OFF, ON |  |
| VOL | 0 – 100 |  |
| BLEND | 0 – 100 |  |

### SMR400

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| BASS | -15.0 – 15.0 | pas : 0,1 |
| MID-FREQ | 32 Hz – 6.3 kHz | unité : Hz ; pas non publié |
| MID | -15.0 – 15.0 | pas : 0,1 |
| TREBLE | -15.0 – 15.0 | pas : 0,1 |
| GAIN | 0 – 100 |  |
| ENHANCE | 0 – 100 |  |
| VOL | 0 – 100 |  |
| BLEND | 0 – 100 |  |

### EBH360

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| BASS | -10.0 – 10.0 | pas : 0,1 |
| MID | -10.0 – 10.0 | pas : 0,1 |
| TREBLE | -10.0 – 10.0 | pas : 0,1 |
| BRIGHT | 0 – 100 |  |
| DRIVE | 0 – 100 |  |
| VOL | 0 – 100 |  |
| CHARA | OFF, ON |  |
| BLEND | 0 – 100 |  |

### MINI MARK-B

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| GAIN | 0 – 100 |  |
| VINTAGE | 0 – 100 |  |
| SHAPE | 0 – 100 |  |
| VOL | 0 – 100 |  |
| BLEND | 0 – 100 |  |

### TE400SMX

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| STYLE | PICK, SLAP, FINGER |  |
| BASS | -15.0 – 15.0 | pas : 0,1 |
| MID | -15.0 – 15.0 | pas : 0,1 |
| TREBLE | -15.0 – 15.0 | pas : 0,1 |
| GAIN | 0 – 100 |  |
| SHAPE | OFF, 1, 2 |  |
| VOL | 0 – 100 |  |
| BLEND | 0 – 100 |  |

### B-MAN100

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| BASS | 10 – 100 |  |
| MID-FREQ | 32 Hz – 6.3 kHz | unité : Hz ; pas non publié |
| MID | 10 – 100 |  |
| TREBLE | 10 – 100 |  |
| GAIN | 10 – 100 |  |
| DEEP | OFF, ON |  |
| VOL | 10 – 100 |  |
| BLEND | 0 – 100 |  |

### AC 370

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| BASS | 0 – 100 |  |
| MID-FREQ | 32 Hz – 6.3 kHz | unité : Hz ; pas non publié |
| MID | 0 – 100 |  |
| TREBLE | 0 – 100 |  |
| GAIN | 0 – 100 |  |
| BRIGHT | OFF, ON |  |
| VOL | 0 – 100 |  |
| BLEND | 0 – 100 |  |

### SUN CB

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| INPUT | NORMAL, BRIGHT |  |
| BASS | 0 – 100 |  |
| MID | 0 – 100 |  |
| TREBLE | 0 – 100 |  |
| DIST | OFF, 0 – 100 |  |
| HIBOOST | OFF, ON |  |
| VOL | 0 – 100 |  |
| BLEND | 0 – 100 |  |

### MONOTONE

| Paramètre | Valeurs | Remarques |
| --- | --- | --- |
| BASS | 0 – 100 |  |
| MID | 0 – 100 |  |
| TREBLE | 0 – 100 |  |
| PRESENC | 0 – 100 |  |
| MODE | DARK, NORMAL, BRIGHT |  |
| VOL | 0 – 100 |  |
| BLEND | 0 – 100 |  |
