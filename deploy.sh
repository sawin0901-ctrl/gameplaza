#!/bin/bash
# Safe deployment script — backs up current build, restores on failure
set -e

DEPLOY_DIR="/var/www/gameplaza"
NEXT_DIR="$DEPLOY_DIR/.next"
BACKUP_DIR="$DEPLOY_DIR/.next.bak"
LOG_FILE="/var/log/gameplaza-deploy.log"
LOCK_FILE="/tmp/gameplaza-deploy.lock"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Prevent concurrent deploys
if [ -f "$LOCK_FILE" ]; then
  log "ERROR: Another deploy is already running (lock file exists). Aborting."
  exit 1
fi
touch "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

cd "$DEPLOY_DIR"

log "=== Starting deployment ==="

# 1. Pull latest code
log "Pulling latest code..."
git pull origin main

# 2. Install any new dependencies
log "Installing dependencies..."
npm ci --prefer-offline 2>/dev/null || npm install

# 3. Back up current working build
if [ -d "$NEXT_DIR" ]; then
  log "Backing up current .next to .next.bak..."
  rm -rf "$BACKUP_DIR"
  cp -r "$NEXT_DIR" "$BACKUP_DIR"
fi

# 4. Build
log "Building..."
if npm run build; then
  log "Build succeeded!"
  # 5. Restart PM2
  pm2 restart gameplaza-web gameplaza-worker
  log "PM2 restarted."
  # 6. Remove backup (build was good)
  rm -rf "$BACKUP_DIR"
  log "=== Deployment successful ==="
else
  log "ERROR: Build FAILED!"
  # Restore backup if it exists
  if [ -d "$BACKUP_DIR" ]; then
    log "Restoring previous build from backup..."
    rm -rf "$NEXT_DIR"
    mv "$BACKUP_DIR" "$NEXT_DIR"
    pm2 restart gameplaza-web gameplaza-worker
    log "Previous build restored. Site is still running on old version."
  else
    log "WARNING: No backup available. Site may be broken."
  fi
  exit 1
fi