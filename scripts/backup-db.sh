#!/bin/sh
set -eu

CONTAINER_NAME="${PETSUNIVERS_DB_CONTAINER:-petsunivers_db}"
BACKUP_DIR="${PETSUNIVERS_BACKUP_DIR:-/var/www/petsunivers/backups}"
DATE="$(date +'%Y-%m-%d_%H-%M-%S')"
FILENAME="backup_petsunivers_db_${DATE}.sql"
TEMP_FILE="${BACKUP_DIR}/.${FILENAME}.part"
FINAL_FILE="${BACKUP_DIR}/${FILENAME}"

mkdir -p "$BACKUP_DIR"
trap 'rm -f "$TEMP_FILE"' EXIT HUP INT TERM

echo "Début de la sauvegarde MySQL..."

if ! docker inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
    echo "Erreur : conteneur MySQL introuvable : $CONTAINER_NAME" >&2
    exit 1
fi

# Les identifiants restent dans l'environnement du conteneur et ne sont pas
# copiés dans ce script ou affichés dans la ligne de commande de mysqldump.
docker exec "$CONTAINER_NAME" sh -c '
    : "${MYSQL_DATABASE:?MYSQL_DATABASE absent}"
    : "${MYSQL_USER:?MYSQL_USER absent}"
    : "${MYSQL_PASSWORD:?MYSQL_PASSWORD absent}"
    MYSQL_PWD="$MYSQL_PASSWORD" exec mysqldump \
        --default-character-set=utf8mb4 \
        --single-transaction \
        --quick \
        --no-tablespaces \
        --routines \
        --triggers \
        --events \
        -u"$MYSQL_USER" \
        "$MYSQL_DATABASE"
' > "$TEMP_FILE"

if [ ! -s "$TEMP_FILE" ]; then
    echo "Erreur : mysqldump a produit un fichier vide" >&2
    exit 1
fi

mv "$TEMP_FILE" "$FINAL_FILE"
gzip -f "$FINAL_FILE"
gzip -t "${FINAL_FILE}.gz"

echo "Sauvegarde vérifiée : ${FINAL_FILE}.gz ($(wc -c < "${FINAL_FILE}.gz") octets)"

# Conserver sept jours de sauvegardes compressées valides.
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'backup_*.sql.gz' -mtime +7 -delete
