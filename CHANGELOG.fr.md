# Journal des changements

Ce que chaque version apporte, et pourquoi. [English](CHANGELOG.md).

Les versions suivent [le versionnage sémantique](https://semver.org/lang/fr/) : le premier nombre
change quand une mise à jour demande une intervention, le deuxième quand des choses s'ajoutent, le
troisième quand seuls des défauts sont corrigés. Aucune mise à jour n'a jamais demandé de toucher aux
données : elles vivent dans un volume que l'image ne connaît pas.

Pour rester sur une version précise plutôt que de suivre la pointe :

```yaml
image: ghcr.io/fuzzinvaders/presetbook:v1.13.0   # au lieu de :latest
```

Et pour savoir laquelle tourne chez toi, sans fouiller le conteneur :

```bash
curl -s https://ton-domaine/healthz
docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' presetbook
```

---

## 1.13.0 — 19 novembre 2026

### Ajouté

- **Le chorus livré avec Reaper (JSFX guitar/chorus) est établi.** Ses six curseurs se lisent et se
  règlent sous leurs noms — Chorus Length, Number Of Voices, Rate, Pitch Fudge Factor, Wet Mix, Dry
  Mix — avec les plages et les défauts de sa source. Un chorus ajouté à la main s'écrit comme le
  plugin s'ouvre.

### Corrigé

- **Le seuil de MCompressor s'affichait à la moitié de sa valeur.** Le plugin range son seuil sur
  une échelle à 40·log10, pas 20·log10 : une chaîne réglée à −20,6 dB s'affichait −10,3 dB. Le
  fichier écrit était juste — c'est le chiffre qui mentait. La fiche « Crossfire » affiche
  maintenant −19,9 dB, ce que montre Reaper.
- **Les fiches d'avant sont converties à l'ouverture**, à l'octet près dans le fichier : le seuil
  enregistré est doublé, et le son exporté ne bouge pas. Un fichier `.presetbook.json` exporté avant
  la correction, ou une fiche de l'étagère, est converti de la même façon à l'import.
- **Un JSFX inconnu n'a plus de « Drive ».** Son premier curseur était affiché sous le nom de celui
  de la Saturation ; il garde maintenant ses curseurs tels quels, sans nom inventé.
- **Après une mise à jour, la page pouvait tourner une heure avec l'ancien lecteur de chaînes.** Le
  serveur laissait le navigateur garder `rfxchain.js` une heure, alors que la page, elle, était
  toujours relue. Les scripts se revalident maintenant à chaque ouverture, comme la page — une
  simple question au serveur, rien n'est retéléchargé s'ils n'ont pas changé.

---

## 1.12.0 — 19 novembre 2026

### Ajouté

- **Une fiche exportée se réimporte depuis son fichier.** « Exporter » écrivait un `.presetbook.json`,
  mais pour le reprendre il fallait l'ouvrir dans un éditeur de texte, copier son contenu et le coller
  dans le bloc de la sauvegarde. Le fichier entre maintenant comme une chaîne Reaper : **déposé sur
  la page**, ou choisi par **Sauvegarde → Importer un fichier**. Plusieurs fichiers lâchés ensemble
  font autant de fiches.
- Le contenu décide de ce qui arrive, comme dans le bloc : une **fiche seule s'ajoute** — un doublon
  prend un nouvel identifiant et *(importée)* dans son nom, rien n'est écrasé. Une **sauvegarde
  complète**, elle, remplacerait toute la bibliothèque : un fichier lâché sur la page ne peut pas
  valoir cet ordre-là, alors elle **s'installe dans le bloc** et attend « Restaurer ».

---

## 1.11.2 — 13 novembre 2026

### Corrigé

- **Les cadrans de la Fender Deluxe Active Jazz Bass se lisaient comme ceux d'une BB**, en heures
  depuis midi, aiguille du cran en haut. Sur cette plaque le cran ne tombe pas à midi mais **en bas
  à gauche**, et la course se lit **en pourcentage** : 50 % au cran, 0 % à la butée qui coupe,
  100 % à celle qui pousse. Un repère gris sur le pourtour marque le cran — sans lui, une aiguille
  en bas à gauche n'a plus de point de comparaison. Rien ne change dans les données : la valeur
  stockée reste le nombre de crans depuis le neutre, soit exactement (pourcentage − 50) / 10.
- Les valeurs livrées de « Crossfire » étaient arrondies au quart de cran, ce qui affichait 52,5 %
  là où la fiche dit 52 %. Une commande lue en pourcentage n'a pas de palier intermédiaire à viser.
- L'éditeur avance au pourcent sur cette plaque, et non par quarts de cran — personne ne règle une
  basse par 2,5 %.

---

## 1.11.1 — 13 novembre 2026

### Corrigé

- **Le voile du dépôt de chaîne restait affiché en permanence**, par-dessus toute la page : bordure
  en pointillés sur tout l'écran et contenu délavé derrière. `hidden` est un attribut dont l'effet
  vient de la feuille par défaut du navigateur, et la moindre classe qui donne un `display`
  l'emporte — `.dropzone{display:flex}` l'annulait. Une règle générale neutralise désormais tout
  élément caché, et une vérification relève les éléments du gabarit qui comptaient sur la feuille
  par défaut seule. Le test existant regardait la propriété `hidden` du nœud, qui valait bien
  `true` : seul le style calculé pouvait le dire.
- **Le voile ne restait pas coincé que pour cette raison** : il comptait les entrées et les sorties
  du glisser, or un fichier lâché hors de la fenêtre n'émet aucune sortie. Il s'efface maintenant
  faute de signal — le survol émet `dragover` tant qu'il dure.

---

## 1.11.0 — 13 novembre 2026

### Ajouté

- **Les setlists.** Un morceau demande plusieurs fiches — la basse, la chaîne Reaper, le pédalier —
  et c'est le morceau qu'on annonce sur scène. Une setlist est donc une liste **ordonnée de
  morceaux**, pas de fiches. L'ouvrir ne montre que ses morceaux, dans son ordre ; l'imprimer donne
  le carnet du concert, dans l'ordre joué. Les compteurs des onglets suivent : annoncer « 68 »
  au-dessus d'une liste de quatre serait faux.
- **Déposer un `.RfxChain` sur la page en fait une fiche.** Importer demandait d'ouvrir une fiche
  Reaper, d'entrer dans son éditeur, puis d'y trouver le bouton. La fiche prend le nom du fichier,
  l'onglet bascule sur Reaper, et elle est datée.
- **Un ordre dans les sections** : « Par nom » ou « Modifiée en dernier », dans la barre de liste.
  Le rangement vaut aussi dans « Autres » — sinon ce serait le seul endroit où il ne s'appliquerait
  pas.
- **Une date de dernière modification par fiche**, écrite à l'enregistrement et à la copie, jamais à
  la lecture. Elle se lit en bas de la carte et elle s'imprime. Sans date, une fiche passe en
  dernier au rangement : « jamais enregistrée depuis que la date existe » n'est pas « ancienne ».
- **Garder l'écran allumé**, dans le menu. En répétition, le téléphone s'éteint pendant qu'on lit
  ses réglages. Là où l'API n'existe pas, le bouton n'apparaît pas : mieux vaut ne rien promettre
  que promettre ce qu'on ne peut pas tenir.
- Les fiches se replient comme les sections et les maillons. Repliée, une fiche tient en une ligne
  qui dit son nom, sa famille et ce qu'elle cache. Mesuré sur « Crossfire » : 557 px dépliée,
  65 px repliée.
- `?group=` accepte `artist` et `tag` ; `?sort=` accepte `nom` et `maj`.

### Corrigé

- **L'égaliseur de la Fender Deluxe Active Jazz Bass était dans le mauvais sens.** Les schémas
  d'usine Fender 013-6700 et 013-6760 donnent l'ordre réel de la plaque : volume, pan, puis un
  bouton double — **Treble à l'étage haut, Bass à l'étage bas** — et le Middle en dernier sur son
  petit bouton. On tournait donc le mauvais bouton en relisant sa propre fiche. Seul l'affichage
  change : les clés ne bougent pas, aucune fiche déjà écrite n'est touchée. La note porte en plus ce
  que les schémas disent et qu'on ne devine pas : **la balance tourne dans l'horaire vers le micro
  manche**.
- L'audit des traductions ne savait pas lire une parenthèse : il coupait l'appel au premier « ) »,
  si bien que les messages contenant « ({0}) » lui échappaient. 59 messages audités avant,
  75 maintenant.

