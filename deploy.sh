#!/bin/bash
set -e
cd /var/www/gameplaza

echo "==> [1/6] Syncing code..."
git fetch origin main
git reset --hard origin/main
git clean -fd \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='ecosystem.config.js' \
  --exclude='node_modules'

echo "==> [2/6] Installing packages..."
npm install --include=dev

echo "==> [3/6] Prisma..."
npx prisma db push

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
pm2 restart gameplaza-worker --update-env 2>/dev/null || true

echo ""
echo "✅ Done! Site is live at https://gameplaza.site"
