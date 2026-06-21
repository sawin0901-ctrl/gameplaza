#!/bin/bash
# Safe deployment script — backs up .next, restores on build failure
set -euo pipefail

DEPLOY_DIR="/var/www/gameplaza"
NEXT_DIR="$DEPLOY_DIR/.next"
BACKUP_DIR="$DEPLOY_DIR/.next.bak"
LOG_FILE="/var/log/gameplaza-deploy.log"
LOCK_FILE="/tmp/gameplaza-deploy.lock"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# Prevent concurrent deploys
if [ -f "$LOCK_FILE" ]; then
  log "ERROR: Another deploy is running (lock file exists). Aborting."
  exit 1
fi
touch "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

cd "$DEPLOY_DIR"
log "=== Starting deployment ==="

# 1. Pull latest code
log "Pulling latest code..."
git pull origin main

# 2. Install deps ONLY if package.json changed in this pull
CHANGED=$(git diff HEAD~1 HEAD --name-only 2>/dev/null | grep "package.json" || true)
if [ -n "$CHANGED" ] || [ ! -d "node_modules" ]; then
  log "package.json changed or node_modules missing — installing deps..."
  npm install
  log "Deps installed."
else
  log "package.json unchanged — skipping npm install."
fi

# 3. Back up current working build
if [ -d "$NEXT_DIR" ]; then
  log "Backing up .next -> .next.bak ..."
  rm -rf "$BACKUP_DIR"
  cp -r "$NEXT_DIR" "$BACKUP_DIR"
fi

# 4. Build
log "Building..."
if npm run build 2>&1 | tee -a "$LOG_FILE"; then
  log "Build succeeded."
  # 5. Restart PM2
  pm2 restart gameplaza-web gameplaza-worker
  log "PM2 restarted."
  rm -rf "$BACKUP_DIR"
  log "=== Deployment successful ==="
else
  log "ERROR: Build FAILED."
  if [ -d "$BACKUP_DIR" ]; then
    log "Restoring previous build..."
    rm -rf "$NEXT_DIR"
    mv "$BACKUP_DIR" "$NEXT_DIR"
    pm2 restart gameplaza-web gameplaza-worker
    log "Old build restored — site is live on previous version."
  else
    log "WARNING: No backup — site may be broken."
  fi
  exit 1
fi