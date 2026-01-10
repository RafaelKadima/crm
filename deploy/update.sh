#!/bin/bash

# ==================================================
# CRM OMNIFY - UPDATE/DEPLOY SCRIPT
# ==================================================
# Execute no servidor: bash /var/www/crm/deploy/update.sh

set -e

echo "🚀 Iniciando update do CRM Omnify..."

cd /var/www/crm

# 1. Pull latest code
echo "📥 Baixando atualizacoes..."
git pull origin main

# 2. Build frontend
echo "🎨 Compilando Frontend..."
cd frontend
npm install --legacy-peer-deps
npx vite build
cd ..

# 3. Copy build to nginx volume
echo "📁 Copiando build..."
cp -r frontend/dist/* /var/www/crm/frontend/dist/ 2>/dev/null || true

# 4. Update PHP dependencies (if needed)
echo "📦 Atualizando dependencias PHP..."
docker compose exec -T php composer install --no-dev --optimize-autoloader

# 5. Run migrations (if any)
echo "🗃️ Executando migrations..."
docker compose exec -T php php artisan migrate --force

# 6. Clear caches
echo "🧹 Limpando caches..."
docker compose exec -T php php artisan config:cache
docker compose exec -T php php artisan route:cache
docker compose exec -T php php artisan view:cache

# 7. Restart containers to pick up changes
echo "🔄 Reiniciando containers..."
docker compose restart nginx php queue

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║              ✅ UPDATE CONCLUIDO!                    ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  🌐 Acesse: https://crm.omnify.center                ║"
echo "║  💡 Limpe o cache do navegador (Ctrl+Shift+R)        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

docker compose ps
