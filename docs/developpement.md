# Développer Presetbook

*[English version](developing.md)*

## Ce qui compose l'application

| Fichier | Rôle |
| --- | --- |
| `public/index.html` | l'application entière : styles, catalogue, registres, interface |
| `public/rfxchain.js` | lecture et écriture des chaînes d'effets de Reaper |
| `server.js` | serveur sans dépendance : statique, comptes, API de persistance |
| `test/` | dix-neuf suites, exécutables sans rien installer |
| `tools/` | six outils en ligne de commande, embarqués dans l'image |

Deux partis pris tiennent tout le reste. **L'application est une page unique et autonome**, ce qui
lui permet de fonctionner servie par ce serveur, publiée comme page statique, ou ouverte depuis le
disque. Et **rien n'est câblé en dur pour un matériel ou un plugin précis** : deux registres
déclaratifs décrivent les façades et les plugins, et l'interface en découle.

## Une page, trois contextes

Au démarrage, la page essaie les stockages dans cet ordre :

1. **l'API de ce serveur** (`api/presets`), avec comptes ;
2. **le fichier de données d'une page publiée**, en écriture par la capacité d'auto-publication ;
3. **le stockage local du navigateur**, puis la mémoire seule.

L'écran de connexion n'apparaît que dans le premier cas, puisque les deux autres n'ont pas de
serveur. `public/rfxchain.js` étant un fichier séparé, l'import et l'export de chaînes disparaissent
proprement là où il n'est pas servi : l'interface teste sa présence au lieu de proposer un bouton qui
échouerait.

## Le modèle de données

Le **catalogue livré** est la constante `SEED` de `public/index.html` : il fait partie du code. Les
données de l'utilisateur sont à part, et ce sont les seules écrites sur le disque :

```json
{
  "v": 1,
  "custom":    [ /* les fiches créées */ ],
  "overrides": { "b-motown": { /* une fiche du catalogue, modifiée */ } },
  "gear":      { "g-svt": { /* une façade créée */ } },
  "hidden":    [ "a-casque" ],
  "trash":     [ { "at": "…", "preset": { }, "gear": { } } ],
  "lang":      "en",
  "updated":   "2026-08-26T09:00:00.000Z"
}
```

La bibliothèque affichée est la fusion des deux, calculée au chargement. Conséquence : enrichir
`SEED` ne détruit jamais le travail de l'utilisateur, et les identifiants doivent rester stables
puisque c'est par eux que ses modifications sont rattachées.

Le serveur ne conserve que ces clés. **Ajouter une notion persistante demande donc de l'ajouter aussi
dans `sanitizeState`**, sans quoi elle serait silencieusement jetée au premier enregistrement.

## Ajouter un preset au catalogue

Dans `SEED`, avec les fabriques qui raccourcissent les déclarations :

```js
forSong(bass("b-allstar", "All Star", ["rock","cover"], "actif", 55,
  {b: pctToCrans(55), m: 0, t: pctToCrans(52)},
  "Médiator, attaque appuyée", "Rondes rodées", "Plus d'attaque, sans devenir métallique."),
  "All Star", "Smash Mouth"),
```

Conventions : sur un bouton cranté, la valeur est un nombre de **crans depuis midi** (`0` = 12 h,
`+2` = 14 h, `-3` = 9 h) au quart de cran, et `pctToCrans()` convertit une position donnée en
pourcentage de course. Une balance va de `0` à `100`. Sur une échelle, la valeur est celle de la
façade.

## Le registre des façades

```js
"bb734a": {
  kind:"bass", brand:"Yamaha", model:"BB734A", face:"bass", dim:"passif",
  modes:{ options:["actif","passif"], off:{ passif:["eq.b","eq.m"] } },
  controls:[
    {k:"balance", t:"balance", l:"Balance", a:"P", b:"J", d:50},
    {k:"eq.b", t:"clock", l:"Bass", d:0},
    {k:"eq.t", t:"clock", l:"Treble", lAlt:{passif:"Tonalité"}, d:0}
  ],
  extras:[{k:"tech", l:"Main droite"}, {k:"strings", l:"Cordes"}]
}
```

| Type | Rendu |
| --- | --- |
| `clock` | cadran cranté à midi, ±5 crans par quart, affiché en heures |
| `scale` | échelle bornée avec ses décimales |
| `balance` | 0 pour le premier micro, 100 pour le second |
| `switch` | interrupteur, rendu en étiquette sur la fiche |
| `slider` | curseur vertical, une bande d'égaliseur en décibels |

