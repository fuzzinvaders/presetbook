# Installer et exploiter Presetbook

Le serveur n'a **aucune dépendance** : Node 18 ou plus suffit, et l'image Docker se construit sans
étape d'installation de paquets.

## En local

```bash
npm start
```

Puis <http://localhost:8080>. Les données vont dans `./data`.

## Avec Docker

L'image est publiée à chaque commit sur `main` : rien à construire.

```bash
docker run -d --name presetbook -p 8080:8080 -v presetbook-data:/data ghcr.io/fuzzinvaders/presetbook:latest
```

Ou avec le fichier compose du dépôt, qui ajoute la sonde de santé et le redémarrage automatique :

```bash
docker compose up -d
```

Trois étiquettes existent : `latest` suit `main`, `vX.Y.Z` fige une version, et `sha-1a2b3c` désigne
un commit précis. Les images sont construites pour **amd64 et arm64**, donc elles tournent aussi sur
un Raspberry Pi.

Pour partir des sources plutôt que de l'image publiée, décommenter `build: .` dans le fichier compose
et lancer `docker compose up -d --build`.

## Derrière un reverse proxy

`docker-compose.traefik.yml` couvre le cas d'une mise en ligne en HTTPS derrière Traefik, sur un
réseau partagé. Deux valeurs dépendent de la machine et vivent dans un `.env` à côté du fichier
compose, jamais dans le dépôt :

```bash
git clone https://github.com/fuzzinvaders/presetbook.git
cd presetbook
cp .env.example .env        # puis renseigner DOMAIN et DATA_PATH
sudo mkdir -p /srv/presetbook-data
sudo chown -R 1000:1000 /srv/presetbook-data
docker compose -f docker-compose.traefik.yml up -d
```

`DATA_PATH` est **exigé**, sans valeur par défaut. C'est volontaire : un défaut ferait démarrer le
service sur un dossier vide, ce qui ressemble à s'y méprendre à la perte de toutes les fiches alors
que les données sont intactes ailleurs. Mieux vaut un démarrage qui refuse et nomme la variable.

Le `chown` compte autant que le reste : **le conteneur tourne sans privilèges, sous l'uid 1000.** Sur
un dossier appartenant à root, le serveur démarre et ne peut écrire aucun preset.

Quatre points de ce fichier méritent l'attention :

- **aucun port publié.** Traefik joint le conteneur par le réseau interne ; un `ports:` rendrait le
  site accessible en clair, sans TLS, en contournant le proxy. Pour un dépannage, se limiter à la
  boucle locale de l'hôte : `127.0.0.1:6598:8080` ;
- **la règle Traefik attend des accents graves** autour de l'hôte, pas des guillemets doubles, et
  l'étiquette entière se met alors entre apostrophes simples en YAML :

  ```yaml
  - 'traefik.http.routers.presetbook.rule=Host(`${DOMAIN:?renseigne DOMAIN dans .env}`)'
  ```

- **`SECURE_COOKIES=1`** garantit le drapeau `Secure` du cookie de session même si l'en-tête
  `X-Forwarded-Proto` manque ;
- le nom du point d'entrée (`websecure` dans l'exemple) doit correspondre à ce que déclare la
  configuration statique de Traefik.

### Mettre à jour

```bash
docker compose -f docker-compose.traefik.yml pull
docker compose -f docker-compose.traefik.yml up -d
```

`pull` récupère l'image republiée, `up -d` recrée le conteneur seulement si l'image a changé. Plus
rien n'est construit sur le serveur, donc la mise à jour prend quelques secondes. Les données vivent
dans le montage lié : elles ne sont pas touchées.

Un `git pull` du dépôt n'est plus nécessaire pour mettre à jour l'application — seulement pour
récupérer une évolution des fichiers compose eux-mêmes.