---

## 1.10.1 — 13 novembre 2026

### Corrigé

- **On ne voyait pas qu'une section ou un maillon s'ouvrait.** Le chevron faisait neuf pixels, dans
  la couleur des mentions secondaires et sans contour — et au téléphone, rien ne survole : il ne
  restait aucun indice. À la place, une case carrée portant **+** ou **−**, le signe que tout le
  monde lit sans mode d'emploi. Le signe vient de la feuille de style et suit `aria-expanded`,
  si bien que le clic n'a toujours qu'un attribut à retourner.
- **Un maillon replié dit ce qu'il garde derrière lui** — « 6 bandes », « 15 réglages », alignés à
  droite. Une case qui s'ouvre sur l'inconnu n'invite pas à l'ouvrir. La mention disparaît dès que
  le maillon est ouvert, et à l'impression, où tout est déjà rouvert.
- Survoler un titre de section ou de maillon le signale maintenant.

---

## 1.10.0 — 13 novembre 2026

### Ajouté

- **Les maillons d'une chaîne se replient.** Un clic sur le titre du maillon, et « Tout replier »
  pour la chaîne entière. Mesuré sur la chaîne d'« All Star » : **1 230 px dépliée, 214 px
  repliée**, et l'onglet Reaper passe de 2 892 à 1 110 px. Le titre garde le numéro, le plugin, son
  rôle et la mention « hors circuit » : ce qu'il faut pour retrouver le bon maillon avant de
  l'ouvrir. Comme pour les sections, l'impression rouvre tout.
