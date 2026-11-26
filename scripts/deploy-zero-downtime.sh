#!/usr/bin/env bash
# Déploiement sans coupure (Zero-Downtime) Tekno Store sur VPS
# Compile Next.js dans /var/www/tekno-build pendant que PM2 continue de servir /var/www/tekno
set -euo pipefail

APP_DIR="/var/www/tekno"
BUILD_DIR="/var/www/tekno-build"
REPO_URL="https://github.com/reda7171/teknoma.git"
BRANCH="main"

echo "🚀 [1/5] Préparation du dossier de build isolé ($BUILD_DIR)..."
if [ ! -d "$BUILD_DIR/.git" ]; then
  rm -rf "$BUILD_DIR"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$BUILD_DIR"
else
  cd "$BUILD_DIR"
  git fetch "$REPO_URL" "$BRANCH"
  git reset --hard FETCH_HEAD
fi

cd "$BUILD_DIR"
cp -f "$APP_DIR/.env" "$BUILD_DIR/.env"

# Réutiliser node_modules existants si package-lock.json est identique pour accélérer
if [ ! -d "$BUILD_DIR/node_modules" ]; then
  if [ -d "$APP_DIR/node_modules" ] && cmp -s "$APP_DIR/package-lock.json" "$BUILD_DIR/package-lock.json" 2>/dev/null; then
    echo "📦 Copie de node_modules depuis $APP_DIR (package-lock identique)..."
    cp -a "$APP_DIR/node_modules" "$BUILD_DIR/node_modules"
  else
    echo "📦 Installation des dépendances..."
    npm ci --legacy-peer-deps || npm install --legacy-peer-deps
  fi
elif ! cmp -s "$APP_DIR/package-lock.json" "$BUILD_DIR/package-lock.json" 2>/dev/null; then
  echo "📦 Mise à jour des dépendances..."
  npm ci --legacy-peer-deps || npm install --legacy-peer-deps
fi

echo "🔧 [2/5] Génération Prisma & Build Next.js (le site en prod reste 100% en ligne)..."
rm -rf "$BUILD_DIR/.next/standalone" "$BUILD_DIR/.next/static" "$BUILD_DIR/.next/server"
npx prisma generate
NODE_OPTIONS="--max-old-space-size=1024" npm run build

echo "📁 [3/5] Préparation du bundle standalone..."
rm -rf "$BUILD_DIR/.next/standalone/public" "$BUILD_DIR/.next/standalone/.next/static"
cp -r "$BUILD_DIR/public" "$BUILD_DIR/.next/standalone/public"
mkdir -p "$BUILD_DIR/.next/standalone/.next"
cp -r "$BUILD_DIR/.next/static" "$BUILD_DIR/.next/standalone/.next/static"
cp -f "$APP_DIR/.env" "$BUILD_DIR/.next/standalone/.env"

# Préserver les fichiers uploadés en production dans standalone/public/uploads si présents
if [ -d "$APP_DIR/public/uploads" ]; then
  mkdir -p "$BUILD_DIR/.next/standalone/public/uploads"
  cp -rn "$APP_DIR/public/uploads/." "$BUILD_DIR/.next/standalone/public/uploads/" 2>/dev/null || true
fi

echo "🔄 [4/5] Bascule atomique vers $APP_DIR et redémarrage PM2..."
cd "$APP_DIR"
git fetch "$REPO_URL" "$BRANCH"
git reset --hard FETCH_HEAD

rm -rf "$APP_DIR/.next.old"
if [ -d "$APP_DIR/.next" ]; then
  mv "$APP_DIR/.next" "$APP_DIR/.next.old"
fi
mv "$BUILD_DIR/.next" "$APP_DIR/.next"

pm2 restart tekno
rm -rf "$APP_DIR/.next.old"

echo "✅ [5/5] Vérification santé HTTP..."
for i in $(seq 1 15); do
  if curl -fsS -o /dev/null http://127.0.0.1:3200/fr; then
    echo "🟢 Déploiement Zero-Downtime réussi (HTTP 200 sur /fr)"
    exit 0
  fi
  sleep 1
done

echo "❌ Le serveur n'a pas répondu à temps"
exit 1