## Configuration

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `PORT` | `8080` | port d'écoute |
| `HOST` | `0.0.0.0` | interface d'écoute |
| `DATA_DIR` | `/data` (image) ou `./data` | dossier des données |
| `ALLOW_REGISTER` | vide | `1` pour ouvrir la création de comptes à tout le monde |
| `SESSION_DAYS` | `30` | durée d'une session |
| `SECURE_COOKIES` | vide | `1` pour forcer le cookie `Secure` |
| `BASIC_AUTH` | vide | `utilisateur:motdepasse` — barrière HTTP devant tout le site sauf `/healthz` |
| `DEMO_LOGIN` | vide | `identifiant:motdepasse` — compte de démonstration public, voir plus bas |

Un bloc `environment` se rédige **soit** en table (`CLE: "valeur"`), **soit** en liste
(`- CLE=valeur`) : mélanger les deux dans le même bloc est une erreur de syntaxe YAML, et le fichier
ne se charge pas du tout.

Les secrets comme `BASIC_AUTH` vont dans un fichier `.env` à côté du fichier compose, jamais dans le
fichier compose lui-même qui est suivi par git. Voir `.env.example`.

## Comptes et sécurité

La création de comptes est possible dans trois cas : aucun compte n'existe encore, `ALLOW_REGISTER`
est activé, ou la demande vient d'un utilisateur déjà connecté — ce dernier cas permet d'ouvrir un
compte à quelqu'un du groupe sans ouvrir le serveur à tout Internet. C'est ce que fait le bouton
**Comptes** de l'en-tête, et c'est la voie recommandée : laisser `ALLOW_REGISTER` désactivé.

Un compte créé par un utilisateur connecté **ne reçoit pas de cookie de session** : la réponse porte
`switched: false`, donc la session de qui l'a créé n'est pas détournée vers le nouveau compte. La
personne se connectera elle-même.

Ce qui est stocké, et comment :

- les mots de passe ne sont **jamais** enregistrés. Seule une dérivation **scrypt** (N=16384, r=8,
  p=1, 64 octets) l'est, avec un sel aléatoire par compte, et la comparaison se fait en temps
  constant ;
- les jetons de session ne sont pas enregistrés non plus : seule leur empreinte SHA-256 l'est, donc
  lire `sessions.json` ne permet pas d'usurper une session ;
- cookie `HttpOnly`, `SameSite=Lax`, `Secure` dès que le site est servi en HTTPS ;
- au-delà de 10 échecs de connexion en un quart d'heure, la même adresse est refusée sans même
  vérifier le mot de passe. Un identifiant inconnu et un mauvais mot de passe donnent la même
  réponse, pour ne pas révéler quels comptes existent ;
- **pas de récupération par courriel.** Un mot de passe perdu se redonne depuis la machine, voir
  juste en dessous — les presets, eux, ne bougent pas.

Les comptes protègent les données, pas le réseau. Pour une exposition hors du réseau local, placer le
service derrière un reverse proxy en **HTTPS** : l'authentification transmet le mot de passe dans le
corps de la requête, ce qui n'a de sens que sous TLS. `BASIC_AUTH` peut servir de barrière
supplémentaire pour masquer entièrement l'existence du site.

### Un mot de passe oublié

Chacun change le sien depuis l'application, bouton **Comptes**. Mais personne ne peut changer celui
d'un autre par le web, et c'est délibéré : ce serveur n'a pas d'administrateur, et tout utilisateur
connecté pouvant ouvrir un compte, ce droit-là permettrait de prendre n'importe quel compte.

Le droit vient donc de l'accès à la machine :

```bash
DATA_DIR=/srv/presetbook-data node tools/motdepasse.js <identifiant>
```

Sans second argument, l'outil **tire un mot de passe au hasard et l'affiche** — rien ne passe par
l'historique du shell. Il ferme aussi les sessions enregistrées du compte. Les sessions déjà en
mémoire du serveur, elles, tombent au redémarrage :

```bash
docker compose -f docker-compose.traefik.yml restart presetbook
```

Depuis un conteneur en marche, sans arrêter le service :

```bash
docker compose -f docker-compose.traefik.yml exec presetbook node tools/motdepasse.js <identifiant>
```