- **Deux rangements de plus : par artiste et par style.** Les deux existaient comme filtres sans
  jamais pouvoir ranger la page. Ce qui n'a ni l'un ni l'autre se range en fin de liste sous
  « Sans artiste » ou « Sans style », jamais sous « Autres » : contrairement à un nom de matériel,
  un nom d'artiste n'est écrit nulle part ailleurs sur la carte.
- `?group=` accepte `artist` et `tag` en plus de `kind`, `brand` et `song`.

### Changé

- **La barre de liste compte les fiches et leurs apparitions.** Par style, une fiche portant deux
  styles paraît sous les deux — c'est ce qu'on attend d'un style. Annoncer « 2 fiches » au-dessus de
  six cartes aurait ressemblé à une erreur : elle écrit « 2 fiches · 6 apparitions » dès que les
  deux nombres diffèrent.

### Corrigé

- Replier une section recomptait les cartes du document pour reconstruire la barre de liste. C'était
  juste tant qu'une fiche ne paraissait qu'une fois ; le dernier rendu garde maintenant ses propres
  chiffres.

---

## 1.9.0 — 13 novembre 2026

Mesuré avant et après, sur la bibliothèque livrée : **328 px de décor avant la première fiche sur
ordinateur, 237 maintenant ; 569 px sur 812 au téléphone, 401 maintenant**. La page entière passe de
21 242 à 15 158 px, et tombe à un seul écran quand tout est replié.

### Changé