`modes` donne un sélecteur et, pour chaque mode, la liste des commandes **hors circuit**. `needs`
fait dépendre une commande d'une autre. `face` choisit l'aspect du bouton : `bass`, `amp` ou
`plain`. `lAlt` change un libellé selon le mode.

**Les clés sont des chemins** : `eq.b` se range sous `eq`, et une commande créée depuis l'interface
reçoit une clé en `c.<libellé>`, donc sous `c`. C'est ce qui distingue nettement une commande
personnelle d'une commande livrée.

## Les pédales

Une pédale est une façade : elle entre dans le même registre, avec `kind:"pedal"` et une couleur de
boîtier. Le raccourci `PEDALS` décrit les familles livrées, et une boucle les verse dans `GEAR` au
chargement.

```js
"pd-od": {model:"Overdrive", color:"#E9D53F",
          controls:[pk("gain","Gain",4), pk("tone","Tone",5), pk("level","Level",6)]},
```

`pk()` déclare un bouton de 0 à 10, `fader()` une bande d'égaliseur en décibels. Trois champs
décident de l'allure du boîtier : `color`, `style` (une entrée de `PEDAL_STYLES`) et `perRow`.

`PEDAL_STYLES` décrit des **formats** — `std`, `treadle`, `tall`, `big`, `mini` — chacun avec un
nombre de boutons par rangée par défaut, une marge, une forme de commande au pied et une taille de
nom. Ce sont des gabarits, pas des marques.

Le **dessin** est engendré par `pedalArt(gear, valeurs)` : `luma()` décide de la couleur du texte
d'après celle du boîtier, et chaque rangée de boutons est **centrée sur la largeur** — y compris la
dernière quand elle est incomplète, ce qui donne le triangle classique à trois boutons. Rien n'est
codé pour une famille en particulier, donc une pédale créée depuis l'interface est dessinée elle
aussi.

Attention au nom : `fader()` construit une **description** de commande, tandis que `faderCell()` en
produit le **rendu**. La collision entre les deux a déjà cassé la construction du catalogue — la
seconde déclaration écrasait la première.

Un **pédalier** (`kind:"board"`) porte `slots:[{gear, on, role, v}]` : `v` tient les valeurs de cette
pédale-là, ce qui permet à la même famille d'apparaître deux fois avec des réglages différents.
`boardArt()` les dessine côte à côte, reliées par un câble.

## Le registre des plugins

Deux formes, selon que le plugin a des paramètres ou des bandes :

```js
"ReaComp": { params:[ {k:"attack", l:"Attack", min:0, max:500, step:1, d:3, u:"ms"}, … ] },
"ReaEQ":   { bands:{ types:[…], dflt:{t:"Band", f:1000, g:0, bw:1} } }
```

`t:"bool"` donne une case à cocher, `t:"enum"` avec `opts` une liste déroulante, `inf:true` affiche
`−∞` au minimum, et le nombre de décimales suit le `step` — un paramètre au pas de `0,01` s'affiche
`0,60`, comme dans le plugin. Un champ laissé **vide** vaut « à régler à l'oreille ».

Les noms, unités et bornes doivent venir de la **fenêtre réelle** du plugin, jamais d'une échelle
inventée. La vue « paramètres génériques » de Reaper est la meilleure source : elle donne l'ordre
exact et les unités.

## Le codec des chaînes d'effets

`public/rfxchain.js` lit et réécrit un `.RfxChain`, qui est du texte : une liste d'effets, chacun avec
son état `BYPASS`, son identité et son état encodé en base64.

| Plugin | État |
| --- | --- |
| **TSE BOD** | du **XML** nommé : `BOD_Input`, `BOD_Drive`, `BOD_Bass`, `BOD_Treble`… Entièrement modifiable |
| **ReaEQ** | bandes de 33 octets : type (entier), actif, fréquence et largeur en `double`, **gain en rapport linéaire** (1,2589 = +2,0 dB) |
| **ReaComp** | signature de 8 octets puis **21 flottants**, dans l'ordre de la vue générique |
| **ReaVerbate** | même principe, **8 flottants** |
| **JSFX** | curseurs en texte clair, `-` pour « au défaut » |
| **Autres** | bloc binaire **conservé à l'octet près**, non interprété |

Échelles établies en croisant des chaînes réelles avec leurs valeurs connues : Threshold, Wet et Dry
sont des amplitudes linéaires (`-150 dB` valant `-inf`) ; Ratio vaut `(r-1)/99` ; Attack, Release,
Pre-comp, RMS et Knee sont normalisés sur `500 ms`, `5000 ms`, `500 ms`, `100 ms` et `24 dB` ; les
fréquences sur `20 kHz`, vérifié sur deux points indépendants.

Deux règles de fidélité, que les tests vérifient :

