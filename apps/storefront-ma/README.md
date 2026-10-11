# Riwaya.ma premium storefront

Frontend autonome destiné à `riwaya.ma`. Il ne se connecte pas directement à Prisma ou MySQL.

## Lancer localement

Depuis la racine du dépôt :

```bash
npm --prefix apps/storefront-ma run dev
```

Le site est disponible sur `http://localhost:3001/fr`, `/ar` et `/en`.

## Indexation

La préproduction est `noindex` par défaut. Définir `RIWAYA_MA_INDEXABLE=true` uniquement lors de la mise en production publique.

Les livres affichés sont temporaires. Ils seront remplacés par le futur contrat API lecture seule du backoffice Riwaya.
