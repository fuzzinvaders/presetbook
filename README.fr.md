# Presetbook

*[English version](README.md)* · *[Journal des changements](CHANGELOG.fr.md)*

**Le carnet de réglages.** Les presets d'un instrument, d'un ampli, d'une pédale, d'un pédalier
entier, et les chaînes de plugins d'un logiciel d'enregistrement — rangés dans une seule page qu'on
peut chercher, dupliquer et modifier.

Né pour la basse, et le catalogue livré s'en ressent. Mais **rien dans l'outil n'est propre à la
basse.** Une façade se décrit — ses boutons, ses modes, ses commandes hors circuit — et l'interface
en découle. Pas un des modèles ci-dessous n'a coûté une ligne de code.

Amplis basse nommés : **Ampeg SVT-CL** avec son sélecteur de médiums à cinq crans et ses deux
contours Ultra, **Markbass Little Mark** et ses filtres VLE/VPF, **TC Electronic BH250**, **Fender
Rumble 40** et **Rumble 500**. Amplis guitare : **Fender Blues Junior**, **Vox AC30C2** et ses deux
canaux indépendants, **Marshall DSL40**, **Boss Katana 50**, **Laney Lionheart L20T-112** jusqu'à ses
boutons blancs à repère bleu sur panneau inox. Instruments : **Yamaha BB734A**, **Fender Precision**
et **Jazz Bass**, **Music Man StingRay**, **Ibanez SR**. Les pédales viennent en dix-huit types
génériques — un pédalier se décrit par ce que fait chaque boîtier — plus quelques modèles nommés là
où les boutons exacts comptent : **Big Muff Pi**, **Tube Screamer TS9**, **Boss DS-1** et **OC-2**,
**MXR Dyna Comp**, **SansAmp Bass Driver DI**, **Darkglass Microtubes B7K**.

Des gabarits génériques les accompagnent pour tout ce qui n'est pas dans la liste, et on dessine sa
propre façade depuis l'interface. Clavier, synthé, boîte à rythmes : si ça a des boutons, ça se range
ici.

![La reprise d'All Star, regroupée par morceau : la fiche de basse et ses cadrans en heures
d'horloge, à côté de la chaîne Reaper avec les paramètres du TSE BOD et le tableau des bandes de
ReaEQ](docs/images/par-morceau.png)

Une fiche s'affiche telle qu'on la lirait **sur le matériel** : en heures d'horloge pour un bouton
cranté au milieu, sur son échelle pour un bouton gradué, avec les vrais noms de paramètres des
plugins. Regroupez par morceau, et une reprise rassemble sa basse, son ampli et sa chaîne côte à côte.

## Essayer

Un compte de démonstration est ouvert sur l'instance publique : le bouton **Essayer la
démonstration**, ou les identifiants `demo` / `demo`. Ses fiches repartent de zéro à chaque
redémarrage du serveur — inutile d'y prendre des précautions.

![L'écran de connexion : identifiant et mot de passe, puis sous un séparateur un bouton Essayer la
démonstration, avec la mention que le compte est ouvert à tous et remis à zéro au
redémarrage](docs/images/connexion.png)

## Lire une fiche comme on lit le matériel

Rien n'est câblé en dur pour un modèle précis. Les façades sont décrites dans un registre déclaratif
— types de boutons, modes, commandes qui sortent du circuit — et l'interface en découle.

![Six fiches de basse pour une Yamaha BB734A : chaque carte montre la balance des micros, puis Bass,
Middle et Treble en cadrans marquant 14 h, 11 h, 14 h, avec une note sur la main droite et les
cordes](docs/images/basse.png)

Midi est le cran neutre ; `14 h 30` est une position réelle, pas un arrondi. Une commande hors
circuit dans le mode courant est grisée avec un `—` plutôt que masquée, pour qu'on sache qu'elle
existe. Et une valeur qui n'a pas de nombre — un seuil de compresseur qu'on descend à l'oreille — dit
**à régler** au lieu d'inventer un chiffre.

## Filtrer, puis imprimer

