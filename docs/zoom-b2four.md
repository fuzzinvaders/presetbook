# Zoom B2 FOUR dans Presetbook

Presetbook décrit des patchs du multi-effets basse **Zoom B2 FOUR** : la chaîne d'effets dans l'ordre, les
modèles d'ampli et leurs réglages, la basse et la façon de la jouer, le niveau à vérifier en groupe. Les fiches
s'organisent en **banques** (une setlist), s'exportent et se réimportent en JSON.

Le B2 FOUR est rangé dans la catégorie **Multi-effet** : un appareil qui réunit plusieurs effets, à ne pas confondre
avec un pédalier, qui enchaîne des pédales séparées. Les outils décrits ici — catalogue, chaîne, patchs, banque —
sont propres au B2 FOUR ; un autre multi-effet (Zoom B6, HX Stomp…) se décrit dans *Matériel* par ses boutons, comme
un ampli, sans hériter de cette structure.

**Un preset par famille sonore, pas par morceau.** Une fiche représente une famille cohérente — Clean Rock, Indie
Drive, Punk Attack, New Wave… — et liste les morceaux qu'elle sert. Une banque de six à huit familles joue tout un
set avec peu de patchs et peu de changements au pédalier ; une variante ne s'ajoute que lorsqu'un morceau demande
vraiment autre chose. Presetbook signale les doublons et les différences artificielles.

> Ce JSON est le format d'échange de Presetbook. **Ce n'est pas un fichier que le B2 FOUR peut charger** : on
> recopie les réglages sur l'appareil.

- Liste exhaustive des effets et paramètres : [zoom-b2four-effets.md](zoom-b2four-effets.md)
- Schéma JSON complet : [zoom-b2four.schema.json](zoom-b2four.schema.json)
- Exemple importable, une fiche : [exemples/indie-drive.presetbook.json](exemples/indie-drive.presetbook.json)
- Exemple importable, une banque (INDIE DRIVE seul, point de départ de YASER) :
  [exemples/yaser-exemple.b2four-bank.json](exemples/yaser-exemple.b2four-bank.json)

## D'où viennent les données

Rien n'est inventé. Trois documents de ZOOM, et eux seuls :

| Document | Ce qu'on en tire |
| --- | --- |
| *B2 FOUR Effect Types and Parameters* (©2023, Z2I-4875-01) | les 104 effets, leurs 522 paramètres, plages et listes de valeurs |
| Mode d'emploi du B2 FOUR | 300 mémoires, 5 effets au plus, un ampli et une pédale au plus, tempo 40–250 bpm, caractères d'un nom, les 6 DI MODEL |
| *B2 FOUR Patch Memory List* (Preset Ver. 1.00, Z2I-4880-01) | la numérotation réelle : patchs d'usine **001 à 250** ; noms d'usine de 14 caractères au plus |

Ce que ces documents **ne donnent pas** n'est pas complété : pas de valeur par défaut, pas d'unité non imprimée
(les ±12,0 des égaliseurs restent sans unité), pas de pas de réglage pour les fréquences (seules les bornes sont
publiées). Les descriptions d'effets de ZOOM ne sont pas reproduites — le document l'interdit — : seuls les faits
le sont.

Vérifié à l'œil sur le PDF, là où l'extraction du texte ne suffisait pas : le troisième choix du MODE des delays
est une icône de métronome (le temps suit alors le tempo du patch, en valeur de note) ; les noms coupés sur deux
lignes s'écrivent par exemple « ZTRON FILTER », « NEW YORK MUFF FUZZ », « BASS TS DRIVE ».

## Architecture

Presetbook reste sans dépendance : une page (`public/index.html`), un serveur en modules natifs (`server.js`), et
des modules partagés entre la page et Node.

