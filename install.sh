#!/bin/bash
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[OK]${NC} $1"; }
info() { echo -e "${BLUE}[i]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[X]${NC} $1"; exit 1; }

echo ""
echo "=============================================="
echo "     GamePlaza — Установка на VPS"
echo "=============================================="
echo ""

read -p "Домен (без https://, напр. gameplaza.site): " DOMAIN
[[ -z "$DOMAIN" ]] && err "Домен не может быть пустым"

read -p "Email для SSL-сертификата: " SSL_EMAIL
[[ -z "$SSL_EMAIL" ]] && err "Email не может быть пустым"

read -p "Digiseller Seller ID: " DIGISELLER_SELLER_ID
read -p "Digiseller API Key: " DIGISELLER_API_KEY

DB_PASS=$(openssl rand -hex 16)
NEXTAUTH_SECRET=$(openssl rand -hex 32)
ADMIN_SECRET=$(openssl rand -hex 24)

info "Начинаю установку..."

# 1. Обновление системы
log "Обновление пакетов..."
apt-get update -qq && apt-get upgrade -y -qq

# 2. Базовые утилиты
log "Установка утилит..."
apt-get install -y -qq curl git wget unzip build-essential ufw

# 3. Node.js 20
log "Установка Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt-get install -y -qq nodejs

# 4. PostgreSQL
log "Установка PostgreSQL..."
apt-get install -y -qq postgresql postgresql-contrib
systemctl enable postgresql && systemctl start postgresql
sudo -u postgres psql -c "CREATE USER gameplaza WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE gameplaza OWNER gameplaza;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gameplaza TO gameplaza;" 2>/dev/null || true

# 5. Redis
log "Установка Redis..."
apt-get install -y -qq redis-server
systemctl enable redis-server && systemctl start redis-server

# 6. PM2
log "Установка PM2..."
npm install -g pm2 -q
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

# 7. Nginx
log "Установка Nginx..."
apt-get install -y -qq nginx certbot python3-certbot-nginx
systemctl enable nginx

# 8. Клонирование
log "Клонирование репозитория..."
mkdir -p /var/www && cd /var/www
[ -d gameplaza ] && mv gameplaza gameplaza.bak.$(date +%s)
git clone https://github.com/sawin0901-ctrl/gameplaza.git
cd gameplaza

# 9. .env.local
log "Создание .env.local..."
cat > .env.local << ENVEOF
DATABASE_URL="postgresql://gameplaza:${DB_PASS}@localhost:5432/gameplaza"
REDIS_URL="redis://localhost:6379"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXTAUTH_URL="https://${DOMAIN}"
DIGISELLER_SELLER_ID="${DIGISELLER_SELLER_ID}"
DIGISELLER_API_KEY="${DIGISELLER_API_KEY}"
NEXT_PUBLIC_SITE_URL="https://${DOMAIN}"
NEXT_PUBLIC_DIGISELLER_SELLER_ID="${DIGISELLER_SELLER_ID}"
ADMIN_SECRET="${ADMIN_SECRET}"
NODE_ENV="production"
ENVEOF

# 10. Зависимости
log "Установка npm зависимостей..."
npm install

# 11. Prisma
log "Применение схемы БД..."
npx prisma generate
npx prisma db push --accept-data-loss

# 12. Сборка
log "Сборка Next.js (2-3 минуты)..."
npm run build

# 13. PM2 конфиг
log "Настройка PM2..."
mkdir -p /var/log/gameplaza
cat > /var/www/gameplaza/ecosystem.config.js << PMEOF
module.exports = {
  apps: [
    {
      name: 'gameplaza-web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/var/www/gameplaza',
      env_file: '/var/www/gameplaza/.env.local',
      autorestart: true,
      max_memory_restart: '512M',
      error_file: '/var/log/gameplaza/web-error.log',
      out_file: '/var/log/gameplaza/web-out.log',
    },
    {
      name: 'gameplaza-worker',
      script: 'src/workers/import-worker.ts',
      interpreter: 'node_modules/.bin/tsx',
      cwd: '/var/www/gameplaza',
      env_file: '/var/www/gameplaza/.env.local',
      autorestart: true,
      max_memory_restart: '256M',
      error_file: '/var/log/gameplaza/worker-error.log',
      out_file: '/var/log/gameplaza/worker-out.log',
    },
  ],
}
PMEOF

pm2 start /var/www/gameplaza/ecosystem.config.js
pm2 save

# 14. Nginx конфиг
log "Настройка Nginx..."
cat > /etc/nginx/sites-available/gameplaza << NGEOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    client_max_body_size 10M;
}
NGEOF

ln -sf /etc/nginx/sites-available/gameplaza /etc/nginx/sites-enabled/gameplaza
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 15. SSL
log "Получение SSL-сертификата..."
certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos -m ${SSL_EMAIL} \
  && log "SSL установлен!" \
  || warn "SSL не удалось. После настройки DNS запусти: certbot --nginx -d ${DOMAIN}"

# 16. Firewall
log "Настройка файрвола..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# 17. Cron
log "Настройка cron..."
(crontab -l 2>/dev/null; echo "0 9 * * * curl -s -X POST https://${DOMAIN}/api/import/run -H 'x-admin-secret: ${ADMIN_SECRET}' > /dev/null") | crontab -
(crontab -l 2>/dev/null; echo "*/30 * * * * curl -s -X POST https://${DOMAIN}/api/products/sync -H 'x-admin-secret: ${ADMIN_SECRET}' > /dev/null") | crontab -

# Итог
echo ""
echo "=============================================="
echo "    GamePlaza успешно установлен!"
echo "=============================================="
echo ""
echo "  Сайт:        https://${DOMAIN}"
echo "  Мониторинг:  https://${DOMAIN}/admin/monitoring"
echo ""
echo "  !! СОХРАНИ ЭТИ ДАННЫЕ !!"
echo "  DB пароль:    ${DB_PASS}"
echo "  Admin secret: ${ADMIN_SECRET}"
echo ""
echo "  Полезные команды:"
echo "  pm2 logs gameplaza-web     # логи сайта"
echo "  pm2 logs gameplaza-worker  # логи воркера"
echo "  pm2 status                 # статус процессов"
echo ""