Deux listes de pastilles — **Matériel** et **Styles** — avec les nombres qui tiennent compte des
autres filtres déjà posés. Plusieurs choix dans une liste s'additionnent, les deux listes se
croisent. Filtrer sur une pédale ramène aussi les pédaliers qui l'emploient.

![Le panneau de filtres ouvert : Laney Lionheart et blues sélectionnés, les deux fiches
correspondantes en dessous](docs/images/filtres.png)

Le bouton **Imprimer** met sur papier exactement ce qui est affiché, filtres compris. L'en-tête dit
ce que la feuille contient — les filtres actifs, le nombre de fiches, la date — et une fiche n'est
jamais coupée entre deux pages.

![La même vue imprimée : fond blanc, deux colonnes, sans en-tête ni boutons, avec les cadrans
lisibles](docs/images/impression.png)

Le thème sombre est forcé en clair, et les aplats des cadrans sont conservés : les navigateurs les
suppriment par défaut à l'impression, or un cadran sans repère ne dit plus rien.

## Pédales et pédaliers

Un pédalier est une suite de pédales dans l'ordre du signal, chacune avec ses réglages et une case
« en circuit ». Chaque pédale est dessinée d'après ses commandes déclarées : couleur, format de
boîtier, nombre et placement des boutons. Créez la vôtre, elle est dessinée aussi — sans une ligne de
code.

![Un pédalier de scène : cinq pédales dessinées dans l'ordre du signal, reliées par des flèches de
câble — accordeur, compresseur, préampli/DI, overdrive, égaliseur graphique — les coupées grisées,
témoin éteint](docs/images/pedalier.png)

Les familles livrées portent le **jeu de commandes conventionnel de leur famille** — un overdrive a
Gain, Tone et Level ; un flanger a Manual, Depth, Rate et Res — jamais l'habillage d'un modèle
commercial précis.

## Les chaînes de Reaper, lues et réécrites

Les fichiers `.RfxChain` s'importent et s'exportent. Cinq plugins ont leur format binaire établi et
sont entièrement modifiables ; tous les autres sont conservés **à l'octet près**.

![L'éditeur de chaîne d'All Star : le TSE BOD avec ses huit vrais paramètres, puis ReaEQ avec une
ligne par bande — type, fréquence, gain, largeur](docs/images/chaine.png)

Deux garde-fous. Un effet dont les valeurs n'ont pas changé est réécrit **à l'identique** : aucun
arrondi d'affichage ne se glisse dans un réglage qu'on n'a pas touché. Et l'export **refuse en
nommant l'obstacle** plutôt que d'inventer un état qui ferait planter Reaper — sur ReaEQ, trois types
de bande seulement ont leur équivalent établi dans le fichier, les autres se choisissent dans Reaper.

## Deux langues

Le bouton `FR` / `EN` traduit l'interface **et** le catalogue : noms de fiches, notes, libellés de
commandes, familles de pédales. Les noms propres sont laissés tranquilles — une Yamaha BB734A reste
une Yamaha BB734A.

![Les mêmes fiches d'ampli en anglais : onglets All / Bass / Amp / Pedal / Pedalboard / Reaper, notes
traduites par « Mids held up to sit between two distorted guitars »](docs/images/anglais.png)

Le séparateur décimal et l'écriture des heures suivent aussi la langue (`6,5` contre `6.5`,
`12 h 30` contre `12:30`). La recherche, elle, accepte les deux langues quelle que soit celle
affichée.

## Sur le téléphone, et hors ligne

L'application **s'installe** : sur Android, un bouton **Installer** apparaît dès que le navigateur le
propose ; sur iPhone, *Partager → Sur l'écran d'accueil*. Elle s'ouvre alors dans sa propre fenêtre,
avec son icône, et **s'ouvre sans réseau** — vérifié serveur éteint, le catalogue s'affiche entier.

Le service worker va délibérément **au réseau d'abord**, et ne se replie sur sa copie que si le réseau
ne répond pas. C'est l'inverse du réflexe habituel : servir le cache en premier ferait tourner une
version périmée après chaque mise à jour, sans que rien ne le signale.

