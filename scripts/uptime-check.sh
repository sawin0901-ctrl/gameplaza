#!/bin/bash
# gameplaza uptime monitor — Telegram alert on downtime
# Setup: crontab -e
#   */5 * * * * /var/www/gameplaza/scripts/uptime-check.sh

URL="https://gameplaza.site/api/health"
STATE_FILE="/tmp/gameplaza-uptime-state"

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ]; then
  set -a; source /var/www/gameplaza/.env; set +a
fi

send_tg() {
  local msg="$1"
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\":\"${TELEGRAM_CHAT_ID}\",\"text\":\"${msg}\",\"parse_mode\":\"HTML\"}" > /dev/null
}

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 15 "$URL" || echo "000")

PREV_STATE=$(cat "$STATE_FILE" 2>/dev/null || echo "ok")

if [ "$HTTP_CODE" = "200" ]; then
  if [ "$PREV_STATE" = "down" ]; then
    send_tg "GamePlaza RECOVERED - site is UP (HTTP $HTTP_CODE)"
  fi
  echo "ok" > "$STATE_FILE"
else
  if [ "$PREV_STATE" != "down" ]; then
    send_tg "GamePlaza DOWN - HTTP $HTTP_CODE from $URL"
  fi
  echo "down" > "$STATE_FILE"
fi