# tekno.ma premium storefront

Frontend autonome destiné à `tekno.ma`. Il ne se connecte pas directement à Prisma ou MySQL.

## Lancer localement

Depuis la racine du dépôt :

```bash
npm --prefix apps/storefront-ma run dev
```

Le site est disponible sur `http://localhost:3001/fr`, `/ar` et `/en`.

## Indexation

La préproduction est `noindex` par défaut. Définir `TEKNO_MA_INDEXABLE=true` uniquement lors de la mise en production publique.

Les livres affichés sont temporaires. Ils seront remplacés par le futur contrat API lecture seule du backoffice Tekno Store.

Pour utiliser le catalogue réel, définir `TEKNO_BACKEND_URL=https://tekno.ma`. Le storefront appelle uniquement l'API publique versionnée `/api/storefront/v1/home` ; il ne reçoit aucun accès à la base de données.

## Préproduction Docker

Depuis la racine du dépôt :

```bash
docker compose -f docker-compose.storefront-ma.yml up -d --build
```

Le conteneur écoute uniquement sur `127.0.0.1:3001`. Nginx est le seul point d'entrée public. L'indexation reste désactivée sur la préproduction.
