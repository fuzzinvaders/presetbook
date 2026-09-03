# Journal des changements

Ce que chaque version apporte, et pourquoi. [English](CHANGELOG.md).

Les versions suivent [le versionnage sémantique](https://semver.org/lang/fr/) : le premier nombre
change quand une mise à jour demande une intervention, le deuxième quand des choses s'ajoutent, le
troisième quand seuls des défauts sont corrigés. Aucune mise à jour n'a jamais demandé de toucher aux
données : elles vivent dans un volume que l'image ne connaît pas.

Pour rester sur une version précise plutôt que de suivre la pointe :

```yaml
image: ghcr.io/fuzzinvaders/presetbook:v1.4.0   # au lieu de :latest
```

Et pour savoir laquelle tourne chez toi, sans fouiller le conteneur :

```bash
curl -s https://ton-domaine/healthz
docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' presetbook
```

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
