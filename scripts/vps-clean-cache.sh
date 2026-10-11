#!/bin/bash
set -e

echo "=== [1/4] Nettoyage du cache Next.js ==="
# Si Docker est utilisé :
if command -v docker &> /dev/null && docker ps -q --filter "name=riwaya_app" | grep -q .; then
    docker exec riwaya_app rm -rf /app/.next/cache 2>/dev/null || true
    echo "Cache .next/cache nettoyé dans le conteneur riwaya_app."
fi

# Si exécuté hors conteneur :
if [ -d ".next/cache" ]; then
    rm -rf .next/cache
    echo "Cache local .next/cache supprimé."
fi

echo "=== [2/4] Nettoyage Docker (images/caches suspendus) ==="
if command -v docker &> /dev/null; then
    docker system prune -f || true
fi

echo "=== [3/4] Vérification de l'espace Swap ==="
TOTAL_SWAP=$(free -m | awk '/Swap:/ {print $2}')
if [ "$TOTAL_SWAP" -lt 1024 ]; then
    echo "Swap insuffisant ($TOTAL_SWAP Mo). Création d'un swap de 2Go..."
    if [ ! -f /swapfile ]; then
        fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile || true
        grep -q "/swapfile" /etc/fstab || echo "/swapfile none swap sw 0 0" >> /etc/fstab
        echo "Swap de 2Go activé avec succès."
    fi
else
    echo "Swap déjà actif : ${TOTAL_SWAP} Mo."
fi

echo "=== [4/4] Redémarrage de l'application ==="
if command -v docker &> /dev/null && docker ps -q --filter "name=riwaya_app" | grep -q .; then
    docker restart riwaya_app
    echo "Conteneur riwaya_app redémarré avec succès."
elif command -v pm2 &> /dev/null; then
    pm2 restart all || true
fi

echo "Terminé avec succès !"