| Fichier | Rôle |
| --- | --- |
| `public/zoom-b2four.js` | **nouveau** — le catalogue (104 effets), les limites de l'appareil, les contrôles (`validatePreset`, `validateBank`), l'enveloppe de banque. Seule source des données Zoom. |
| `public/index.html` | une catégorie de fiche **Multi-effet** ; pour le B2 FOUR : carte, éditeur, variantes, comparaison, banque dans les setlists, import et export |
| `tools/zoom-docs.js` | **nouveau** — régénère la liste des effets et le schéma depuis le catalogue |
| `test/zoom.test.js` | **nouveau** — catalogue, règles, import/export sans perte, banque, anglais, aller-retour serveur |
| `server.js` | inchangé : les fiches personnelles et les setlists sont déjà conservées telles quelles |

Ce qui existait est réutilisé et n'a pas changé de comportement : l'enveloppe d'export d'une fiche
(`{v:1, presetbook:"preset", preset, gear}`), l'import par dépôt ou par sélecteur, la duplication, les setlists, le
filtre par marque et par matériel, la comparaison. Les fiches des cinq autres genres ne sont pas touchées.

## Modèle d'une fiche du B2 FOUR

```json
{
  "id": "u-reptilia", "kind": "multi", "gear": "b2four", "catalog": "B2FOUR-FX/Z2I-4875-01",
  "name": "INDIE DRIVE", "patchName": "INDIE DRIVE", "patch": 251, "tempo": null,
  "family": "Indie Drive",
  "songs": [{ "title": "Reptilia", "artist": "The Strokes" }],
  "tags": ["indie-rock", "garage-rock", "rock-alternatif"],
  "bass": { "gear": "bb734a", "mode": "actif", "balance": 50, "eq": { "b": 0.5, "m": 1, "t": 1 },
            "strings": "Rondes nickel", "gauge": "45-105", "jeu": "médiator", "tech": "Dunlop Ultex 0,60 mm…" },
  "chain": [
    { "fx": "DYNAMIC COMPRESSOR", "on": true, "p": { "SENSE": 6, "ATTACK": "FAST", "TONE": 55, "VOL": 50 } },
    { "fx": "AMPG SVT", "on": true, "p": { "BASS": 2, "MID-FREQ": 500, "MID": 3, "TREBLE": 3, "GAIN": 35,
                                          "ULTRA": "OFF", "VOL": 70, "BLEND": 100 } }
  ],
  "level": { "state": "a-verifier", "note": "…" },
  "variant": "", "variantOf": null, "notes": "…", "maj": "2026-11-25T12:00:00.000Z"
}
```

| Champ | Sens |
| --- | --- |
| `kind`, `gear` | `multi` (Multi-effet) et `b2four`. Les fiches 1.14 et 1.15 portaient `kind: "zoom"` : elles sont converties à l'ouverture et à l'import, même identifiant, mêmes réglages. |
| `name`, `patchName` | le nom du preset, celui de sa famille sonore (« INDIE DRIVE »), et son nom sur l'appareil |
| `family` | la famille sonore, choisie parmi celles déjà créées ou nommée une première fois : Clean Rock, Indie Drive, Punk Attack… |
| `songs` | les morceaux que le preset sert, `{title, artist}`. Remplace le `song` unique de la 1.14 : une fiche qui le porte encore est convertie à l'ouverture ou à l'import. |
| `patch` | mémoire 1 à 300 (affichée 001–300). 001–250 sont les patchs d'usine : 251–300 restent libres. |
| `patchName` | nom sur l'appareil (par défaut, `name`) |
| `tempo` | tempo du patch, 40 à 250 bpm ; utile aux delays en mode métronome |
| `bass` | la basse, avec les clés de sa façade dans Presetbook (BB734A : `mode`, `balance`, `eq.b/m/t` en crans), les cordes, le tirant, le jeu (`doigts`, `médiator`) et la technique |
| `chain` | les blocs **dans l'ordre du signal**, 5 au plus. `fx` est le nom exact de ZOOM, `p` ses réglages par nom de paramètre, `on` l'état du bloc. Les modèles d'ampli y figurent comme les autres effets. |
| `level` | `a-verifier` ou `equilibre`, et une note : le niveau ne se calcule pas, il se vérifie en groupe |
| `variant`, `variantOf` | une variante ponctuelle (couplet/refrain, avec/sans saturation) et la fiche dont elle part ; elle liste les seuls morceaux où elle sert |