- **L'en-tête tient en deux commandes.** Neuf boutons gris identiques s'y suivaient — Matériel,
  Sauvegarde, Partagés, Installer, Comptes, Déconnexion, FR, EN, Nouveau preset — alors qu'un seul
  crée du contenu. Tout ce qui touche à la session et aux réglages passe derrière un menu portant le
  nom du compte ; « Nouveau preset » reste seul en évidence.
- **Une seule barre d'outils au lieu de deux.** La recherche passe en premier et prend la largeur :
  c'était l'outil le plus rapide et le plus discret. « Par matériel / marque / morceau » n'est pas un
  filtre mais un tri — il devient une liste déroulante « Grouper par ».
- **Les filtres se choisissent dans des listes, plus dans un mur de pastilles.** Le panneau en
  alignait 76. Les listes portent le compte de chaque entrée, et ce qui est retenu reste en
  pastilles — deux ou trois, pas soixante-seize. Le choix multiple est conservé, et il n'y a pas de
  bouton « Appliquer » : le filtrage est immédiat, un bouton le rendrait plus lent.
- **Un titre par fiche isolée n'apprend rien.** « Par matériel » produisait 25 titres dont 20 au-dessus
  d'une seule carte, qui portait déjà le nom du matériel. Les fiches isolées se rassemblent sous un
  seul « Autres », en fin de liste : 25 sections deviennent 7. Pas en « Par morceau », où le titre
  est l'information.

### Ajouté

- **Les sections se replient.** Un clic sur le titre, et « Tout replier » pour la liste entière. Le
  repli se garde d'une visite à l'autre sur ce poste. À l'impression, tout est rouvert : une feuille
  amputée des sections refermées à l'écran serait fausse sans prévenir.
- La barre de liste dit **combien de fiches sont affichées**.

---

## 1.8.0 — 13 novembre 2026

Vérifié sur une vraie chaîne Reaper — ReaEQ, TSE BOD, ReaEQ, MCompressor, MTuner hors circuit —
lue par Presetbook puis réécrite, dans les deux sens.

### Ajouté

- **Crossfire, de Stevie Ray Vaughan & Double Trouble, au catalogue livré** : la chaîne Reaper
  complète, et le réglage de la Fender Deluxe Active Jazz Bass qui va avec, accordée un demi-ton plus
  bas. Une fiche qui n'a jamais vu le fichier d'origine régénère les mêmes réglages, effet par effet.

### Corrigé

- **Importer puis exporter une chaîne redonne le fichier à l'identique.** Chaque effet était
  réécrit à partir de la fiche, même sans retouche ; un effet dont rien n'a bougé repart maintenant
  avec ses octets d'origine.
- **Un MCompressor ou un MTuner composé ici porte tout ce que le plugin écrit lui-même** : il
  manquait deux attributs au compresseur et le mode de détection à l'accordeur.
- **La balance d'une Jazz Bass se lit M / C**, manche et chevalet, au lieu du P / J d'une basse
  P/J — pour la Yamaha, rien ne change.
- `tools/rfxchain-import.js` affiche les réglages relus d'un plugin Melda, au lieu d'annoncer un
  bloc binaire.
- **Le serveur n'ouvre plus son port avant d'être prêt.** L'administrateur et le compte de
  démonstration se fabriquent avec scrypt, qui est lent exprès ; pendant ce temps `/healthz`
  répondait déjà « ok ». Sur une machine chargée, la fenêtre durait assez pour qu'une requête y
  passe et reçoive un refus. Un orchestrateur qui attend la bonne santé attend maintenant la
  bonne chose.

---

## 1.7.0 — 12 novembre 2026

### Corrigé

- **Une chaîne réécrite est de nouveau lisible par Reaper.** L'en-tête de chaque effet annonce la
  taille de son état ; Presetbook la recopiait du gabarit sans la recalculer. Un ReaEQ de quatre
  bandes partait donc avec « 238 octets » annoncés pour 156 réels, et Reaper lisait à côté. La taille
  est maintenant réécrite à chaque fois, et un test la vérifie sur un ReaEQ, un TSE BOD et une chaîne
  Melda. Le défaut touchait toute chaîne composée à la main — pas celles qui ressortaient d'un import
  sans retouche.
