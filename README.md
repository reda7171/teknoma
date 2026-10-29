# PetsUnivers

Boutique animalière au Maroc : alimentation, accessoires, hygiène et soins pour
chats, chiens et petits animaux. Interface en français, arabe et anglais,
catalogue, panier, commandes et administration.

## Installation locale

1. Installer les dépendances : `npm install --legacy-peer-deps`.
2. Copier `.env.example` vers `.env` et configurer une base MySQL dédiée.
3. Générer Prisma : `npm run prisma:generate`.
4. Initialiser le schéma : `npm run db:push` sur une base PetsUnivers neuve.
5. Définir `ADMIN_INITIAL_PASSWORD`, puis exécuter `npm run prisma:seed`.
6. Démarrer : `npm run dev`.

Le seed initialise un administrateur et les catégories animalières, sans
catalogue de démonstration. Les produits sont gérés depuis l'administration.

## Déploiement

Consulter [le guide PetsUnivers](docs/DEPLOYMENT_PETSUNIVERS.md).
Le workflow publie l'image `ghcr.io/reda7171/petsunivers-app`.
Le déploiement VPS exige `ENABLE_VPS_DEPLOY=true` et des secrets propres au site.

## Structure héritée

Le projet conserve les modèles Prisma et routes d'administration du socle
d'origine, notamment `Book` pour les produits. Des modules historiques de
librairie, contenus d'exemple et documents binaires restent à revoir avant leur
utilisation pour PetsUnivers. Leur renommage ne valide pas leur contenu.
Ne pas réutiliser la base, les clients ou les intégrations de Riwaya.

La configuration existante ignore les erreurs TypeScript pendant `next build`.
Exécuter `npx tsc --noEmit` séparément pour les identifier.
