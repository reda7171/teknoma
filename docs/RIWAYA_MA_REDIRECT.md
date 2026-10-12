# Redirection de riwaya.ma vers riwaya.store

Statut : actif depuis le 12 octobre 2026.

La stratégie de second frontend partageant le catalogue a été abandonnée afin d'éviter la concurrence SEO et les contenus produits dupliqués. `riwaya.store` reste l'unique domaine canonique et marchand.

## Règle de migration

- `https://riwaya.ma/<chemin>` redirige en `301` vers `https://riwaya.store/<chemin>`.
- `https://www.riwaya.ma/<chemin>` applique la même redirection.
- Les paramètres de requête sont conservés par Nginx.
- `staging.riwaya.ma` est également redirigé et les anciens conteneurs sont arrêtés, mais leur code et leurs images Docker ne sont pas supprimés.

Exemple :

```text
https://riwaya.ma/fr/books/identifiant
  -> 301 https://riwaya.store/fr/books/identifiant
```

Le frontend expérimental reste archivé dans `apps/storefront-ma` pour conserver l'historique. S'il est relancé localement, `RIWAYA_MA_INDEXABLE` doit rester à `false`.

## Vérifications après modification

```bash
curl -I https://riwaya.ma/fr
curl -I https://www.riwaya.ma/fr
curl -I https://staging.riwaya.ma/fr
curl -I https://riwaya.store/fr
```

Les trois premières URL doivent répondre avec un `301` et un en-tête `Location` pointant vers `https://riwaya.store`. La dernière doit rester disponible normalement.
