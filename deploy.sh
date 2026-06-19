#!/bin/bash
set -e
cd /var/www/gameplaza

echo "==> Syncing code..."
git fetch origin main
git reset --hard origin/main
git clean -fd --exclude='.env' --exclude='.env.local' --exclude='ecosystem.config.js'

echo "==> Installing packages..."
npm install

echo "==> Prisma..."
npx prisma db push

echo "==> Building..."
rm -rf .next
npm run build

echo "==> Restarting..."
pm2 restart gameplaza-web --update-env

echo "==> Done! Site is live."
