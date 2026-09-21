#!/bin/sh
# Créer les sous-dossiers d'upload (chemin interne Docker = /app)
mkdir -p /app/public/uploads/books \
         /app/public/uploads/posts \
         /app/public/uploads/marketing \
         /app/public/uploads/creatives \
         /app/public/uploads/videos \
         /app/backups 2>/dev/null || true

# Lancer l'application
exec node /app/server.js
