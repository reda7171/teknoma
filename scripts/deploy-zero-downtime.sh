#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Déploiement Zero-Downtime Blue/Green pour Riwaya
# Alterne de manière atomique entre le port 3000 (app) et 3002 (app_backup)
# ─────────────────────────────────────────────────────────────────────────────

EXPECTED_SHA="${1:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "═══════════════════════════════════════════════════════════════"
echo "  Démarrage du déploiement Zero-Downtime Riwaya"
echo "═══════════════════════════════════════════════════════════════"

# 1. Identifier l'état courant des conteneurs
HTTP_3000=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://127.0.0.1:3000/fr || true)
HTTP_3002=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://127.0.0.1:3002/fr || true)

if [ "$HTTP_3000" = "200" ] || [ "$HTTP_3000" = "307" ] || [ "$HTTP_3000" = "301" ]; then
    CURRENT="app"
    CURRENT_PORT=3000
    TARGET="app_backup"
    TARGET_PORT=3002
elif [ "$HTTP_3002" = "200" ] || [ "$HTTP_3002" = "307" ] || [ "$HTTP_3002" = "301" ]; then
    CURRENT="app_backup"
    CURRENT_PORT=3002
    TARGET="app"
    TARGET_PORT=3000
else
    # Aucun conteneur ne répond de façon nominale, initialisation sur app
    CURRENT=""
    CURRENT_PORT=0
    TARGET="app"
    TARGET_PORT=3000
fi

echo "Conteneur actif en production : ${CURRENT:-aucun} (port ${CURRENT_PORT})"
echo "Cible de déploiement         : ${TARGET} (port ${TARGET_PORT})"

# 2. Démarrer le conteneur cible avec la nouvelle image
echo "Lancement de ${TARGET} sur le port ${TARGET_PORT}..."
docker compose up -d --no-deps "${TARGET}"

# 3. Attente active de disponibilité HTTP (Warming-up)
echo "Vérification de disponibilité sur 127.0.0.1:${TARGET_PORT}/fr..."
READY=0
for i in $(seq 1 60); do
    BODY=$(curl -s -f -L --max-time 5 "http://127.0.0.1:${TARGET_PORT}/fr" || true)
    if [ -n "$BODY" ]; then
        if [ -n "$EXPECTED_SHA" ]; then
            if echo "$BODY" | grep -q "$EXPECTED_SHA"; then
                echo "Nouveau conteneur opérationnel (HTTP 200, SHA: ${EXPECTED_SHA}) après ${i} vérifications !"
                READY=1
                break
            fi
        else
            echo "Nouveau conteneur opérationnel (HTTP 200) après ${i} vérifications !"
            READY=1
            break
        fi
    fi
    sleep 2
done

if [ $READY -eq 0 ]; then
    echo "ERREUR: Le conteneur ${TARGET} ne répond pas correctement."
    if [ -n "$CURRENT" ]; then
        echo "Sécurité activée : le conteneur ${CURRENT} continue de servir les utilisateurs."
        echo "Arrêt du conteneur en échec ${TARGET}..."
        docker compose stop "${TARGET}" || true
    fi
    exit 1
fi

# 4. Bascule atomique d'Upstream Nginx (Zero-Downtime)
echo "Mise à jour de l'upstream Nginx vers le port ${TARGET_PORT}..."
UPSTREAM_CONF="/etc/nginx/conf.d/riwaya_upstream.conf"

if [ -n "$CURRENT" ] && [ "$CURRENT" != "$TARGET" ]; then
    BACKUP_DIRECTIVE="server 127.0.0.1:${CURRENT_PORT} backup;"
else
    BACKUP_DIRECTIVE=""
fi

cat << EOF > "$UPSTREAM_CONF"
upstream riwaya_backend {
    server 127.0.0.1:${TARGET_PORT} max_fails=3 fail_timeout=10s;
    ${BACKUP_DIRECTIVE}
    keepalive 32;
}
EOF

# Validation et rechargement Nginx
nginx -t
systemctl reload nginx
echo "Nginx rechargé avec succès : trafic redirigé vers ${TARGET}."

# 5. Vidange des connexions et arrêt propre de l'ancien conteneur
if [ -n "$CURRENT" ] && [ "$CURRENT" != "$TARGET" ]; then
    echo "Délai de grâce de 10s pour finaliser les requêtes en vol..."
    sleep 10
    echo "Arrêt sécurisé de l'ancien conteneur ${CURRENT}..."
    docker compose stop "${CURRENT}" || true
fi

echo "═══════════════════════════════════════════════════════════════"
echo "  Déploiement Zero-Downtime terminé avec 100% de succès !"
echo "═══════════════════════════════════════════════════════════════"
