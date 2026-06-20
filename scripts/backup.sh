#!/bin/bash
# GamePlaza — автоматический бэкап базы данных
# Запускать: bash /var/www/gameplaza/scripts/backup.sh
# Cron: 0 3 * * * bash /var/www/gameplaza/scripts/backup.sh >> /var/log/gameplaza-backup.log 2>&1

set -e

APP_DIR="/var/www/gameplaza"
BACKUP_DIR="/var/backups/gameplaza"
KEEP_DAYS=30
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="${BACKUP_DIR}/db_${DATE}.sql.gz"

# Load .env
if [ -f "${APP_DIR}/.env" ]; then
  export $(grep -v '^#' "${APP_DIR}/.env" | grep 'DATABASE_URL' | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "[backup] ERROR: DATABASE_URL not set"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

# Extract connection parts from DATABASE_URL
# Format: postgresql://user:pass@host:port/dbname
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

export PGPASSWORD="$DB_PASS"

echo "[backup] Starting backup: ${BACKUP_FILE}"

pg_dump \
  --host="$DB_HOST" \
  --port="${DB_PORT:-5432}" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=plain \
  --no-owner \
  --no-acl \
  | gzip > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[backup] Done: ${BACKUP_FILE} (${SIZE})"

# Remove old backups
DELETED=$(find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +${KEEP_DAYS} -delete -print | wc -l)
echo "[backup] Removed ${DELETED} old backup(s) older than ${KEEP_DAYS} days"

# List remaining backups
COUNT=$(ls -1 "${BACKUP_DIR}/db_"*.sql.gz 2>/dev/null | wc -l)
echo "[backup] Total backups stored: ${COUNT}"
echo "[backup] Completed at $(date)"
