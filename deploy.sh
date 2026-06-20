#!/bin/bash
set -e
cd /var/www/gameplaza

# Проверяем критические переменные окружения
echo "==> [0/6] Checking environment..."
if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
  echo "ERROR: .env file not found! Aborting deploy."
  exit 1
fi

# Загружаем переменные для проверки
set -a
# shellcheck disable=SC1091
[ -f ".env.local" ] && source .env.local || source .env
set +a

for VAR in DATABASE_URL NEXTAUTH_SECRET NEXTAUTH_URL; do
  if [ -z "${!VAR}" ]; then
    echo "ERROR: Required env var $VAR is not set!"
    exit 1
  fi
done
echo "Environment OK"

echo "==> [1/6] Syncing code..."
git fetch origin main
git reset --hard origin/main
# Сохраняем только .env*, ecosystem.config.js и node_modules
git clean -fd \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='ecosystem.config.js' \
  --exclude='node_modules' \
  --exclude='package-lock.json'

echo "==> [2/6] Installing packages..."
# Устанавливаем только prod-зависимости, кроме тех что нужны для сборки
npm ci --legacy-peer-deps

echo "==> [3/6] Prisma migrations..."
npx prisma migrate deploy

echo "==> [4/6] Building..."
rm -rf .next
npm run build

echo "==> [5/6] Verifying build..."
if [ ! -f ".next/BUILD_ID" ]; then
  echo "ERROR: Build failed — .next/BUILD_ID missing"
  exit 1
fi
echo "Build OK: $(cat .next/BUILD_ID)"

echo "==> [6/6] Restarting..."
pm2 restart gameplaza-web --update-env

# Перезапускаем worker с проверкой результата
if pm2 restart gameplaza-worker --update-env 2>/dev/null; then
  echo "Worker restarted OK"
else
  echo "WARNING: gameplaza-worker not found or failed to restart"
fi

echo ""
echo "Done! Site is live at https://gameplaza.site"