### Ce qui part sur le fil

Le serveur compresse en **gzip** ce qui y gagne — HTML, JavaScript, JSON, SVG, manifeste — au-dessus
de 1400 octets et seulement si le client l'accepte. La page passe de **198 Ko à 58 Ko**, ce qui se
voit sur la 4G d'une salle de répétition bien plus que sur un réseau local.

Trois précautions, chacune pour un défaut précis :

- `Vary: Accept-Encoding` accompagne toute réponse concernée. Sans lui, un intermédiaire peut servir
  la version compressée à un client qui ne sait pas la lire ;
- l'**ETag change avec l'encodage** (suffixe `-gz`), pour la même raison, et les deux formes sont
  reconnues en requête conditionnelle ;
- les images et les polices sont **laissées telles quelles** : déjà compressées, les repasser en gzip
  coûterait du temps pour grossir de quelques octets.

Les fichiers statiques sont compressés une fois puis mémorisés, indexés par leur ETag — inutile de
refaire le travail à chaque visite sur une machine modeste.

### Le compte de démonstration

`DEMO_LOGIN=demo:demo` ouvre un compte public, pour laisser regarder l'application sans inscription.
Il apparaît alors sur l'écran de connexion sous la forme d'un bouton **Essayer la démonstration** —
un clic, aucun mot de passe à taper ni à transmettre : le serveur ouvre la session lui-même. Les
identifiants restent utilisables à la main pour qui les connaît.

Ses identifiants étant publics, le compte est tenu à l'écart sur quatre points :

- il **ne peut pas créer de compte**. Sans cela, n'importe qui sur Internet pourrait s'ouvrir un
  compte sur votre serveur, puisqu'un utilisateur connecté a ce droit ;
- ses fiches **repartent de zéro à chaque démarrage** du serveur. Une démonstration abîmée se répare
  en redémarrant, et rien ne s'accumule ;
- il **ne compte pas** comme propriétaire du serveur. Sur une installation neuve, sa présence ne
  ferme pas la création de comptes : le premier vrai compte créé reste le vôtre ;
- les entrées en démonstration sont **plafonnées par adresse**, pour qu'un robot ne fabrique pas des
  sessions à l'infini.

Le minimum de dix caractères ne s'applique pas à ce mot de passe : il n'est pas un secret. Laisser
`DEMO_LOGIN` vide retire le compte de l'écran de connexion — le compte existant, lui, reste dans
`users.json` tant qu'on ne l'en retire pas à la main.

### Le seul script tiers

Le bouton de dons flottant est servi par Ko-fi : c'est du code exécuté dans votre page que vous ne
servez pas vous-même. Deux précautions le rendent acceptable :

- il n'est chargé **qu'une fois la session ouverte**, jamais tant que l'écran de connexion est
  possible. Un script tiers et un champ de mot de passe n'ont rien à faire sur la même page ;
- il est absent de la page publiée, où la politique de sécurité du contenu bloque de toute façon les
  hôtes externes.

Pour l'enlever : videz la constante `KOFI`, en tête de la partie script de `public/index.html`. Le
lien du pied de page reste — lui ne dépend d'aucun tiers. C'est aussi ce qu'il faut faire pour une
instance qui doit tourner **sans aucune requête sortante** ; noter que la page charge par ailleurs
ses polices depuis Google Fonts, avec un repli système si elles n'arrivent pas.

## Les données sur le disque

```
/data
├── users.json                  comptes (sel + dérivation scrypt)
├── sessions.json               sessions actives (empreintes de jetons)
└── presets/<id-du-compte>.json presets et façades, un fichier par compte
```

Chaque écriture recopie l'état précédent en `*.bak.json` et remplace le fichier de façon atomique
(fichier temporaire puis renommage), pour qu'une coupure ne laisse jamais un JSON tronqué. Si le
fichier principal devient illisible, le serveur repart de la sauvegarde.