Valeurs : un nombre dans la plage du document ; une chaîne pour une liste (`"FAST"`, `"1.0 kHz"`, `"4:1"`) ; une
fréquence en Hz (`500` pour 500 Hz) ; `"OFF"` là où le document l'imprime ; une valeur de note (texte) pour le temps
d'un delay en mode `METRONOME`.

**Baffle** : le B2 FOUR n'a pas de modèle de baffle à choisir ni à couper ; il est compris dans chaque modèle
d'ampli. Il n'y a donc pas de champ « baffle ».

**DI MODEL** : un réglage global de l'appareil (sélecteur sur le dessus), pas d'un patch. Il est rangé dans la
configuration de la **banque**. Une recommandation propre à un morceau peut aller dans les notes.

## Une banque

Une banque est une setlist : ses morceaux dans l'ordre, et les fiches du B2 FOUR qui en servent au moins un — chacune une
seule fois, triées par numéro de patch. Sa configuration porte le DI MODEL.

L'écran de la banque dit, morceau par morceau, quel preset le joue (le principal, puis ses variantes), combien de
**changements de patch** demande le set d'un bout à l'autre, et quels morceaux n'ont encore **aucun preset**.

```json
{ "v": 1, "presetbook": "bank", "device": "zoom-b2four", "catalog": "B2FOUR-FX/Z2I-4875-01",
  "name": "YASER", "config": { "di": "TUBE 1" }, "presets": [ … ], "gear": {} }
```

À l'import, les fiches entrent une par une et la banque redevient une setlist, avec son DI MODEL.

## Contrôles à l'import

**Refusé** (la fiche, ou la banque entière) :

| Cas | Portée |
| --- | --- |
| enveloppe de banque d'un format plus récent (`v` > 1), d'un autre appareil, sans liste de fiches | toute la banque |
| genre autre que `zoom`, nom manquant, chaîne absente | la fiche |
| plus de 5 effets | la fiche |
| plus d'un effet BASS AMP, ou plus d'un effet PEDAL | la fiche |
| effet inconnu du catalogue (nommé dans le message) | la fiche |

**Signalé, la valeur conservée** :

| Cas |
| --- |
| paramètre inconnu pour cet effet |
| valeur hors plage, hors liste, interdite (`SENSE` 0) ou avec trop de décimales |
| catalogue différent de celui de cette version |
| numéro de patch hors 001–300, ou déjà pris dans la banque |
| tempo hors 40–250 bpm |
| caractère qu'un nom du B2 FOUR ne prend pas ; nom de plus de 14 caractères |
| DI MODEL inconnu ; basse dont la façade n'existe pas ici |
| morceau sans titre dans la liste ; famille illisible |

**Signalé dans une banque, pour la garder compacte** — deux fiches comparées bloc par bloc, quand leur chaîne est la
même (mêmes effets, même ordre, même état) :

| Cas | Message |
| --- | --- |
| mêmes réglages | un seul patch suffit |
| écarts tous petits — moins d'un dixième de la course d'un paramètre, moins d'un quart d'octave pour une fréquence, aucun choix de liste différent | une seule famille suffirait sans doute |
| une variante identique à sa fiche d'origine | elle ne change rien |
| une variante qui en diffère à peine | est-elle utile ? |
| deux fiches principales (pas des variantes) pour un même morceau | un seul preset principal par morceau |

Rien de tout cela n'est refusé : c'est au musicien de trancher.