## Démarrer

```bash
docker run -d -p 8080:8080 -v presetbook-data:/data ghcr.io/fuzzinvaders/presetbook:latest
```

L'image publique est reconstruite à chaque commit, pour **amd64 et arm64** — elle tourne donc aussi
sur un Raspberry Pi. Sans Docker, le serveur n'a aucune dépendance :

```bash
brew install node   # ou l'installateur de nodejs.org
git clone https://github.com/fuzzinvaders/presetbook.git && cd presetbook && npm start
```

Puis <http://localhost:8080>. Depuis localhost, l'application est **installable** comme sur un
téléphone : bouton **Installer** sous Chrome et Edge, *Ajouter au Dock* sous Safari 17 et plus. À la première ouverture, aucun compte n'existe : le premier créé est le
vôtre.

Les mots de passe ne sont jamais enregistrés, seulement une dérivation scrypt avec un sel par compte ;
les jetons de session non plus, seulement leur empreinte SHA-256. La page fonctionne aussi sans
serveur du tout — publiée en statique, ou ouverte depuis le disque.

## Documentation

| | |
| --- | --- |
| [L'installer sur un Mac](docs/install-mac.md) 🇬🇧 | pas à pas, pour qui n'ouvre jamais un terminal : ni Docker, ni Homebrew, ni git |
| [Utiliser Presetbook](docs/utilisation.md) | lire et modifier une fiche, composer un pédalier, créer une façade, importer une chaîne de Reaper, partager, filtrer, imprimer, exporter, sauvegarder |
| [Installer et exploiter](docs/installation.md) | Docker, reverse proxy, mise à jour, comptes, compte de démonstration, sécurité, script tiers |
| [Développer](docs/developpement.md) | architecture, modèle de données, registres, codec `.RfxChain`, les deux langues, tests |

## Tests

```bash
npm test
```

Vingt-deux suites, 841 vérifications, sans rien à installer : le rendu de la page rejoué dans un DOM
minimal, le registre des façades, celles créées depuis l'interface, le formulaire qui les crée, les
pédales et leur dessin, le codec des chaînes d'effets sur une chaîne réelle, les types de bande de
ReaEQ, l'export d'une fiche et son retour dans une autre bibliothèque, la licence et le widget de
dons, la création de comptes, le compte de démonstration éprouvé contre un vrai serveur, les filtres et la
feuille d'impression, le téléphone et l'installation, et la version anglaise — treize écrans rendus en anglais, qui échouent si un mot français y subsiste.

## Licence et dons

Copyright © 2026 fuzzinvaders.

**Logiciel libre sous [AGPL-3.0-or-later](LICENSE), et gratuit.** Vous pouvez l'utiliser, l'étudier,
le modifier et le redistribuer. L'AGPL ajoute une seule contrainte à la GPL, et c'est celle qui
compte pour une application web : **si vous en hébergez une version modifiée pour d'autres, vous
devez proposer votre code source à ses utilisateurs.** Un usage privé, lui, n'oblige à rien.

C'est le choix adapté à un outil auto-hébergeable : il garantit que les améliorations restent
partageables, y compris quand l'application est servie plutôt que distribuée.

Les dons sont **bienvenus, jamais demandés** — rien n'est bridé, rien n'expire, aucune fonction
n'attend un paiement : <https://ko-fi.com/talva>.

Le bouton flottant vient d'un script servi par Ko-fi. Il n'est chargé **qu'une fois la session
ouverte**, pour qu'un script tiers ne partage jamais sa page avec le champ de mot de passe, et il est
absent de la page publiée. Pour le retirer entièrement, videz la constante `KOFI` dans
`public/index.html` : le lien du pied de page, lui, ne dépend d'aucun tiers.

Le catalogue livré relève de la même licence. Les valeurs de réglages, elles, sont des faits — un
égaliseur à 14 h reste un égaliseur à 14 h, et personne n'en possède la mesure.
