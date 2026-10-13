#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${RIWAYA_ENV_FILE:-/var/www/riwayama/.env}"
APP_URL="${RIWAYA_APP_URL:-https://www.riwaya.store}"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Fichier d'environnement introuvable: $ENV_FILE" >&2
    exit 1
fi

CRON_SECRET=$(sed -n 's/^CRON_SECRET=//p' "$ENV_FILE" | tail -n 1 | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
if [[ -z "$CRON_SECRET" ]]; then
    echo "CRON_SECRET est absent de $ENV_FILE" >&2
    exit 1
fi

curl --fail --silent --show-error \
    --max-time 240 \
    --retry 2 \
    --header "Authorization: Bearer ${CRON_SECRET}" \
    "${APP_URL%/}/api/cron/jumia-status-changes"
echo