- **un paramètre dont la valeur affichée n'a pas changé est réécrit avec son flottant d'origine.**
  Sans cette précaution, l'arrondi d'affichage se glisserait dans un réglage non touché ;
- **on ne devine pas.** Les types de bande ReaEQ affichés par le plugin sont Low Shelf, High Shelf,
  Band, Low Pass, High Pass, All Pass, Notch, Band Pass, Parallel Band Pass, Band (alt), Band (alt
  2), mais **l'entier stocké ne suit pas cet ordre** : 3 et 4 valent bien Low Pass et High Pass,
  tandis que « Band », troisième au menu, est stocké 8. Seuls ces trois-là sont établis ; l'export
  refuse un type inconnu en nommant la bande, et un entier venu d'un import est conservé tel quel.

Pour compléter la table : dans Reaper, un ReaEQ seul, onze bandes, la bande *n* réglée sur le
*n*-ième type du menu, puis

```bash
npm run learn:eqtypes -- temoin.RfxChain
```

L'outil lit les entiers dans l'ordre et affiche la table à recopier. Il refuse si le témoin ne
correspond pas au menu, ou si une bande contredit une correspondance déjà connue.

## Les deux langues

Le français est la langue **source** : le catalogue, les libellés et les messages sont écrits en
français dans le code, et le dictionnaire `EN` est indexé par la chaîne française elle-même. Il n'y
a donc pas de clés à inventer, et une phrase sans traduction s'affiche en français au lieu de
disparaître.

Tout passe par **trois** points, et trois seulement :

| Fonction | Ce qu'elle traduit |
| --- | --- |
| `esc(s)` | tout contenu affiché — donc tout le catalogue, sans y penser |
| `tHtml(h)` | les textes d'un fragment HTML, entre `>` et `<` ; un fragment sans balise se traduit en entier |
| `tf(motif, …)` | un message à trou : `"La commande {0} n'a pas de libellé."` |

`tHtml` **ne touche pas aux attributs** : un `placeholder` ou un `aria-label` se traduit à la main
avec `t()`, comme le fait `renderChrome()` pour l'en-tête. C'est voulu — traduire les attributs
casserait les `data-*` sur lesquels reposent les gestionnaires d'événements.

Conséquence pratique : **une chaîne concaténée avant d'atteindre `esc` ou `tHtml` n'est jamais
traduite**, puisque la phrase composée n'existe pas dans le dictionnaire. Deux réflexes :

```js
toast(used + " fiche utilise…");                     /* non : jamais traduit */
toast(tf("{0} fiche utilise…", used));               /* oui */
'<p>' + n + ' pédales dans l’ordre du signal</p>'    /* non */
'<p>' + n + ' ' + t("pédales dans l’ordre du signal") + '</p>'   /* oui */
```

Deux valeurs suivent la langue sans passer par le dictionnaire : `dec()` pour le séparateur décimal,
et `hourLabel()` pour l'écriture des heures d'égaliseur. La recherche, elle, empile les deux langues
dans sa botte de foin, donc un mot anglais trouve une fiche affichée en français et réciproquement.

La langue vient, par ordre de priorité : de `?lang=`, puis de `S.lang` enregistré avec les données
de l'utilisateur, puis du navigateur. `setLang()` la retient et réenregistre ; `server.js` doit la
laisser passer dans `sanitizeState`, sans quoi elle serait perdue au premier aller-retour.

`test/langue.test.js` est le filet : il rend **treize écrans** en anglais et échoue s'il y trouve
un mot français, relit les messages éphémères directement dans la source pour vérifier qu'ils ont
tous leur traduction, et contrôle que le français n'a pas bougé. Après avoir ajouté du contenu, il
suffit de le lancer pour savoir ce qui manque au dictionnaire.

## Outils

```bash
npm run import:rfx -- 90srock.RfxChain          # résumé lisible d'une chaîne
node tools/rfxchain-import.js chaine.RfxChain --json
npm run learn:eqtypes -- temoin.RfxChain
npm run captures                                # refait les images du README
npm run icones                                  # refait les PNG depuis public/icone.svg
```

### L'installation et le hors-ligne

`public/manifest.webmanifest`, `public/sw.js` et `public/icone.svg` suffisent à rendre l'application
installable. Les PNG sont engendrés depuis le SVG par `npm run icones` : le dessin a une seule source.

Le service worker va **au réseau d'abord**, et ne se sert du cache que si le réseau ne répond pas.
C'est l'inverse du réflexe habituel, et c'est délibéré : un service worker qui sert le cache en
premier fait tourner une version périmée après chaque mise à jour, sans que rien ne le signale. Sur
une page qu'on met à jour souvent, c'est le pire défaut possible — et il est déjà arrivé ici sans
service worker, ce qui a valu la sonde `/healthz`.

