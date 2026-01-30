#!/bin/bash

# ==================================================
# CRM OMNIFY - INSTALAÇÃO COMPLETA
# ==================================================
# Cole este script inteiro na VPS após conectar via SSH

set -e

echo "🚀 Iniciando instalação do CRM Omnify..."

# Criar diretório se não existir
mkdir -p /var/www/crm
cd /var/www/crm

# ==================================================
# 1. CRIAR .env DO LARAVEL
# ==================================================
echo "📝 Criando .env do Laravel..."

cat > .env << 'ENVFILE'
# ==================================================
# CRM OMNIFY - PRODUÇÃO (VPS + SUPABASE + REVERB)
# ==================================================

APP_NAME="CRM Omnify"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_TIMEZONE=America/Sao_Paulo
APP_URL=https://crm.omnify.center
APP_LOCALE=pt_BR

# Database - Supabase PostgreSQL (Externo)
DB_CONNECTION=pgsql
DB_HOST=aws-0-sa-east-1.pooler.supabase.com
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres.psxxeizqtwiizxozisqz
DB_PASSWORD=Motochefe2025@

# Redis (Docker Local)
REDIS_CLIENT=phpredis
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379
REDIS_DB=0
REDIS_CACHE_DB=1

CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

# Broadcasting - Laravel Reverb
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=crm-omnify
REVERB_APP_KEY=crm-omnify-reverb-key-2024
REVERB_APP_SECRET=gMmBDXkDg20g5LLXaeY63w16w4hikk8ZndqQUepivLo=
REVERB_HOST=reverb
REVERB_PORT=8080
REVERB_SCHEME=http

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="crm.omnify.center"
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https

# OpenAI
OPENAI_API_KEY=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
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_DEFAULT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=nova
OPENAI_AUDIO_THRESHOLD=500
USD_BRL_EXCHANGE_RATE=6.0

# AI Agent Service
AI_AGENT_URL=http://ai-service:8001
AI_AGENT_API_KEY=gMmBDXkDg20g5LLXaeY63w16w4hikk8ZndqQUepivLo=
AI_AGENT_TIMEOUT=30
INTERNAL_API_KEY=gMmBDXkDg20g5LLXaeY63w16w4hikk8ZndqQUepivLo=

# AWS S3
FILESYSTEM_DISK=local
MEDIA_DISK=media
AWS_ACCESS_KEY_ID=AKIA4LIPP2DNPEFNRCVM
AWS_SECRET_ACCESS_KEY=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
AWS_DEFAULT_REGION=sa-east-1
AWS_BUCKET=meu-crm-storage
MEDIA_DISK_DRIVER=s3
MEDIA_AWS_ACCESS_KEY_ID=AKIA4LIPP2DNPEFNRCVM
MEDIA_AWS_SECRET_ACCESS_KEY=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
MEDIA_AWS_DEFAULT_REGION=sa-east-1
MEDIA_AWS_BUCKET=meu-crm-storage

# WhatsApp
WHATSAPP_VERIFY_TOKEN=crm_whatsapp_verify_token
WHATSAPP_API_VERSION=v18.0

# Instagram
INSTAGRAM_VERIFY_TOKEN=crm_instagram_verify_token
INSTAGRAM_API_VERSION=v18.0

# Mail
MAIL_MAILER=log
MAIL_FROM_ADDRESS="noreply@omnify.center"
MAIL_FROM_NAME="${APP_NAME}"

# Logging
LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=error
ENVFILE

echo "✅ .env criado"

# ==================================================
# 2. CRIAR .env DO AI SERVICE
# ==================================================
echo "📝 Criando .env do AI Service..."

mkdir -p ai-service

cat > ai-service/.env << 'AIENVFILE'
APP_NAME="CRM Omnify AI Agent"
DEBUG=false
API_KEY=gMmBDXkDg20g5LLXaeY63w16w4hikk8ZndqQUepivLo=

OPENAI_API_KEY=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
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

DATABASE_URL=postgresql+asyncpg://postgres.psxxeizqtwiizxozisqz:Motochefe2025%40@aws-0-sa-east-1.pooler.supabase.com:5432/postgres

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

LARAVEL_API_URL=http://nginx
LARAVEL_API_KEY=
LARAVEL_INTERNAL_KEY=gMmBDXkDg20g5LLXaeY63w16w4hikk8ZndqQUepivLo=

QUEUE_MAX_WAIT_TIME=5
QUEUE_MIN_GAP_TIME=3
QUEUE_CHECK_INTERVAL=1
RAG_TOP_K=10
RAG_SIMILARITY_THRESHOLD=0.7
SHORT_TERM_MEMORY_LIMIT=20
LONG_TERM_MEMORY_LIMIT=50
LEAD_CLASSIFICATION_THRESHOLD=0.7
AIENVFILE

