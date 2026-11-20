#!/bin/bash
set -e

DATE=$(date '+%Y-%m-%d %H:%M:%S')
echo "=== [$DATE] Début du contrôle nocturne VPS Tekno Store ==="

ENV_FILE="/var/www/tekno/.env"
if [ -f "$ENV_FILE" ]; then
    export $(grep -E '^(TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID)=' "$ENV_FILE" | xargs)
fi

TOTAL_MEM=$(free -m | awk '/Mem:/ {print $2}')
USED_MEM=$(free -m | awk '/Mem:/ {print $3}')
MEM_PERCENT=$(( USED_MEM * 100 / TOTAL_MEM ))
echo "Utilisation RAM : ${MEM_PERCENT}% (${USED_MEM}Mo / ${TOTAL_MEM}Mo)"

# Nettoyer uniquement le cache de build local. Le cache du conteneur actif ne
# doit pas être supprimé pendant que Next.js traite des requêtes.
if [ -d "/var/www/tekno/.next/cache" ]; then
    rm -rf /var/www/tekno/.next/cache
    echo "Cache de build local supprimé."
fi

if command -v docker &> /dev/null; then
    docker system prune -f || true
fi

TOTAL_SWAP=$(free -m | awk '/Swap:/ {print $2}')
if [ "$TOTAL_SWAP" -lt 1024 ]; then
    echo "Swap insuffisant ($TOTAL_SWAP Mo). Configuration de 2Go..."
    if [ ! -f /swapfile ]; then
        fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile || true
        grep -q "/swapfile" /etc/fstab || echo "/swapfile none swap sw 0 0" >> /etc/fstab
    fi
fi

# Ne jamais redémarrer l'application de façon planifiée. Le précédent
# `docker restart tekno_app` créait une coupure 502 visible chaque nuit.
APP_RUNNING=false
if command -v docker &> /dev/null && docker ps -q --filter "name=^tekno_app$" | grep -q .; then
    APP_RUNNING=true
    echo "Conteneur tekno_app actif : aucun redémarrage nécessaire."
else
    echo "AVERTISSEMENT : le conteneur tekno_app n'est pas actif."
fi

if { [ "$MEM_PERCENT" -ge 85 ] || [ "$APP_RUNNING" != true ]; } && [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    MSG="🚨 <b>Alerte VPS Tekno Store</b>%0AUtilisation RAM : <b>${MEM_PERCENT}%</b>%0AConteneur actif : <b>${APP_RUNNING}</b>%0AAucun redémarrage automatique effectué."
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d "chat_id=${TELEGRAM_CHAT_ID}" \
        -d "text=${MSG}" \
        -d "parse_mode=HTML" > /dev/null || true
fi

echo "=== [$DATE] Contrôle nocturne terminé ==="
