#!/bin/sh
# Créer les sous-dossiers et corriger les permissions (tourne en root)
mkdir -p /app/public/uploads/books \
         /app/public/uploads/posts \
         /app/public/uploads/marketing \
         /app/public/uploads/creatives \
         /app/public/uploads/videos \
         /app/backups

chown -R nextjs:nodejs /app/public/uploads /app/backups 2>/dev/null || true
chmod -R 775 /app/public/uploads /app/backups 2>/dev/null || true

# Démarrer l'application en tant que nextjs
exec su-exec nextjs node server.js
