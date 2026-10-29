# Déploiement PetsUnivers

Application : https://petsunivers.ma
Image : ghcr.io/reda7171/petsunivers-app:latest
Dossier VPS : /var/www/petsunivers

Créer un dépôt GitHub distinct de Riwaya. Configurer les secrets Actions
`VPS_HOST`, `VPS_USERNAME`, `VPS_PASSWORD`, et, pour Sonar,
`SONAR_TOKEN` et `SONAR_HOST_URL`. Le SSH utilise le port 2222.

Le déploiement VPS est désactivé tant que la variable Actions
`ENABLE_VPS_DEPLOY` n'est pas `true`. Activer seulement après configuration du
VPS PetsUnivers. Sonar nécessite `ENABLE_SONAR=true`.

Créer `/var/www/petsunivers/.env` depuis `.env.example`, avec une base et des
intégrations propres à PetsUnivers. Ne pas copier la base de production Riwaya.
Configurer Nginx pour petsunivers.ma. Si Riwaya tourne sur le même VPS, attribuer
des ports Docker distincts avant le déploiement.

Le workflow construit l'image puis redémarre l'application sur un push main/master.
Pour l'installation initiale, démarrer la base et les services nécessaires
(`docker compose up -d db redis whatsapp`), puis appliquer le schéma Prisma et
les migrations manuelles nécessaires avant de lancer l'application.

Le seed crée uniquement un administrateur et les catégories animalières.
`ADMIN_INITIAL_PASSWORD` (12 caractères minimum) est requis. Aucun catalogue,
client ou avis Riwaya n'est importé. Aucune donnée existante n'est supprimée.
Les scripts historiques d'import de livres et les documents de conformité du
projet source doivent être revus avant utilisation pour PetsUnivers.
