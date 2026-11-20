#!/bin/bash
set -e

DATE=$(date '+%Y-%m-%d %H:%M:%S')
echo "=== [$DATE] Redémarrage / Vérification du conteneur WAHA ==="

ENV_FILE="/var/www/petsunivers/.env"
if [ -f "$ENV_FILE" ]; then
    export $(grep -E '^(TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID|WAHA_API_KEY)=' "$ENV_FILE" | xargs 2>/dev/null || true)
fi

cd /var/www/petsunivers

echo "Lancement ou rechargement du service WAHA..."
if command -v docker &> /dev/null; then
    docker compose up -d whatsapp 2>/dev/null || docker-compose up -d whatsapp 2>/dev/null
fi

echo "Attente du démarrage du service (5s)..."
sleep 5

WAHA_STATUS="OFFLINE"
AUTH_HEADER=""
if [ -n "$WAHA_API_KEY" ]; then
    AUTH_HEADER="-H X-Api-Key:$WAHA_API_KEY"
fi

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $AUTH_HEADER "http://127.0.0.1:3001/api/sessions?all=true" || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    WAHA_STATUS="ONLINE"
    echo "Succès : WAHA est en ligne (HTTP $HTTP_CODE)."
else
    echo "Avertissement : WAHA a retourné le statut HTTP $HTTP_CODE."
fi

if [ "$WAHA_STATUS" != "ONLINE" ] && [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    MSG="⚠️ <b>Alerte Passerelle WAHA</b>%0AStatut : <b>${WAHA_STATUS}</b> (HTTP ${HTTP_CODE})%0AVérifiez le conteneur petsunivers_whatsapp."
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d "chat_id=${TELEGRAM_CHAT_ID}" \
        -d "text=${MSG}" \
        -d "parse_mode=HTML" > /dev/null || true
fi

echo "=== [$DATE] Fin du contrôle WAHA ==="