Rien n'est écrasé : une fiche déjà présente entre en copie, nom suivi de *(importée)*, et une variante suit sa
fiche d'origine même si celle-ci a changé d'identifiant. Un compte-rendu liste chaque fiche, refusée ou non, et
pourquoi. Le schéma JSON décrit un fichier **conforme** ; l'import est volontairement plus tolérant, pour ne
perdre aucune valeur.

## Limites

- **Pas de transfert vers l'appareil.** Le format de Presetbook n'est pas celui du B2 FOUR ; les réglages se
  recopient à la main.
- **Surcharge du processeur.** Le B2 FOUR peut couper un effet (« PROCESS OVERFLOW ») même à cinq effets ou moins ;
  la charge de chaque effet n'est pas publiée, Presetbook ne peut donc pas la prévoir.
- **Pas des fréquences.** Seules les bornes sont publiées : une fréquence saisie se règle à la valeur la plus
  proche sur l'appareil. Les valeurs de l'exemple (500 Hz sur l'AMPG SVT, 50 Hz) figurent dans des patchs d'usine.
- **Valeurs de note des delays** en mode métronome, et types intermédiaires du filtre ENVELOPE GENERATOR (entre
  HPF2 et LPF4) : non publiés, saisis en texte, non contrôlés.
- **Longueur d'un nom** : non publiée ; 14 caractères est la longueur maximale des noms d'usine.
- **Niveau** : aucun réglage ne donne le volume final (il dépend de toute la chaîne et du volume général) ; il se
  vérifie aux essais.
- **Rythmes et looper** : hors du catalogue des effets, non décrits.
- **Mise à jour du firmware** : une version qui ajouterait des effets demandera un nouveau catalogue ; le champ
  `catalog` permet de le repérer.

## Créer, importer, modifier, exporter

1. **Créer** — *Nouveau preset* → *Multi-effet* (le B2 FOUR est l'appareil proposé). Dans *Patch du B2 FOUR*, choisis
   la **famille sonore** dans la liste, ou *Nouvelle famille…* pour en nommer une : le nom du preset et celui de
   l'appareil la reprennent s'ils sont vides. Puis le numéro (251 à 300 pour ne rien écraser) et le tempo si un delay
   le suit. Dans *Morceaux servis*, ajoute chaque morceau que ce preset joue, à la main ou parmi ceux déjà
   enregistrés — fiches et setlists ; ✕ retire l'association sans toucher au morceau. Rien n'est attribué tout seul.
2. **La basse** — choisis l'instrument : ses boutons apparaissent comme sur sa fiche. Note les cordes, le tirant,
   le jeu et la technique.
3. **La chaîne** — *+ Ajouter un effet*, par catégorie. Chaque bloc montre ses paramètres avec la plage du
   document ; les flèches changent l'ordre. Le contrôle en tête de la chaîne dit tout de suite si la fiche tient
   dans l'appareil. Un second ampli ou une sixième place ne se proposent pas.
4. **Le niveau** — laisse *À vérifier aux essais* ; passe à *Équilibré* une fois réglé en groupe, avec une note.
5. **Une variante** — *Variante* sur la carte : mêmes réglages, son propre numéro de patch. Garde-lui les seuls
   morceaux où elle sert, et un vrai changement de son : sinon la banque le signale.
6. **La banque** — *Setlists* → une setlist → *Banque Zoom B2 FOUR* : le DI MODEL, le nombre de presets et de
   changements de patch, le preset de chaque morceau, les doublons, le tableau des patchs, puis *Exporter la banque
   (.json)*. *Exporter toutes les fiches Zoom* est dans la liste
   des setlists.
7. **Exporter une fiche** — *Exporter* sur sa carte.
8. **Importer** — dépose un ou plusieurs `.json` sur la page, ou *Sauvegarde* → *Importer un fichier*. Une fiche
   s'ajoute ; une banque ajoute ses fiches et sa setlist ; un compte-rendu s'ouvre s'il y a quelque chose à dire.

Pour régénérer la liste des effets et le schéma après une modification du catalogue :

```bash
node tools/zoom-docs.js
```