Deux chemins ne sont jamais mis en cache : `/api/` et `/healthz`. Le premier porte l'état du compte,
le second sert justement à savoir quelle version tourne. Et l'enregistrement passe
`updateViaCache:"none"`, sans quoi le `max-age=3600` des fichiers `.js` garderait un worker périmé
une heure avant même de vérifier.

Le service worker ne s'enregistre pas depuis un `file://` ni dans la page publiée. Attention si vous
le testez : **le volet de navigation intégré à Claude Code refuse les service workers** — la
vérification demande un vrai navigateur.

### Les captures du README

`tools/captures.js` rend l'application dans un navigateur sans interface et écrit les PNG de
`docs/images/`. Les vues sont atteintes par les **paramètres d'URL que l'application comprend déjà**
(`?kind=`, `?group=`, `?q=`, `?edit=`, `?lang=`) : c'est ce qui les rend reproductibles sans piloter
de souris, et c'est la raison de ne pas y ajouter une vue qui demanderait un clic.

Il cherche Edge puis Chrome aux emplacements habituels ; `NAVIGATEUR=/chemin/vers/chromium` passe
devant. Les captures sont prises depuis `file://`, donc sans serveur — seule `connexion.png` en
demande un, et l'outil rappelle la marche à suivre au lieu de la laisser deviner.

Après une modification visible de l'interface, relancer l'outil et regarder les images changées :
c'est aussi une relecture du rendu. Le poids total tient sous le mégaoctet, à surveiller si des vues
s'ajoutent.

## Tests

```bash
npm test
```

Dix-neuf suites, sans rien à installer. Les unes rejouent la page dans un DOM minimal, les autres
lancent un **vrai serveur** — les droits, les sessions et l'écriture sur disque ne se vérifient pas
autrement.

| Suite | Ce qu'elle couvre |
| --- | --- |
| `harness.js` | le rendu réel de la page : catalogue, cadrans, façades, chaînes |
| `gear.test.js` | le registre des façades, les défauts, les commandes hors circuit |
| `gearcustom.test.js` | les façades créées, le registre fusionné, la conservation |
| `gearform.test.js` | la liste et le formulaire de façade |
| `pedals.test.js` | le registre des pédales, leur dessin, le chaînage d'un pédalier |
| `rfxchain.test.js` | le codec sur une chaîne réelle, aller-retour et modifications |
| `eqtypes.test.js` | les types de bande : refus, conservation, ajout et retrait |
| `export.test.js` | l'export d'une fiche et son retour dans une autre bibliothèque |
| `licence.test.js` | la licence, les en-têtes SPDX, les garde-fous du widget de dons |
| `comptes.test.js` | les écrans de compte selon le rôle, et les refus avant le réseau |
| `filtres.test.js` | les facettes, leurs comptes croisés, la feuille d'impression |
| `mobile.test.js` | la balise viewport, les règles étroites, le manifeste, le service worker |
| `demo.test.js` | *serveur* — les quatre mises à l'écart du compte de démonstration |
| `compression.test.js` | *serveur* — ce qui part réellement sur le fil, en HTTP brut |
| `motdepasse.test.js` | *serveur* — mot de passe, rôles, suppression de compte |
| `invitations.test.js` | *serveur* — le cycle d'une invitation, et la démo qui se rafraîchit |
| `partage.test.js` | *serveur* — publier, reprendre, retirer, et ce qui est refusé |
| `corbeille.test.js` | *serveur* — corbeille, instantanés, et l'intégrité des fichiers |
| `langue.test.js` | l'audit d'anglais : treize écrans, aucun mot français toléré |

`test/sandbox.js` exécute le script de la page dans un DOM minimal, sous `node:vm`. La page expose
pour cela `window.__pb`, une **couture de test en lecture** qui donne accès aux registres et aux
fonctions pures, sans effet sur l'interface. C'est ce banc qui a rattrapé deux erreurs qu'aucune
capture d'écran ne montrait clairement : un registre lu avant sa définition, et un accès à une clé
absente d'une définition de plugin.

Une fixture réelle, `test/fixtures/90srock.RfxChain`, sert de référence au codec.

## Le miroir publié

`public/index.html` est aussi publié comme page autonome. Le miroir n'emporte que ce fichier : les
fonctions qui dépendent de `rfxchain.js` s'effacent d'elles-mêmes, et l'écran de connexion
n'apparaît pas faute de serveur. Toute modification de la page doit donc rester lisible dans les deux
contextes.