- **Un ReaEQ composé ici emporte la fin de son bloc**, trente-deux octets qui suivent les bandes.
  Elle manquait aux chaînes fabriquées de zéro.

### Ajouté

- **Les trois MeldaProduction gratuits : MCompressor, MSaturator et MTuner.** Leur état n'était
  qu'un bloc binaire conservé tel quel ; c'est en fait un arbre nommé, compressé. Seuil, taux,
  attaque, rétablissement, longueur RMS pour le compresseur ; gains d'entrée et de sortie, dosage et
  écrêtage pour la saturation. Une chaîne qui les contient s'exporte maintenant au lieu d'être
  refusée.
- Les réglages dont la clé n'a pas été relevée — mode de saturation, taux d'analogique, genou du
  compresseur — **repartent avec la chaîne** au lieu d'être perdus : ils se règlent dans Reaper.

---

## 1.6.0 — 31 août 2026

### Ajouté

- **La Fender Deluxe Active Jazz Bass au catalogue livré**, d'après la fiche du constructeur : volume
  général, balance, et un égaliseur actif trois bandes cranté au neutre. C'est la contrepartie active
  de la Jazz Bass déjà livrée — deux volumes d'un côté, volume et balance de l'autre, et c'est
  exactement ce qui les distingue.

---

## 1.5.0 — 31 août 2026

### Ajouté

- **La Squier Rascal Bass HH au catalogue livré**, décrite d'après sa façade : deux humbuckers, un
  sélecteur à trois positions, un volume, une tonalité, et rien d'autre — elle est passive. C'est le
  premier modèle qui emploie le type sélecteur pour ce qu'il a été fait.

---

## 1.4.0 — 31 août 2026

Signalé en voulant décrire une Squier Rascal HH : deux volumes ne conviennent pas à une basse qui a
un sélecteur, et créer sa propre façade demandait de sortir de la fiche qu'on écrivait.

### Ajouté

- **Un type de commande « sélecteur »**, à positions nommées : *Manche / Les deux / Chevalet*, un
  canal, une fréquence. La fiche enregistre le **nom** de la position et non son rang — lisible dans
  un export, et insensible à un réordonnancement. Sur une carte il se lit en étiquette, parce qu'on
  choisit une position, on ne la dose pas.
- **Deux gabarits pour les instruments à deux micros** : *sélecteur 3 positions* pour les modèles qui
  choisissent, *balance* pour ceux qui dosent en continu.
- **Créer ou dupliquer une façade depuis l'éditeur d'une fiche.** C'était possible, mais seulement
  depuis l'écran *Matériel* — c'est-à-dire loin du moment où l'on s'aperçoit qu'elle manque.
  *Dupliquer cette façade* est le chemin le plus court : on part de la plus proche et on corrige ce
  qui diffère. Une fois enregistrée, on revient à la fiche qu'on écrivait, avec la façade neuve déjà
  choisie.

### Modifié

- **Deux bricolages remplacés par de vrais sélecteurs.** Faute de ce type, le *Mid Freq* de l'Ampeg
  SVT-CL et le *type d'ampli* du Boss Katana étaient des échelles de 1 à 5, avec la correspondance
  expliquée en note. Ils portent maintenant leurs vrais noms — *450 Hz*, *Crunch*. Une fiche
  enregistrée avec l'ancien chiffre retombe sur la position par défaut plutôt que de casser.

---

## 1.3.0 — 30 août 2026

### Ajouté

