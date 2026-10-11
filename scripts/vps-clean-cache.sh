#!/bin/bash
set -e

DATE=$(date '+%Y-%m-%d %H:%M:%S')
echo "=== [$DATE] Début du nettoyage nocturne VPS Riwaya ==="

# Charger les variables d'environnement si présentes
ENV_FILE="/var/www/riwayama/.env"
if [ -f "$ENV_FILE" ]; then
    export $(grep -E '^(TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID)=' "$ENV_FILE" | xargs)
fi

# 1. Mesure de la RAM
TOTAL_MEM=$(free -m | awk '/Mem:/ {print $2}')
USED_MEM=$(free -m | awk '/Mem:/ {print $3}')
MEM_PERCENT=$(( USED_MEM * 100 / TOTAL_MEM ))
echo "Utilisation RAM : ${MEM_PERCENT}% (${USED_MEM}Mo / ${TOTAL_MEM}Mo)"

# 2. Nettoyage du cache Next.js
echo "Nettoyage du cache Next.js (.next/cache)..."
if command -v docker &> /dev/null && docker ps -q --filter "name=riwaya_app" | grep -q .; then
    docker exec riwaya_app rm -rf /app/.next/cache 2>/dev/null || true
    echo "Cache .next/cache nettoyé dans le conteneur riwaya_app."
fi

if [ -d "/var/www/riwayama/.next/cache" ]; then
    rm -rf /var/www/riwayama/.next/cache
    echo "Cache local /var/www/riwayama/.next/cache supprimé."
fi

# 3. Nettoyage Docker
if command -v docker &> /dev/null; then
    docker system prune -f || true
fi

# 4. Vérification et activation Swap
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

# 5. Redémarrage du conteneur si RAM > 80% ou appel nocturne
if command -v docker &> /dev/null && docker ps -q --filter "name=riwaya_app" | grep -q .; then
    docker restart riwaya_app
    echo "Conteneur riwaya_app redémarré avec succès."
elif command -v pm2 &> /dev/null; then
    pm2 restart all || true
fi

# 6. Alerte Telegram si RAM dépassait 85%
if [ "$MEM_PERCENT" -ge 85 ] && [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    MSG="🚨 <b>Alerte RAM VPS Riwaya</b>%0AUtilisation : <b>${MEM_PERCENT}%</b> (> 85%)%0AAction : Nettoyage cache .next et redémarrage conteneur effectués avec succès."
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d "chat_id=${TELEGRAM_CHAT_ID}" \
        -d "text=${MSG}" \
        -d "parse_mode=HTML" > /dev/null || true
fi

echo "=== [$DATE] Nettoyage nocturne terminé avec succès ==="
