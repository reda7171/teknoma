#!/bin/sh
# Créer les sous-dossiers d'upload (chemin interne Docker = /app)
mkdir -p /app/public/uploads/books \
         /app/public/uploads/posts \
         /app/public/uploads/marketing \
         /app/public/uploads/creatives \
         /app/public/uploads/videos \
         /app/backups 2>/dev/null || true

# Nettoyer les caches Next.js corrompus ou saturés au démarrage
rm -rf /app/.next/cache 2>/dev/null || true

# Lancer l'application avec limite mémoire augmentée
exec node --max-old-space-size=4096 /app/server.js
