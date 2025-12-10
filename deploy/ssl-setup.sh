#!/bin/bash

# ==================================================
# CRM OMNIFY - CONFIGURAÇÃO SSL (HTTPS)
# ==================================================
# Execute após o setup-vps.sh

set -e

DOMAIN="crm.omnify.center"

echo "╔══════════════════════════════════════════════════════╗"
echo "║           CRM OMNIFY - SETUP SSL                     ║"
echo "╚══════════════════════════════════════════════════════╝"

# Instalar Certbot se não existir
if ! command -v certbot &> /dev/null; then
    echo "Instalando Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Parar nginx temporariamente
echo "Parando Nginx..."
docker compose stop nginx

# Gerar certificado
echo "Gerando certificado SSL para ${DOMAIN}..."
certbot certonly --standalone -d ${DOMAIN} --non-interactive --agree-tos --email admin@omnify.center

# Copiar certificados para o projeto
echo "Copiando certificados..."
mkdir -p /var/www/crm/docker/nginx/ssl
cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem /var/www/crm/docker/nginx/ssl/
cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem /var/www/crm/docker/nginx/ssl/
chmod 644 /var/www/crm/docker/nginx/ssl/*.pem

# Atualizar nginx config para HTTPS
cat > /var/www/crm/docker/nginx/sites/default.conf << 'NGINX_CONF'
# ==================================================
# CRM OMNIFY - NGINX CONFIG (HTTPS + REVERB)
# ==================================================

upstream php-fpm {
    server php:9000;
}

upstream ai-service {
    server ai-service:8001;
}

upstream reverb {
    server reverb:8080;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name crm.omnify.center;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name crm.omnify.center;
    
    root /var/www/crm/public;
    index index.php index.html;

    # SSL
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    charset utf-8;
    client_max_body_size 50M;

    access_log /var/log/nginx/crm_access.log;
    error_log /var/log/nginx/crm_error.log;

    # WebSocket - Laravel Reverb
    location /app {
        proxy_pass http://reverb;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    location /apps {
        proxy_pass http://reverb;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # API Routes
    location /api {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location /broadcasting {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location /sanctum {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location /oauth {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # AI Service
    location /ai/ {
        proxy_pass http://ai-service/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    # PHP
    location ~ \.php$ {
        fastcgi_pass php-fpm;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_buffer_size 128k;
        fastcgi_buffers 4 256k;
        fastcgi_busy_buffers_size 256k;
        fastcgi_read_timeout 300;
    }

    # Frontend Assets
    location /assets {
        alias /var/www/frontend/assets;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Storage
    location /storage {
        alias /var/www/crm/storage/app/public;
        expires 7d;
        add_header Cache-Control "public";
    }

    # SPA Fallback
    location / {
        root /var/www/frontend;
        try_files $uri $uri/ /index.html;
    }

    # Security
    location ~ /\.(?!well-known).* {
        deny all;
    }

    location ~ /\.env {
        deny all;
    }
}
NGINX_CONF

# Subir nginx
echo "Iniciando Nginx com SSL..."
docker compose up -d nginx

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║              ✅ SSL CONFIGURADO!                     ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Acesse: https://crm.omnify.center                   ║"
echo "╚══════════════════════════════════════════════════════╝"