echo "✅ ai-service/.env criado"

# ==================================================
# 3. CRIAR DOCKER-COMPOSE.YML
# ==================================================
echo "📝 Criando docker-compose.yml..."

cat > docker-compose.yml << 'DOCKERCOMPOSE'
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: crm-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./:/var/www/crm
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/sites:/etc/nginx/conf.d:ro
      - ./docker/nginx/ssl:/etc/nginx/ssl:ro
      - ./frontend/dist:/var/www/frontend:ro
    depends_on:
      - php
      - ai-service
      - reverb
    networks:
      - crm-network

  php:
    build:
      context: .
      dockerfile: docker/php/Dockerfile
    container_name: crm-php
    restart: unless-stopped
    working_dir: /var/www/crm
    volumes:
      - ./:/var/www/crm
      - ./docker/php/php.ini:/usr/local/etc/php/conf.d/custom.ini:ro
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - crm-network

  reverb:
    build:
      context: .
      dockerfile: docker/php/Dockerfile
    container_name: crm-reverb
    restart: unless-stopped
    working_dir: /var/www/crm
    command: php artisan reverb:start --host=0.0.0.0 --port=8080
    volumes:
      - ./:/var/www/crm
    depends_on:
      - redis
    networks:
      - crm-network

  queue:
    build:
      context: .
      dockerfile: docker/php/Dockerfile
    container_name: crm-queue
    restart: unless-stopped
    working_dir: /var/www/crm
    command: php artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
    volumes:
      - ./:/var/www/crm
    depends_on:
      - php
      - redis
    networks:
      - crm-network

  scheduler:
    build:
      context: .
      dockerfile: docker/php/Dockerfile
    container_name: crm-scheduler
    restart: unless-stopped
    working_dir: /var/www/crm
    command: sh -c "while true; do php artisan schedule:run --verbose --no-interaction; sleep 60; done"
    volumes:
      - ./:/var/www/crm
    depends_on:
      - php
      - redis
    networks:
      - crm-network

  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile
    container_name: crm-ai-service
    restart: unless-stopped
    env_file:
      - ./ai-service/.env
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - crm-network

  redis:
    image: redis:7-alpine
    container_name: crm-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - crm-network

volumes:
  redis_data:
    driver: local

networks:
  crm-network:
    driver: bridge
DOCKERCOMPOSE

echo "✅ docker-compose.yml criado"

# ==================================================
# 4. CRIAR ESTRUTURA DOCKER
# ==================================================
echo "📝 Criando estrutura Docker..."

mkdir -p docker/php docker/nginx/sites docker/nginx/ssl

# PHP Dockerfile
cat > docker/php/Dockerfile << 'PHPDOCKERFILE'
FROM php:8.2-fpm-alpine

RUN apk add --no-cache \
    git curl libpng-dev libxml2-dev zip unzip \
    postgresql-dev icu-dev oniguruma-dev \
    freetype-dev libjpeg-turbo-dev libzip-dev

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo pdo_pgsql pgsql mbstring exif pcntl bcmath gd intl xml zip opcache

RUN apk add --no-cache $PHPIZE_DEPS \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/crm

RUN chown -R www-data:www-data /var/www/crm

EXPOSE 9000
CMD ["php-fpm"]
PHPDOCKERFILE

# PHP.ini
cat > docker/php/php.ini << 'PHPINI'
memory_limit = 256M
max_execution_time = 120
upload_max_filesize = 50M
post_max_size = 50M
opcache.enable = 1
opcache.memory_consumption = 128
date.timezone = America/Sao_Paulo
expose_php = Off
display_errors = Off
log_errors = On
PHPINI

# Nginx main config
cat > docker/nginx/nginx.conf << 'NGINXCONF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 50M;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    include /etc/nginx/conf.d/*.conf;
}
NGINXCONF

# Nginx site config
cat > docker/nginx/sites/default.conf << 'NGINXSITE'
upstream php-fpm { server php:9000; }
upstream ai-service { server ai-service:8001; }
upstream reverb { server reverb:8080; }

server {
    listen 80;
    server_name crm.omnify.center _;
    root /var/www/crm/public;
    index index.php index.html;
    charset utf-8;
    client_max_body_size 50M;

    location /app {
        proxy_pass http://reverb;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 60s;
    }

    location /apps {
        proxy_pass http://reverb;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 60s;
    }

    location /api { try_files $uri $uri/ /index.php?$query_string; }
    location /broadcasting { try_files $uri $uri/ /index.php?$query_string; }
    location /sanctum { try_files $uri $uri/ /index.php?$query_string; }
    location /oauth { try_files $uri $uri/ /index.php?$query_string; }

    location /ai/ {
        proxy_pass http://ai-service/;
        proxy_set_header Host $host;
        proxy_read_timeout 300s;
    }

    location ~ \.php$ {
        fastcgi_pass php-fpm;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 300;
    }

    location /assets {
        alias /var/www/frontend/assets;
        expires 1y;
        access_log off;
    }

    location /storage {
        alias /var/www/crm/storage/app/public;
        expires 7d;
    }

    location / {
        root /var/www/frontend;
        try_files $uri $uri/ /index.html;
    }

    location ~ /\.env { deny all; }
}
NGINXSITE

