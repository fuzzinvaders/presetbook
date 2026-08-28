# Presetbook

Le carnet de réglages : les presets d'un instrument, d'un ampli, d'une pédale, d'un pédalier entier,
et les chaînes de plugins
d'un logiciel d'enregistrement, rangés dans une seule page qu'on peut chercher, dupliquer et
modifier.

Une fiche s'affiche telle qu'on la lirait sur le matériel : en heures d'horloge pour un bouton cranté
au milieu, sur son échelle pour un bouton gradué, avec les vrais noms de paramètres des plugins.
Rien n'est câblé en dur pour un modèle précis — les façades et les plugins sont décrits dans des
registres, et l'interface en découle.

En français ou en anglais, au choix : le bouton `FR` / `EN` traduit l'interface **et** le catalogue,
en laissant les noms propres tranquilles. / Available in French and English — the `FR` / `EN` button
switches the interface and the catalogue alike.

## Démarrer

```bash
docker run -d -p 8080:8080 -v presetbook-data:/data ghcr.io/fuzzinvaders/presetbook:latest
```

L'image publique est reconstruite à chaque commit, pour **amd64 et arm64** — elle tourne donc aussi
sur un Raspberry Pi. Sans Docker, le serveur n'a aucune dépendance :

```bash
git clone https://github.com/fuzzinvaders/presetbook.git && cd presetbook && npm start
```

Puis <http://localhost:8080>. À la première ouverture, aucun compte n'existe : le premier créé est le
vôtre.

## Documentation

| | |
| --- | --- |
| [Utiliser Presetbook](docs/utilisation.md) | lire et modifier une fiche, composer un pédalier, créer une façade, importer une chaîne de Reaper, changer de langue, exporter, sauvegarder |
| [Installer et exploiter](docs/installation.md) | Docker, reverse proxy, mise à jour, comptes, sécurité, script tiers, erreurs de démarrage |
| [Développer](docs/developpement.md) | architecture, modèle de données, registres, codec `.RfxChain`, les deux langues, tests |

## Tests

```bash
npm test
```

Onze suites, 345 vérifications, sans rien à installer : le rendu de la page rejoué dans un DOM
minimal, le registre des façades, celles créées depuis l'interface, le formulaire qui les crée, les
pédales et leur dessin, le codec des chaînes d'effets sur une chaîne réelle, les types de bande de
ReaEQ, l'export d'une fiche et son retour dans une autre bibliothèque, la licence et le widget de
dons, la création de comptes, et la version anglaise — treize écrans rendus en anglais, qui échouent
si un mot français y subsiste.

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