- **« Ouvrir dans la messagerie »**, à côté d'une invitation préparée. Le bouton ouvre le logiciel
  déjà configuré sur le poste — Thunderbird, Outlook, celui du téléphone — avec le destinataire,
  l'objet et un message complet : le lien, qu'il ne sert qu'une fois, qu'il expire dans une semaine,
  et que la personne choisira elle-même son mot de passe. Il ne reste qu'à envoyer.

  C'est un simple lien `mailto:`, donc **l'application ne gagne aucune dépendance et n'envoie
  toujours rien elle-même** : elle rédige, le client expédie. Le corps est encodé avec des CRLF comme
  le veut la spécification — avec des sauts de ligne simples, certains clients recollent les
  paragraphes en un bloc.

---

## 1.2.1 — 30 août 2026

### Corrigé

- **Un réglage d'environnement pouvait rester sans effet, sans un mot.** Les interrupteurs
  `ALLOW_REQUESTS`, `ALLOW_REGISTER` et `SECURE_COOKIES` étaient comparés sans rogner la valeur : un
  fichier `.env` enregistré avec des fins de ligne Windows donne « 1\r », et « 1\r » ne vaut pas
  « 1 ». On ajoutait la ligne, on redémarrait, et rien ne bougeait — sans que rien ne le signale.
  Les valeurs sont désormais rognées, `on`, `true`, `oui` et `yes` sont acceptés comme `1`, et
  `0`/`false`/`non`/`off` ferment explicitement.

### Modifié

- **Le démarrage dit ce qu'il a compris.** Le journal du serveur annonce l'état du formulaire de
  demande de compte, à côté de celui de la création de comptes. Et une valeur présente mais non
  reconnue est signalée en clair — mieux vaut une ligne dans le journal qu'une demi-heure à chercher
  une erreur qu'on n'a pas commise.

---

## 1.2.0 — 30 août 2026

La version qui s'occupe du premier contact. Le lien est public depuis qu'il est posté sur un forum,
et le parcours du visiteur était un cul-de-sac : il essayait la démonstration, y prenait goût, et
n'avait nulle part où demander la suite.

### Ajouté

- **Un bouton « Demander un compte » sur l'écran de connexion.** Le visiteur laisse un identifiant
  souhaité, une adresse et, s'il veut, un mot sur lui. À la connexion suivante de l'administrateur,
  un bandeau le prévient et une pastille compte les demandes sur le bouton *Comptes*. En face de
  chacune, *Préparer l'invitation* fabrique le lien et rappelle l'adresse à qui l'envoyer.

  **L'application n'envoie rien** : elle n'a aucune dépendance, donc pas de client de courrier, et
  l'envoi reste un geste humain. C'est aussi ce qui évite qu'un serveur d'envoi soit détourné par
  qui trouverait le formulaire. L'adresse ne sert qu'à ça et part avec la demande dès qu'elle est
  écartée.

  Fermé par défaut : `ALLOW_REQUESTS=1` l'ouvre. Une instance privée n'a aucune raison d'exposer un
  point d'écriture sans authentification — et quand il est ouvert, il est tenu : trois demandes par
  adresse IP et par jour, cinquante en attente au plus, et une même adresse deux fois est acceptée
  sans rien ajouter, parce que répondre « déjà demandé » dirait à un inconnu qui a écrit là.
- **Une phrase qui dit ce qu'est Presetbook**, sur l'écran de connexion. Le sur-titre suffisait à qui
  venait de lire le billet qui menait ici ; pas à qui reçoit le lien de seconde main.

### Modifié

- **La démonstration est décrite plus justement.** Elle annonçait une remise à zéro « à chaque
  redémarrage du serveur », en taisant ce qui compte pour le visiteur : elle repart de zéro **à son
  arrivée** si personne n'y a touché depuis une demi-heure. Il trouve donc un écran propre, et non
  les essais d'un inconnu. L'écran indique aussi que « Sauvegarde » lui rend en fichier ce qu'il y a
  créé, à reprendre dans un vrai compte.

### Corrigé

