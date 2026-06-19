#!/bin/bash
set -e
cd /var/www/gameplaza

echo "==> Syncing code..."
git fetch origin main
git checkout -- .
git pull origin main

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
