#!/bin/sh
# Créer les sous-dossiers et corriger les permissions (tourne en root)
APP_DIR="${APP_DIR:-/var/www/riwayama}"

mkdir -p "$APP_DIR/public/uploads/books" \
         "$APP_DIR/public/uploads/posts" \
         "$APP_DIR/public/uploads/marketing" \
         "$APP_DIR/public/uploads/creatives" \
         "$APP_DIR/public/uploads/videos" \
         "$APP_DIR/backups"

chown -R nextjs:nodejs "$APP_DIR/public/uploads" "$APP_DIR/backups" 2>/dev/null || true
chmod -R 775 "$APP_DIR/public/uploads" "$APP_DIR/backups" 2>/dev/null || true

# Démarrer l'application en tant que nextjs
exec su-exec nextjs node server.js
