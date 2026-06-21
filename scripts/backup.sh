#!/bin/bash
# gameplaza PostgreSQL backup
# Setup: crontab -e
#   0 */6 * * * /var/www/gameplaza/scripts/backup.sh >> /var/log/gameplaza-backup.log 2>&1

set -euo pipefail
BACKUP_DIR="/var/backups/gameplaza"
KEEP_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/gameplaza_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

if [ -z "${DATABASE_URL:-}" ]; then
  set -a; source /var/www/gameplaza/.env; set +a
fi

pg_dump "$DATABASE_URL" | gzip > "$FILE"
echo "[$(date)] Backup OK: $FILE ($(du -sh "$FILE" | cut -f1))"

find "$BACKUP_DIR" -name "gameplaza_*.sql.gz" -mtime +"$KEEP_DAYS" -delete
echo "[$(date)] Cleanup done. Total: $(ls "$BACKUP_DIR" | wc -l) files"

if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
  SIZE=$(du -sh "$FILE" | cut -f1)
  MSG="GamePlaza%20backup%20OK:%20${SIZE}%20(%20${DATE})"
  curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${MSG}" > /dev/null
fi