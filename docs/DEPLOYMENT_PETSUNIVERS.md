# Déploiement PetsUnivers

## Installation VPS isolée

- Dossier : `/var/www/petsunivers`
- Compose : `docker-compose.vps.yml`, projet `petsunivers`
- Application : `127.0.0.1:3100`, conteneur `petsunivers_app`
- Base : `petsunivers_db`, sans port public, volume `petsunivers_mysql_data`
- Redis : `petsunivers_redis`, sans port public
- Image : `ghcr.io/reda7171/petsunivers-app:latest`
- Nginx : `/etc/nginx/sites-available/petsunivers`
- Prévisualisation : `http://167.86.108.246:8084/fr`
- Domaine prévu : `https://petsunivers.ma`

Le fichier `.env` du VPS contient des identifiants dédiés et ne doit jamais être
commité. Le catalogue et les clients Riwaya ne sont pas importés. L'installation
initiale crée une base vide avec un administrateur et six catégories animalières.

## Mises à jour

Les pushes sur main construisent et publient l'image. Attendre le succès du job
`build-and-push-image`, puis lancer le workflow manuel **Deploy PetsUnivers VPS**
avec `pull_only=false`. Les secrets `VPS_HOST`, `VPS_USERNAME` et `VPS_PASSWORD`
sont nécessaires ; le port SSH est 2222.

Ce workflow utilise une configuration Docker privée à PetsUnivers pour récupérer
l'image GHCR, puis redémarre uniquement `petsunivers_app`. Il ne modifie ni Nginx,
ni la base, ni les services Riwaya. Une évolution du schéma nécessite une migration
contrôlée avant le déploiement de l'application.

Le workflow historique `deploy.yml` conserve son déploiement VPS désactivé :
ne pas activer `ENABLE_VPS_DEPLOY`. Utiliser le workflow dédié ci-dessus.

Pour les commandes manuelles :

```sh
cd /var/www/petsunivers
sudo docker compose -f docker-compose.vps.yml ps
sudo docker compose -f docker-compose.vps.yml logs --tail=100 app
```

## Domaine et administration

Faire pointer les enregistrements A de `petsunivers.ma` et `www.petsunivers.ma`
vers `167.86.108.246`, puis installer le certificat TLS du seul site PetsUnivers.
La prévisualisation IP utilise HTTP ; la connexion admin exige HTTPS et le
système existant d'approbation Telegram, à configurer avec les intégrations
PetsUnivers. Ne pas réutiliser implicitement les intégrations Riwaya.