- **Les sections d'administration n'apparaissaient qu'après un rechargement.** La session lue au
  démarrage est celle d'un anonyme ; se connecter ne la relisait pas, si bien que l'application
  ignorait que ce compte administrait l'instance. L'écran des comptes s'ouvrait donc sans la liste
  des comptes, sans les invitations, sans rien — jusqu'à ce qu'on recharge la page.

---

## 1.1.0 — 29 août 2026

La version qui ouvre l'application à plusieurs personnes. Jusqu'ici chacun gardait ses fiches pour
soi ; on peut maintenant en publier, inviter quelqu'un, et se tromper sans conséquence.

### Ajouté

- **Une étagère partagée entre les comptes du serveur.** Le bouton *Partager* d'une carte propose la
  fiche aux autres comptes, *Partagés* ouvre ce que les autres ont publié. Ce qui est publié est une
  copie figée, pas un lien : retoucher sa fiche ne change rien chez ceux qui l'ont reprise. La copie
  emporte les façades personnelles, sinon la fiche serait illisible en face. Passé une demi-douzaine
  de fiches, un champ de recherche apparaît au-dessus.
- **Des liens d'invitation à usage unique.** L'administrateur fabrique un lien, le donne à qui il
  veut, et celui-ci choisit lui-même son identifiant et son mot de passe. Le jeton est retiré de la
  barre d'adresse dès qu'il est lu : il finirait sinon dans l'historique et dans les captures
  d'écran.
- **Un filet de récupération.** Une fiche supprimée passe par une corbeille et y reste trente jours,
  la suppression s'annule d'un clic dans le bandeau, et un état par jour est conservé pour revenir en
  arrière. Un carnet dont on efface une page par erreur n'est plus un carnet.
- **La comparaison de deux fiches**, écarts marqués, pour savoir ce qui sépare deux réglages voisins.
- **Le filtre et le regroupement par marque.** La marque dégrossit, le modèle précise. Elle
  n'apparaît pas quand la vue n'en contient qu'une seule : proposer un choix unique n'apprend rien.
- **Une vingtaine de modèles nommés au catalogue**, et pas une ligne de code pour eux — amplis basse
  (Ampeg SVT-CL, Markbass Little Mark, TC Electronic BH250, Fender Rumble 500), amplis guitare
  (Fender Blues Junior, Vox AC30C2, Marshall DSL40, Boss Katana 50), instruments (Fender Precision et
  Jazz Bass, Music Man StingRay, Ibanez SR) et sept pédales nommées à côté des types génériques.
- **Des propositions à la saisie d'un nom**, pour ne pas écrire deux fois la même fiche. Dès la
  deuxième lettre, les fiches proches s'affichent ; un nom déjà pris est signalé plus fermement.
  Cliquer une proposition ouvre la fiche existante, et le bandeau rend la saisie abandonnée.
- **La documentation en anglais**, les trois volets, plus un guide d'installation sur Mac pour qui
  n'ouvre jamais un terminal.

### Modifié

- **La recherche ne reconstruit plus toute la liste à chaque touche.** Mesuré : environ 2,4 Ko de
  HTML par carte, soit plus d'un mégaoctet par frappe sur une bibliothèque de cinq cents fiches. Un
  délai de 150 ms suffit ; six frappes rapides ne produisent plus qu'un seul rendu.
- **La démonstration se remet à zéro** quand un nouveau venu la lance après une longue inactivité,
  pour qu'il ne trouve pas l'écran de quelqu'un d'autre.

### Corrigé

- **La création du premier compte échouait** sur une instance neuve, avec « Cette invitation n'est
  plus valable » alors qu'aucune invitation n'était en jeu. La page déclarait deux fois le même nom
  de variable : le jeton d'invitation et l'invite d'installation du navigateur ne faisaient qu'un.
  Sur tout déploiement public, l'événement d'installation se retrouvait envoyé comme invitation.
