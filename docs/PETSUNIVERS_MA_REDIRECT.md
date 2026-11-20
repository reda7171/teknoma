# Redirection de petsunivers.ma vers petsunivers.ma

Statut : actif depuis le 12 octobre 2026.

La stratégie de second frontend partageant le catalogue a été abandonnée afin d'éviter la concurrence SEO et les contenus produits dupliqués. `petsunivers.ma` reste l'unique domaine canonique et marchand.

## Règle de migration

- `https://petsunivers.ma/<chemin>` redirige en `301` vers `https://petsunivers.ma/<chemin>`.
- `https://www.petsunivers.ma/<chemin>` applique la même redirection.
- Les paramètres de requête sont conservés par Nginx.
- `staging.petsunivers.ma` est également redirigé et les anciens conteneurs sont arrêtés, mais leur code et leurs images Docker ne sont pas supprimés.

Exemple :

```text
https://petsunivers.ma/fr/books/identifiant
  -> 301 https://petsunivers.ma/fr/books/identifiant
```

Le frontend expérimental reste archivé dans `apps/storefront-ma` pour conserver l'historique. S'il est relancé localement, `PETSUNIVERS_MA_INDEXABLE` doit rester à `false`.

## Vérifications après modification

```bash
curl -I https://petsunivers.ma/fr
curl -I https://www.petsunivers.ma/fr
curl -I https://staging.petsunivers.ma/fr
curl -I https://petsunivers.ma/fr
```

Les trois premières URL doivent répondre avec un `301` et un en-tête `Location` pointant vers `https://petsunivers.ma`. La dernière doit rester disponible normalement.