Sauvegarder une instance, c'est copier ce dossier. Le bouton **Sauvegarde** de l'interface offre en
plus un export JSON par compte, à conserver ailleurs.

## Points d'entrée

| Méthode | Chemin | Effet |
| --- | --- | --- |
| `GET` | `/` | l'application |
| `GET` | `/api/session` | qui est connecté, et si la création de comptes est ouverte |
| `POST` | `/api/register` | crée un compte |
| `POST` | `/api/login` | ouvre une session |
| `POST` | `/api/logout` | ferme la session |
| `GET` | `/api/presets` | les presets du compte connecté |
| `PUT` | `/api/presets` | remplace les presets du compte connecté |
| `GET` | `/healthz` | sonde de santé, jamais protégée ; publie l'empreinte de la page servie |

## « J'ai mis à jour, je ne vois pas les nouveautés »

`/healthz` publie l'empreinte de la page réellement servie. Une seule commande tranche :

```bash
curl -s https://presetbook.exemple.fr/healthz
```

```json
{"status":"ok","uptime":42,"app":{"sha":"36490f25464e","bytes":128877,"mtime":"…"}}
```

À comparer avec la source du même commit :

```bash
sha256sum public/index.html | cut -c1-12          # dans le dépôt, au commit voulu
```

- **empreintes identiques** : le serveur sert bien la nouvelle version, le problème est dans le
  navigateur. Recharger en forçant (Ctrl+Maj+R) ; la page est servie en `no-cache`, mais un
  intermédiaire ou un onglet resté ouvert peut garder l'ancienne ;
- **empreintes différentes** : le conteneur tourne sur une image plus ancienne. Le `pull` n'a pas été
  fait, ou l'image publiée n'est pas encore prête — la chaîne d'intégration met une poignée de
  minutes après le commit, et elle ne publie rien si les tests échouent.

```bash
docker compose -f docker-compose.traefik.yml pull && docker compose -f docker-compose.traefik.yml up -d
docker compose -f docker-compose.traefik.yml logs --tail 5 presetbook
docker image inspect ghcr.io/fuzzinvaders/presetbook:latest -f '{{index .Config.Labels "org.opencontainers.image.revision"}}'
```

La dernière commande donne le commit exact embarqué dans l'image, posé par la chaîne de publication.

La ligne `page servie : <empreinte>` du journal de démarrage dit immédiatement ce que le conteneur a
embarqué.

## Erreurs de démarrage fréquentes

### `denied` ou `unauthorized` en tirant l'image

Le paquet du registre est resté **privé**. Une image publiée sur `ghcr.io` naît privée : il faut la
passer en public une fois, dans la page du paquet sur GitHub (*Package settings → Change visibility*).
Tant que ce n'est pas fait, `docker pull` demande une authentification, y compris depuis le serveur.

### `required variable DATA_PATH is missing a value`

Le `.env` manque à côté du fichier compose, ou il n'a pas la variable. C'est le refus voulu, décrit
plus haut : le service ne démarre pas sur un dossier vide sans le dire.

### `failed to read dockerfile: no such file or directory`

Seulement si vous construisez localement. Le contexte de construction est le **dossier du fichier
compose**, jamais le dossier courant : lancer la commande depuis le dépôt ne suffit pas si le fichier
compose est ailleurs. Pour garder un fichier compose personnel hors du dépôt, désigner le contexte
explicitement :

```yaml
    build:
      context: /chemin/vers/presetbook
```

## Publier une nouvelle image

`.github/workflows/docker.yml` construit et publie à chaque commit sur `main`, et sur chaque
étiquette `vX.Y.Z`. Deux garde-fous : **les tests tournent avant la publication**, donc une suite
rouge n'envoie aucune image ; et une pull request construit tout sans rien publier.

Pour figer une version :

```bash
git tag -a v1.1.0 -m "…" && git push origin v1.1.0
```

La première publication demande une action manuelle : rendre le paquet public, comme décrit
ci-dessus. Ensuite, plus rien à faire.