- **Une invitation se consommait avant la validation du formulaire** : un mot de passe trop court
  brûlait un lien à usage unique, et l'invité restait devant un lien mort sans avoir eu de compte.
- **Un jeton douteux fermait une porte ouverte par ailleurs** : les trois autres conditions
  d'ouverture sont désormais testées d'abord.
- **Un fichier de comptes corrompu emportait la dernière copie valable.** La sauvegarde était écrasée
  par le fichier illisible ; celui-ci est maintenant mis de côté et la copie préservée.
- **Le message d'erreur de connexion restait en français** sur une page anglaise, seul des quatre
  afficheurs de ce genre à ne pas traduire.

---

## 1.0.0 — 28 août 2026

La première version publique : l'application, les comptes, et de quoi la faire tourner chez soi.

### Ajouté

- **Le carnet lui-même.** Une page unique et autonome qui range des fiches d'instrument, d'ampli, de
  pédale, de pédalier entier et de chaînes de plugins Reaper. Chaque fiche s'affiche comme on la
  lirait sur le matériel : en heures d'horloge pour un bouton cranté au milieu, sur son échelle pour
  un bouton gradué, avec les vrais noms de paramètres des plugins.
- **Des registres déclaratifs plutôt que du code par modèle.** Une façade se décrit — ses boutons,
  ses modes, ses commandes hors circuit — et l'interface en découle. On crée son propre matériel,
  jusqu'au dessin d'une pédale, sans toucher au code.
- **Le combo guitare Laney Lionheart L20T-112**, première preuve que le registre n'est pas réservé à
  la basse : deux canaux partageant l'égaliseur, un Tone global, un canal saturé qui grise ses
  propres commandes quand il est coupé. Aucune ligne de code ajoutée pour lui.
- **Un compte de démonstration public**, activé par `DEMO_LOGIN`. Ses identifiants étant publics, il
  est tenu à l'écart sur quatre points — il ne peut notamment pas créer de compte, ce qui aurait
  donné ce droit à tout Internet.
- **Le filtre par matériel et par style, et l'impression.** La feuille reprend exactement ce qui est
  à l'écran, filtres compris, avec une ligne d'en-tête qui dit ce qu'elle contient.
- **Une application utilisable au téléphone et installable**, qui s'ouvre sans réseau.
- **Le changement de mot de passe** par chacun, et un outil de secours depuis la machine pour un
  oubli — personne ne peut changer celui d'un autre par le web.
- **Un administrateur**, qui est le premier compte créé sur l'instance. Un utilisateur ordinaire ne
  peut que changer son mot de passe et supprimer son propre compte.
- **La compression gzip** : la page fait 198 Ko, elle en fait 58 sur le fil.
- **L'import et l'export de chaînes `.RfxChain`** pour Reaper, avec deux règles de fidélité — une
  valeur inchangée est réécrite avec son flottant d'origine, et l'export refuse en nommant le plugin
  fautif plutôt que d'inventer.

### Corrigé

- **La page n'avait pas de balise `viewport`.** Un téléphone la rendait dans une fenêtre virtuelle de
  980 px puis réduisait le tout — lisible à la loupe. Mesuré ensuite à 390 px : 118 px de débordement
  horizontal, causés par la rangée d'onglets qui ne passait pas à la ligne.
- **La recherche ignorait les accents dans un seul sens.** « pedalier » ne trouvait rien là où
  « pédalier » trouvait deux fiches — sur un téléphone, où personne ne met les accents, elle passait
  pour cassée une fois sur deux.
- **Le rôle d'administrateur allait au mauvais compte.** Il était attribué par date de création, et
  un compte sans cette date passait devant tous les autres.
- **La démonstration s'activait d'elle-même** : le modèle `.env` livrait `DEMO_LOGIN` actif, si bien
  qu'en le copiant on ouvrait un compte public sur son serveur privé sans l'avoir voulu.