echo "✅ Estrutura Docker criada"

# ==================================================
# 5. VERIFICAR/INSTALAR DOCKER
# ==================================================
echo "🐳 Verificando Docker..."

if ! command -v docker &> /dev/null; then
    echo "Instalando Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

docker --version
docker compose version

# ==================================================
# 6. VERIFICAR/INSTALAR NODE.JS
# ==================================================
echo "📦 Verificando Node.js..."

if ! command -v node &> /dev/null; then
    echo "Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

node --version

# ==================================================
# 7. CLONAR REPOSITÓRIO (se não existir código)
# ==================================================
if [ ! -f "composer.json" ]; then
    echo "📥 Clonando repositório..."
    cd /var/www
    rm -rf crm
    git clone https://github.com/RafaelKadima/crm.git crm
    cd crm
    # Recriar os arquivos .env que foram sobrescritos
    cat > .env << 'ENVFILE2'
APP_NAME="CRM Omnify"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_TIMEZONE=America/Sao_Paulo
APP_URL=https://crm.omnify.center
APP_LOCALE=pt_BR
DB_CONNECTION=pgsql
DB_HOST=aws-0-sa-east-1.pooler.supabase.com
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres.psxxeizqtwiizxozisqz
DB_PASSWORD=Motochefe2025@
REDIS_CLIENT=phpredis
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379
REDIS_DB=0
REDIS_CACHE_DB=1
CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=crm-omnify
REVERB_APP_KEY=crm-omnify-reverb-key-2024
REVERB_APP_SECRET=gMmBDXkDg20g5LLXaeY63w16w4hikk8ZndqQUepivLo=
REVERB_HOST=reverb
REVERB_PORT=8080
REVERB_SCHEME=http
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="crm.omnify.center"
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
OPENAI_API_KEY=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
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_DEFAULT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
AI_AGENT_URL=http://ai-service:8001
AI_AGENT_API_KEY=gMmBDXkDg20g5LLXaeY63w16w4hikk8ZndqQUepivLo=
AI_AGENT_TIMEOUT=30
INTERNAL_API_KEY=gMmBDXkDg20g5LLXaeY63w16w4hikk8ZndqQUepivLo=
FILESYSTEM_DISK=local
MEDIA_DISK=media
AWS_ACCESS_KEY_ID=AKIA4LIPP2DNPEFNRCVM
AWS_SECRET_ACCESS_KEY=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
AWS_DEFAULT_REGION=sa-east-1
AWS_BUCKET=meu-crm-storage
MEDIA_DISK_DRIVER=s3
WHATSAPP_VERIFY_TOKEN=crm_whatsapp_verify_token
MAIL_MAILER=log
LOG_CHANNEL=stack
LOG_LEVEL=error
ENVFILE2
fi

# ==================================================
# 8. COMPILAR FRONTEND
# ==================================================
echo "🎨 Compilando Frontend..."
cd /var/www/crm/frontend
npm install --legacy-peer-deps
npm run build
cd /var/www/crm

# ==================================================
# 9. BUILDAR E SUBIR CONTAINERS
# ==================================================
echo "🐳 Buildando imagens Docker..."
docker compose build

echo "🚀 Subindo containers..."
docker compose up -d

echo "⏳ Aguardando containers..."
sleep 15

# ==================================================
# 10. CONFIGURAR LARAVEL
# ==================================================
echo "⚙️ Configurando Laravel..."

docker compose exec -T php composer install --no-dev --optimize-autoloader || true
docker compose exec -T php php artisan key:generate --force
docker compose exec -T php php artisan config:cache
docker compose exec -T php php artisan route:cache
docker compose exec -T php php artisan view:cache
docker compose exec -T php php artisan migrate --force
docker compose exec -T php php artisan passport:install --force || true
docker compose exec -T php php artisan storage:link || true

# Permissões
docker compose exec -T php chown -R www-data:www-data /var/www/crm/storage
docker compose exec -T php chmod -R 775 /var/www/crm/storage

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║              ✅ INSTALAÇÃO CONCLUÍDA!                ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║                                                      ║"
echo "║  🌐 Acesse: http://crm.omnify.center                 ║"
echo "║                                                      ║"
echo "║  📋 Status dos containers:                           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

docker compose ps

