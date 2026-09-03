# Utiliser Presetbook

*[English version](using.md)*

Presetbook range des réglages : ceux d'un instrument, d'un ampli, d'une pédale d'effet, d'un
pédalier entier, et les chaînes de plugins d'un logiciel d'enregistrement. Une fiche décrit un
réglage complet, et s'affiche telle qu'on la lirait sur le matériel — pas sur une échelle abstraite.

Le catalogue livré est celui d'un bassiste, mais l'outil ne l'est pas : une façade se **décrit**,
elle n'est pas codée. Guitare, clavier, synthé, boîte à rythmes — tout matériel à boutons se range
ici, et la section [Le matériel](#le-matériel) explique comment le déclarer.

## Les cinq sortes de fiches

| Sorte | Ce qu'elle porte |
| --- | --- |
| **Instrument** | le matériel choisi, ses modes, la balance des micros, l'égaliseur, la main droite, les cordes |
| **Ampli** | le matériel choisi, le gain, les interrupteurs de caractère, le canal saturé, l'égaliseur |
| **Pédale** | l'effet choisi et ses réglages, avec le dessin du boîtier |
| **Pédalier** | des pédales dans l'ordre du signal, chacune avec ses réglages et son état |
| **Chaîne** | le tempo, l'accordage, et les plugins dans l'ordre, avec leurs vrais paramètres |

Chaque fiche peut être rattachée à un **morceau** (titre et artiste). C'est ce qui permet de
rassembler d'un côté la basse, l'ampli et la chaîne d'une même reprise.

## L'écran principal

En haut, à droite du titre :

- une **pastille de stockage** qui dit où vont les enregistrements — voir plus bas ;
- le **compte connecté** et sa déconnexion, en déploiement autonome ;
- **Comptes**, pour changer son mot de passe ou supprimer son compte — et, pour l'administrateur,
  ouvrir un compte et gérer les autres. Voir plus bas ;
- **Matériel**, pour gérer les façades ;
- **Sauvegarde**, pour exporter ou restaurer ;
- **Nouveau preset** ;
- tout au coin, sous un petit globe, le **choix de la langue** : `FR` ou `EN`.

Le **pied de page** reste collé au bas de l'écran pendant tout le défilement : il porte la licence,
la gratuité, et le lien de soutien.

Juste en dessous, la barre de tri :

- les **onglets** Tout, Basse, Ampli, Pédale, Pédalier, Reaper, avec le nombre de fiches de chacun ;
- la **recherche**, qui regarde le nom, les notes, les styles, le morceau, l'artiste, le nom du
  matériel, les pédales d'un pédalier et les plugins d'une chaîne. Elle ignore la casse **et les
  accents** : `pedalier` trouve « Pédalier », ce qui compte quand on tape sur un téléphone. La
  liste se recompose une fraction de seconde après la frappe plutôt qu'à chaque touche, ce qui garde
  le champ fluide même avec une grande bibliothèque ;
- le **regroupement**, par matériel ou par morceau ;
- les **filtres**, par modèle de matériel et par style — voir plus bas ;
- **Imprimer**, qui met sur papier ce qui est affiché.

## Sur un téléphone, et hors ligne

L'application s'adapte à un écran de poche : les rangées passent à la ligne, les cibles tactiles
s'agrandissent, les champs passent à 16 px pour qu'iOS ne zoome pas dessus, et le pied de page se
réduit à la licence et au lien de soutien pour ne pas manger l'écran.

Elle s'**installe** : sur Android, le bouton **Installer** apparaît dans l'en-tête dès que le
navigateur le propose, et sur iPhone c'est *Partager → Sur l'écran d'accueil*. Elle s'ouvre alors dans
sa propre fenêtre, sans barre d'adresse, avec son icône.

Une fois installée, elle **s'ouvre sans réseau** — vérifié serveur éteint : le catalogue s'affiche
entièrement. Mais soyez au clair sur ce que cela veut dire : hors ligne, vous voyez la dernière
version chargée et vos **modifications ne partent pas au serveur**. Le stockage passe alors en orange
ou en rouge dans la pastille, et la sauvegarde vous revient.

Le contraire est vrai aussi, et c'est délibéré : **en ligne, l'application ne sert jamais une version
en cache.** Le service worker va au réseau d'abord et ne se replie sur sa copie que si le réseau ne
répond pas. Une mise à jour se voit donc au premier rechargement, sans vider quoi que ce soit — c'est
l'inverse du réflexe habituel, et c'est pour éviter de tourner sur une version périmée sans le savoir.

## Comparer deux fiches

**Comparer**, sur une carte, met deux fiches côte à côte et **marque les lignes qui diffèrent**. La
liste déroulante en haut choisit la seconde, parmi les fiches du même genre. Le nombre d'écarts est
annoncé avant le tableau : *4 écarts*, ou *Réglages identiques*.

Les valeurs affichées sont celles des cartes, lues par les mêmes fonctions — une comparaison qui
dirait autre chose que ce qu'on voit ne servirait à rien.

Ce qui **n'est pas** compté comme un écart :

- une commande **hors circuit des deux côtés** — deux `—` ne sont pas une différence ;
- une commande **absente de l'autre façade**, quand les deux fiches n'ont pas le même matériel. Elle
  reste affichée, avec la mention « absente de l'autre façade », mais comparer un Contour qui
  n'existe pas ailleurs serait un faux écart. Le changement de matériel, lui, est signalé en tête.

Chaque genre se compare à sa manière : un instrument ou un ampli commande par commande, **un pédalier
emplacement par emplacement** — l'ordre du signal fait le pédalier autant que les réglages — et une
chaîne maillon par maillon. Deux genres différents n'ont rien à confronter, et l'écran le dit.

## Partager une fiche avec les autres comptes

En déploiement autonome, le bouton **Partager** de chaque carte propose votre fiche aux autres comptes
du serveur, et le bouton **Partagés** de l'en-tête ouvre l'étagère commune : ce que les autres ont
publié, avec **Reprendre chez moi** en face de chacune.

Trois choses à comprendre, et elles tiennent en une phrase chacune :

- **ce qui est publié est une copie figée**, pas un lien. Retoucher votre fiche ne change rien pour
  ceux qui l'ont déjà reprise, ni pour ce que l'étagère affiche — republiez pour mettre à jour ;
- **la copie emporte vos façades personnelles.** Une pédale que vous avez dessinée voyage avec le
  réglage qui l'utilise, sinon la fiche serait illisible chez l'autre ;
- **reprendre, c'est copier.** La fiche devient la vôtre, vous la modifiez sans toucher à l'original,
  et la reprendre deux fois donne deux fiches plutôt que d'écraser la première.

Vous retirez vos propres fiches de l'étagère quand vous voulez ; l'administrateur peut retirer
n'importe laquelle, ce qui permet de modérer. Un compte supprimé emporte ses publications avec lui —
une fiche signée d'un nom qui n'existe plus n'aurait rien à faire là.

Dès que l'étagère dépasse une demi-douzaine de fiches, un champ de recherche apparaît au-dessus :
il regarde le nom, l'auteur et la famille, en ignorant la casse et les accents comme celui du
catalogue. En dessous, il n'aurait rien à filtrer et prendrait la place pour rien.

Le compte de démonstration ne publie pas : ses identifiants étant publics, ce serait ouvrir l'étagère
à tout Internet.

## Filtrer

Le bouton **Filtres** ouvre trois listes de pastilles : **Marque**, **Matériel** et **Styles**.
Cliquer une pastille l'active, recliquer la retire, et le bouton affiche le nombre de filtres en
cours.

La marque vient en premier parce qu'elle dégrossit : elle rassemble tous les modèles du même
fabricant, quand le matériel vise un modèle précis. Elle ne s'affiche pas quand la vue ne contient
qu'une seule marque — proposer un choix unique n'apprend rien à personne.

La règle est celle qu'on attend : **plusieurs choix dans une même liste s'additionnent** (Laney *ou*
Rumble), **les deux listes se croisent** (un Laney *et* du blues). Les nombres portés par chaque
pastille tiennent compte des autres filtres déjà posés, sans se compter eux-mêmes — c'est ce qui
évite de cliquer sur un choix qui ne ramène rien.

Filtrer sur une **pédale** ramène aussi les **pédaliers** qui l'emploient : c'est le bon moyen de
retrouver où sert un effet donné.

Le tri du haut de page suit la même idée : **Par matériel**, **Par marque** ou **Par morceau**. Un
pédalier mêle les marques de ses pédales et une chaîne Reaper n'en a aucune — ce sont des plugins :
les uns et les autres sont rangés sous leur famille plutôt qu'éclatés.

Six paramètres d'URL sont lus au chargement, ce qui permet de mettre une vue en favori ou de
l'envoyer à quelqu'un : `?q=motown`, `?kind=bass`, `?group=song|brand|kind`,
`?gear=lionheart20,rumble40`, `?brand=Ampeg,Vox` et `?tag=blues,rock` — les trois derniers en
listes séparées par des virgules. Un septième, `?edit=<identifiant>`, ouvre directement une fiche.

## Imprimer

Le bouton **Imprimer** envoie au papier **exactement ce qui est à l'écran** : les mêmes fiches, dans
le même ordre, filtres compris. Tout ce sur quoi on ne peut pas cliquer sur une feuille disparaît —
en-tête, barre de tri, panneau de filtres, boutons des cartes, pied de page.

En haut de la première page, une ligne dit ce que la feuille contient : le titre, les filtres actifs,
le nombre de fiches et la date. Une feuille retrouvée dans un étui de basse reste ainsi
compréhensible.

Deux détails qui comptent :

- **le thème sombre est forcé en clair** à l'impression. Imprimer un fond noir gâche l'encre et rend
  les cadrans illisibles ;
- **les aplats des cadrans sont conservés.** Les navigateurs suppriment les fonds à l'impression par
  défaut, ce qui effacerait les repères — et un cadran sans repère ne dit plus rien. La règle
  l'interdit explicitement, donc pensez à laisser « graphiques d'arrière-plan » coché si votre
  navigateur pose la question.

Une fiche n'est **jamais coupée entre deux pages**. Sur une A4, la mise en page tombe sur deux
colonnes.

## Langue / Language

Le bouton `FR` / `EN`, tout au coin haut-droit de la page sous un petit globe, bascule toute
l'application, catalogue compris : les noms de fiches, les notes, les libellés de commandes et les
familles de pédales sont traduits, mais **les noms propres ne le sont jamais** — « Yamaha BB734A »,
« ReaComp » ou « TSE BOD » restent tels quels, comme les noms de morceaux et d'artistes.

Deux détails suivent la langue : le séparateur décimal (`6,5` en français, `6.5` en anglais) et
l'écriture des heures d'égaliseur (`12 h 30` contre `12:30`). La recherche, elle, accepte les deux
langues quelle que soit celle affichée : `rehearsal` et `répétition` ramènent les mêmes fiches.

Le choix se retient avec vos données, donc il vous suit d'un poste à l'autre sur un même compte. Au
premier passage, la langue du navigateur décide ; `?lang=en` ou `?lang=fr` dans l'URL l'emporte, ce
qui permet de partager un lien déjà dans la bonne langue.

The `FR` / `EN` button in the page's top-right corner switches the whole application, catalogue
included. Proper names — gear models, plugin names, song titles — are never translated. Your choice
is remembered with your data, and `?lang=en` forces it from a link.

## Lire une fiche

Une carte montre le matériel concerné, les états qui ne sont pas des cadrans (mode, balance,
interrupteurs) sous forme d'étiquettes, puis les cadrans dans **l'ordre de la façade**.

Deux façons de lire un cadran, selon le matériel :

- **en heures d'horloge**, pour un bouton cranté au milieu comme sur la Yamaha BB734A : midi est le
  cran neutre, où le bouton ne fait rien. Une heure vaut un cran de correction, et l'affichage
  descend au quart de cran — `12 h 15` est une position réelle, pas un arrondi ;
- **sur son échelle**, pour un bouton gradué comme le 1 à 10 du Fender Rumble 40. Les décimales
  suivent le pas du bouton.

Deux mentions particulières :

- **`—` et un cadran éteint** : la commande est hors circuit dans l'état courant. Sur la BB734A en
  passif, l'égaliseur sort du circuit ; sur le Rumble, le Drive ne sert que si l'overdrive est
  engagé ;
- **« à régler »** : la valeur se règle à l'oreille et n'a pas de nombre. C'est le cas d'un seuil de
  compresseur, qu'on descend jusqu'à obtenir la réduction voulue.

La balance des micros s'affiche en pourcentage de course, `P 45 / J 55`, parce que c'est ainsi qu'on
lit un balancer — et non par paliers approximatifs.

## Modifier une fiche

**Modifier** ouvre l'éditeur. En haut, le nom, les styles, le morceau et l'artiste. En dessous, le
bloc **Façade** : le matériel choisi, une note sur ses particularités, puis ses commandes. Les
curseurs affichent leur valeur dans l'unité du matériel pendant qu'on les déplace, et une commande
hors circuit est grisée plutôt que masquée — pour qu'on sache qu'elle existe.

Dès la deuxième lettre tapée dans le **nom**, les fiches proches s'affichent juste en dessous. Une
bibliothèque finit toujours par contenir deux « Motown doux » écrits à six mois d'intervalle, et le
moment de s'en apercevoir est celui où l'on tape le nom. Un nom déjà pris est signalé plus fermement
que de simples voisins.

Cliquer une proposition ouvre la fiche existante : c'est en général ce qu'on voulait faire. La saisie
en cours n'est pas perdue pour autant, le bandeau la rend en un clic.

La correspondance se fait en **début de mot** : « motown » retrouve « Compression Motown », mais
« zz » ne ramène pas tous les Jazz et les Fuzz de la bibliothèque. Le champ **Morceau** fonctionne
pareil et propose les titres déjà saisis, artiste compris — un titre s'écrit d'une seule façon.

**Dupliquer** crée une copie modifiable, ce qui est la bonne façon de partir d'une fiche du
catalogue. **Supprimer** demande confirmation par un second clic.

Changer de matériel en cours de route conserve les valeurs dont les commandes existent des deux
côtés et complète le reste avec les défauts du nouveau modèle, sans rien effacer.

## Le matériel

Le bouton **Matériel** ouvre la liste des façades, avec pour chacune son nombre de commandes et le
nombre de fiches qui l'utilisent.

Les façades **livrées** ne sont pas modifiables. On les **duplique** pour partir d'une base. Elles
couvrent une vingtaine de modèles nommés — amplis basse (Ampeg SVT-CL, Markbass Little Mark, TC
Electronic BH250, Fender Rumble 40 et 500), amplis guitare (Fender Blues Junior, Vox AC30C2,
Marshall DSL40, Boss Katana 50, Laney Lionheart L20T-112), instruments (Yamaha BB734A, Fender
Precision et Jazz Bass, Music Man StingRay, Ibanez SR) et quelques pédales nommées — plus des
gabarits génériques pour tout le reste.

Le Lionheart montre au passage ce que le registre sait faire sans code : deux canaux qui partagent
l'égaliseur, un Tone global, un canal saturé qui grise ses propres commandes quand il est coupé, et
une allure à lui — boutons blancs à repère bleu sur panneau inox, le repère passant au rouge quand
le canal saturé est engagé.

Créer une façade demande un modèle, éventuellement une marque, l'aspect des boutons, puis les
commandes dans l'ordre. Chaque commande a un libellé et un type :

| Type | Pour quoi |
| --- | --- |
| Cadran cranté | un bouton neutre au milieu, lu en heures |
| Échelle bornée | un bouton gradué, 1 à 10 par exemple |
| Balance | un balancer entre deux micros |
| Sélecteur | des positions nommées : *Manche / Les deux / Chevalet*, un canal, une fréquence |
| Interrupteur | un bouton poussoir ou un sélecteur à deux états |
| Curseur vertical | une bande d'égaliseur graphique, en décibels |

Le **sélecteur** se saisit en écrivant ses positions séparées par des virgules. La fiche enregistre
le **nom** de la position, pas son rang : c'est lisible dans un export, et ça survit à un
réordonnancement. Sur une carte, il se lit en étiquette — *Micros Chevalet* — parce qu'on choisit une
position, on ne la dose pas.

Deux mécanismes rendent une façade fidèle sans code :

- **deux modes**, dont le second peut mettre certaines commandes **hors circuit** — c'est ainsi que
  fonctionne le passif de la BB734A ;
- une commande qui **ne sert que si** un interrupteur est engagé — le Drive d'un canal saturé.

**Depuis l'éditeur d'une fiche**, deux boutons sous le choix du matériel évitent le détour : *Nouvelle
façade*, et *Dupliquer cette façade* — le chemin le plus court, puisqu'on part de la plus proche et
qu'on corrige ce qui diffère. Une fois enregistrée, on revient à la fiche qu'on écrivait, avec la
façade neuve déjà choisie.

Deux gabarits couvrent les instruments à deux micros : *Basse deux micros, sélecteur 3 positions*
pour les modèles à sélecteur, et *Basse deux micros, balance* pour ceux qui dosent en continu.

Une façade utilisée par des fiches ne peut pas être supprimée : l'interface dit combien la
retiennent.

## Les pédales et les pédaliers

Une **fiche de pédale** porte les réglages d'un effet. La pédale est dessinée avec ses boutons à la
position réglée, puis les valeurs sont reprises en chiffres juste en dessous — le dessin pour
reconnaître d'un coup d'œil, les chiffres pour reproduire.

Un **pédalier** est une suite de pédales dans l'ordre du signal, chacune avec ses propres réglages et
une case **en circuit**. Une pédale coupée reste visible, grisée, avec son témoin éteint : c'est une
information utile, pas un vide.

Les familles livrées couvrent l'essentiel : boost, overdrive, distorsion, fuzz, préampli et DI,
compresseur, noise gate, égaliseur graphique, octaver, filtre à enveloppe, chorus, phaser, flanger,
trémolo, delay, réverbe, synthé de basse, accordeur. Chacune porte le **jeu de commandes
conventionnel de sa famille** — un overdrive a Gain, Tone et Level ; un flanger a Manual, Depth, Rate
et Res — et non les réglages d'un modèle commercial précis.

### Composer un pédalier

**Modifier** sur un pédalier donne la liste des emplacements. Pour chacun : la pédale choisie, son
rôle dans la chaîne, la case en circuit, les flèches pour la déplacer, et **ses réglages sur place**.
Changer la pédale d'un emplacement remet les réglages à ceux de la nouvelle famille, puisque ses
boutons ne sont pas les mêmes.

L'ordre compte autant que les réglages, et c'est bien la raison d'être d'un pédalier : le
compresseur avant le filtre à enveloppe, sinon la sensibilité du filtre suit les écarts de niveau du
jeu au lieu de suivre l'attaque.

### Dessiner ses propres pédales

Le dessin n'est pas une image : il est **déduit de la description de la façade**. Créer une pédale
depuis **Matériel** donne donc son boîtier sans travail supplémentaire, et le formulaire montre un
**aperçu en direct** qui suit chaque changement.

Trois réglages décident de l'allure :

| Réglage | Effet |
| --- | --- |
| **Couleur du boîtier** | choisie librement ; la couleur du texte s'y adapte pour rester lisible |
| **Silhouette** | boîtier standard, compacte à bascule, haute et étroite, grand boîtier, mini |
| **Boutons par rangée** | 1, 2, 3, 4, ou au choix de la silhouette |

Les silhouettes sont des **formats**, pas des marques : chacune correspond à un gabarit courant du
marché. La compacte à bascule porte une grande commande au pied qui occupe le bas du boîtier ; la
mini ne sérigraphie pas son nom, faute de place ; le grand boîtier laisse de la marge autour des
boutons.

Le nombre de boutons vient des commandes déclarées, leur disposition du nombre par rangée. **Une
rangée incomplète est centrée** : trois boutons se placent donc deux en haut et un au milieu en
dessous, comme sur la plupart des pédales à trois réglages.

## Les chaînes de plugins

Une fiche de chaîne liste les plugins dans l'ordre du signal. Chaque maillon porte son rôle, une case
**en circuit** — un plugin laissé hors circuit reste documenté sans compter dans la chaîne — et ses
paramètres tels que les nomme sa propre fenêtre.

Les plugins connus affichent leurs vrais paramètres, avec leurs unités et leurs bornes. ReaEQ montre
ses bandes en tableau : type, fréquence, gain, largeur. Un plugin non catalogué se décrit en texte
libre.

### Importer et exporter une chaîne de Reaper

Le bouton **Exporter en .RfxChain** est directement sur la carte d'une chaîne, à côté de
**Dupliquer** : pas besoin d'ouvrir l'éditeur. L'éditeur, lui, propose en plus **Importer un
.RfxChain**, au bas de la section « Chaîne Reaper ». Le fichier exporté se dépose dans le dossier
`FXChains` de Reaper, et se retrouve ensuite dans le navigateur d'effets, onglet *FX Chains*.

Ces deux boutons n'apparaissent qu'en **déploiement autonome** : le codec est un fichier servi à
part, absent de la page publiée. Si vous ne les voyez pas, c'est que vous regardez le miroir publié
et non votre serveur.

Il y a trois exports, à ne pas confondre : **Exporter** sur une carte donne *cette fiche* en JSON,
**.RfxChain** sur une carte de chaîne donne un fichier *pour Reaper*, et **Sauvegarde** en haut donne
*toute la bibliothèque* en JSON.

L'export ne demande **pas** d'import préalable : une chaîne composée à la main ici s'écrit aussi,
pour les cinq plugins dont le format est établi — TSE BOD, ReaEQ, ReaComp, ReaVerbate et le JSFX de
saturation. Un plugin hors de cette liste fait refuser l'export **en le nommant**, plutôt que
d'écrire un état inventé.


Tout n'est pas lisible de la même façon dans un fichier de chaîne :

| Plugin | Ce qu'on peut en faire ici |
| --- | --- |
| TSE BOD | tout est modifiable : son état est du XML nommé |
| ReaEQ | bandes entièrement modifiables |
| ReaComp, ReaVerbate | modifiables : leurs paramètres ont été établis |
| JSFX | le premier curseur est repris, les autres conservés |
| Autres plugins | **conservés à l'octet près**, mais non modifiables ici |

Deux garde-fous. Un effet dont les valeurs n'ont pas changé est réécrit **à l'identique** : aucun
arrondi d'affichage ne se glisse dans un réglage qu'on n'a pas touché. Et l'export **refuse** plutôt
que d'inventer : sur ReaEQ, trois types de bande seulement ont leur équivalent établi dans le
fichier, donc choisir les autres se fait dans Reaper — importés ici, ils sont conservés et réécrits
sans dommage.

## Le catalogue et vos données

Presetbook est livré avec un catalogue de réglages de départ. Il fait partie de l'application, donc
il s'enrichit avec elle. **Vos créations et vos modifications vivent à part.** Trois conséquences
utiles :

- enrichir le catalogue ne détruit jamais votre travail ;
- une fiche du catalogue que vous avez modifiée peut être remise à sa valeur d'origine ;
- une fiche du catalogue supprimée est masquée, pas détruite : la réinitialisation la fait revenir.

**Sauvegarde** exporte l'ensemble en JSON — le catalogue tel qu'il s'affiche et vos modifications.
Le bloc se copie, se télécharge, et se recolle pour restaurer. Le même écran propose de
réinitialiser vos modifications, ce qui rétablit le catalogue d'origine sans toucher aux fiches que
vous avez créées.

### Exporter une fiche seule

Le bouton **Exporter** de chaque carte écrit un fichier `.presetbook.json` qui ne contient que cette
fiche — pour l'archiver, la transmettre, ou la déplacer d'un serveur à l'autre. Il vaut pour les cinq
genres, contrairement à l'export `.RfxChain` qui n'a de sens que pour une chaîne de plugins.

Le fichier **emporte les façades dont la fiche a besoin**, si ce sont les vôtres : une pédale que
vous avez dessinée voyage avec le pédalier qui l'utilise, sans quoi la fiche serait illisible à
l'arrivée. Les façades livrées, elles, ne sont pas recopiées puisqu'elles existent déjà de l'autre
côté.

Pour la reprendre : **Sauvegarde**, collez le fichier dans le bloc, puis **Restaurer**. Une fiche
seule **s'ajoute** à la bibliothèque au lieu de la remplacer — c'est le contenu du fichier qui décide,
donc il n'y a pas de bouton séparé à ne pas confondre. Si la fiche est déjà là, la nouvelle prend un
identifiant neuf et son nom reçoit *(importée)*, pour que vous puissiez comparer avant de choisir. Et
si une façade manque, l'import est **refusé en la nommant**, plutôt que d'ajouter une fiche qu'on ne
pourrait pas afficher.

## Si vous supprimez quelque chose par erreur

Trois filets, du plus immédiat au plus lointain.

**Le message de confirmation porte « Annuler la suppression ».** Il reste huit secondes : c'est le
moment où l'on se rend compte de son erreur, et c'est là que le bouton doit être.

**La corbeille.** Une fiche que vous avez créée y attend **30 jours**, avec les façades dont elle
dépend — une pédale que vous aviez dessinée revient avec elle. Elle se trouve dans **Sauvegarde**, et
elle voyage avec vos données : une fiche supprimée depuis le téléphone se récupère depuis
l'ordinateur. Une fiche du **catalogue livré** n'y passe pas : la supprimer ne fait que la masquer, ce
que « Réinitialiser mes modifications » annule déjà.

**Les versions précédentes**, en déploiement autonome. Le serveur garde **un état par jour pendant une
semaine**, et **Sauvegarde** les liste avec le nombre de fiches de chacun. C'est ce qui rattrape le
reste : une restauration malheureuse, une modification en masse, une bêtise qu'on ne remarque que le
lendemain.

L'instantané d'un jour fige l'état **au premier enregistrement de ce jour-là** — donc celui de la
veille au soir. C'est exactement ce qu'il faut pour revenir en arrière d'une journée ; à l'intérieur
d'une même journée, ce sont les deux premiers filets qui jouent. Et revenir à une version photographie
d'abord l'état courant : ce geste-là est réversible aussi.

## Où vont les enregistrements

La pastille en haut à droite l'indique en permanence :

| Couleur | Sens |
| --- | --- |
| **Vert** | enregistrement durable — serveur Presetbook, ou page publiée |
| **Orange** | ce navigateur seulement, ou session à rouvrir |
| **Rouge** | aucun stockage : exportez avant de fermer |

En déploiement autonome, chaque compte a ses propres fiches. À la première ouverture, aucun compte
n'existe : le premier créé est le vôtre, il devient l'**administrateur** de l'instance, et les presets
déjà enregistrés lui sont rattachés. La création de comptes se ferme ensuite d'elle-même — seul
l'administrateur peut en ouvrir un autre, ou envoyer un lien d'invitation.

Il n'y a **pas de récupération de mot de passe par courriel** : un serveur auto-hébergé sans service
de messagerie ne peut pas en offrir. Gardez le mot de passe dans un gestionnaire.

### Le compte de démonstration

Si le serveur en propose un, l'écran de connexion affiche **Essayer la démonstration**. Un clic
suffit : c'est un compte ouvert à tous, fait pour regarder l'application sans s'inscrire.

Deux choses à savoir avant d'y ranger quoi que ce soit. Ses fiches **repartent de zéro** au
redémarrage du serveur, et aussi à l'arrivée d'un visiteur si personne n'y a touché depuis une
demi-heure — ce n'est pas un rangement, c'est un bac à sable. Le délai d'inactivité compte : sans
lui, l'arrivée d'un curieux effacerait l'écran de quelqu'un en train d'explorer. Et le compte **ne
peut pas ouvrir de compte** : ses identifiants étant publics, ce droit reviendrait à ouvrir le
serveur à tout le monde. Le bouton **Comptes** n'apparaît donc pas dans cette session, et la pastille en haut à
droite rappelle en permanence qu'on est en démonstration.

Pour garder son travail, il faut un vrai compte. En attendant, **Exporter** sur une carte et
**Sauvegarde** fonctionnent normalement : rien n'empêche d'emporter ce qu'on a fait dans la démo.

### Qui a le droit de quoi

Deux rôles, et un seul critère : **l'administrateur est le premier compte créé sur l'instance.**

| | Utilisateur | Administrateur |
| --- | --- | --- |
| Ses fiches, son matériel, ses sauvegardes | oui | oui |
| Changer **son** mot de passe | oui | oui |
| Supprimer **son** compte | oui | non — voir plus bas |
| Ouvrir un compte à quelqu'un | non | oui |
| Voir la liste des comptes | non | oui |
| Supprimer le compte d'un autre | non | oui |

Personne ne peut changer le mot de passe d'un autre, **pas même l'administrateur** : il peut
supprimer un compte, pas s'y introduire. Un mot de passe oublié se redonne depuis la machine, ce qui
laisse une trace dans le journal du serveur.

L'administrateur **ne peut pas supprimer son propre compte** depuis l'application : l'instance se
retrouverait sans personne pour ouvrir un compte, et la seule issue serait d'éditer `users.json` à la
main.

Sur une instance qui existait avant cette version, le rôle est attribué au **compte le plus ancien**
au premier démarrage, et le journal l'annonce.

### Changer son mot de passe

Le bouton **Comptes** ouvre deux formulaires. Le premier change **votre** mot de passe : l'actuel, le
nouveau, sa répétition. Vos **autres sessions sont fermées** au passage — celle qui fait le
changement reste ouverte. C'est le geste à faire dès qu'on vous a transmis un mot de passe par
message.

Personne ne peut changer le mot de passe de quelqu'un d'autre depuis l'application, **pas même
l'administrateur**, et ce n'est pas un oubli : il peut supprimer un compte, il ne peut pas s'y
introduire. Sinon son rôle donnerait accès aux fiches de tout le monde.

Le compte de démonstration fait exception dans l'autre sens : il **garde** son mot de passe, qui est
public et affiché. Le changer fermerait la porte à tout le monde jusqu'au redémarrage.

Un mot de passe **oublié** se répare depuis la machine qui héberge, pas depuis l'application — voir
[Installer et exploiter](installation.md).

### Quand on vous demande un compte

Sur une instance publique, un visiteur qui essaie la démonstration et veut la suite n'a aucun moyen
de vous joindre. Le réglage `ALLOW_REQUESTS=1` ajoute un bouton **Demander un compte** sur l'écran de
connexion : la personne laisse un identifiant souhaité, une adresse et, si elle veut, un mot sur
elle.

À votre connexion suivante, un bandeau vous prévient et une pastille compte les demandes sur le
bouton **Comptes**. En face de chacune, *Préparer l'invitation* fabrique le lien et vous rappelle
l'adresse à qui l'envoyer ; *Écarter* la retire.

**Ouvrir dans la messagerie** rédige le message pour vous et le passe au logiciel déjà configuré sur
votre poste — Thunderbird, Outlook, celui du téléphone : destinataire, objet et texte complet, il ne
reste qu'à envoyer. Si aucun client n'est configuré, rien ne se passe ; *Copier le lien* reste là.

**L'application n'envoie rien elle-même.** Elle n'a aucune dépendance, donc pas de client de
courrier : elle rédige, le vôtre expédie. C'est aussi ce qui évite qu'un serveur d'envoi soit
détourné par quelqu'un qui aurait trouvé le formulaire.

L'adresse ne sert qu'à ça et disparaît avec la demande dès que vous l'écartez. Trois demandes par
adresse IP et par jour, cinquante en attente au plus : c'est un point d'écriture sans
authentification, il ne doit pas pouvoir enfler. Fermé par défaut — une instance privée n'a aucune
raison de l'exposer.

### Inviter quelqu'un

**Réservé à l'administrateur**, et c'est la bonne façon de faire entrer quelqu'un. Le bouton
**Comptes** propose *Créer un lien d'invitation* : vous obtenez un lien à transmettre, la personne
clique, **choisit elle-même son identifiant et son mot de passe**.

Rien de secret ne circule : vous ne connaissez pas son mot de passe, et il n'y a rien à changer après
coup. Le lien **ne sert qu'une fois** et **expire au bout d'une semaine**. Les invitations en attente
se révoquent d'un clic tant qu'elles n'ont pas servi.

Le lien n'est affiché **qu'une seule fois**, au moment où vous le créez — le serveur n'en garde que
l'empreinte, comme pour les mots de passe. Si vous le perdez avant de l'envoyer, révoquez-le et
créez-en un autre.

À l'arrivée, le jeton est retiré de la barre d'adresse dès l'ouverture de la page : il ne traîne ni
dans l'historique, ni dans une capture d'écran, ni dans un lien repartagé par inadvertance.

### Ouvrir un compte à quelqu'un, sans lien

**Réservé à l'administrateur.** Le bouton **Comptes** de l'en-tête ouvre un compte à quelqu'un d'autre :
identifiant, mot de passe, et sa répétition. **Votre session ne change pas** — c'est le serveur qui
le garantit, pas seulement l'écran : un compte créé par un utilisateur connecté ne reçoit pas de
cookie de session.

La personne se connecte ensuite elle-même, et ses fiches sont entièrement séparées des vôtres. Cela
évite d'ouvrir `ALLOW_REGISTER` sur un serveur exposé à Internet : vous créez les comptes de votre
groupe un par un, sans laisser la création ouverte à tout venant.

Cette voie ne sert que si vous ne pouvez pas transmettre de lien : le mot de passe se transmet alors
**de la main à la main**, et il faut penser à dire à la personne de le **changer à sa première
connexion**. Le lien d'invitation évite tout cela — c'est pourquoi il est préférable.

## Licence et dons

Presetbook est un **logiciel libre**, sous [AGPL-3.0-or-later](../LICENSE), et **gratuit**. Rien
n'est bridé, rien n'expire, aucune fonction n'attend un paiement — c'est le pied de page qui le dit,
et il dit vrai.

Si l'outil vous sert, un don est **bienvenu, jamais demandé** : <https://ko-fi.com/talva>, ou le
bouton flottant en bas de la page. Il est là pour être ignoré sans conséquence.

Libre veut dire que vous pouvez utiliser, étudier, modifier et redistribuer l'application. La seule
contrainte porte sur l'hébergement : **si vous en servez une version modifiée à d'autres personnes,
vous devez leur proposer votre code source.** Chez vous, pour vous, rien ne vous est demandé.
