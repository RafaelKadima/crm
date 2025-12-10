#!/bin/bash

# ==================================================
# CRM OMNIFY - SCRIPT DE SETUP PARA VPS
# ==================================================
# Execute: chmod +x deploy/setup-vps.sh && ./deploy/setup-vps.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║           CRM OMNIFY - SETUP VPS                     ║"
echo "║           crm.omnify.center                          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Por favor, execute como root (sudo)${NC}"
    exit 1
fi

# Diretório do projeto
PROJECT_DIR="/var/www/crm"
cd $PROJECT_DIR

echo -e "${YELLOW}[1/8] Copiando arquivos de configuração...${NC}"
# Copiar .env de produção
cp deploy/env.production .env
cp deploy/ai-service.env ai-service/.env
echo -e "${GREEN}✓ Arquivos .env copiados${NC}"

echo -e "${YELLOW}[2/8] Verificando Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo "Docker não encontrado. Instalando..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi
docker --version
echo -e "${GREEN}✓ Docker OK${NC}"

echo -e "${YELLOW}[3/8] Verificando Docker Compose...${NC}"
if ! docker compose version &> /dev/null; then
    echo -e "${RED}Docker Compose não encontrado!${NC}"
    exit 1
fi
docker compose version
echo -e "${GREEN}✓ Docker Compose OK${NC}"

echo -e "${YELLOW}[4/8] Verificando Node.js para build do frontend...${NC}"
if ! command -v node &> /dev/null; then
    echo "Node.js não encontrado. Instalando..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
node --version
echo -e "${GREEN}✓ Node.js OK${NC}"

echo -e "${YELLOW}[5/8] Compilando Frontend React...${NC}"
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..
echo -e "${GREEN}✓ Frontend compilado${NC}"

echo -e "${YELLOW}[6/8] Buildando imagens Docker...${NC}"
docker compose build --no-cache
echo -e "${GREEN}✓ Imagens buildadas${NC}"

echo -e "${YELLOW}[7/8] Subindo containers...${NC}"
docker compose up -d
echo -e "${GREEN}✓ Containers rodando${NC}"

# Aguardar Redis ficar healthy
echo -e "${YELLOW}Aguardando Redis...${NC}"
sleep 10

echo -e "${YELLOW}[8/8] Configurando Laravel...${NC}"
# Gerar APP_KEY
docker compose exec -T php php artisan key:generate --force
# Otimizar
docker compose exec -T php php artisan config:cache
docker compose exec -T php php artisan route:cache
docker compose exec -T php php artisan view:cache
# Migrations
docker compose exec -T php php artisan migrate --force
# Passport
docker compose exec -T php php artisan passport:install --force || true
# Storage link
docker compose exec -T php php artisan storage:link || true
echo -e "${GREEN}✓ Laravel configurado${NC}"

echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║              ✅ SETUP CONCLUÍDO!                     ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Acesse: http://crm.omnify.center                    ║"
echo "║                                                      ║"
echo "║  Próximo passo: Configurar SSL com Certbot           ║"
echo "║  sudo certbot --nginx -d crm.omnify.center           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Mostrar status
docker compose ps

