# Guia de Deploy - OmniFy HUB CRM

## Dados da VPS

| Campo | Valor |
|-------|-------|
| **IP** | 212.85.20.129 |
| **Usuário** | root |
| **Senha** | Motochefe2025@ |
| **Domínio** | crm.omnify.center |

---

## PASSO 1: Conectar na VPS

```bash
ssh root@212.85.20.129
```

Senha: `Motochefe2025@`

---

## PASSO 2: Atualização Rápida (sistema já instalado)

Se o sistema já está rodando e você só quer atualizar com as últimas mudanças:

```bash
cd /var/www/crm && git pull origin main && cd frontend && npm install --legacy-peer-deps && npm run build && cd .. && docker compose exec php php artisan migrate --force && docker compose restart
```

**Pronto!** Sistema atualizado.

---

## PASSO 3: Instalação Completa (primeira vez)

### 3.1 - Atualizar servidor

```bash
apt update && apt upgrade -y
apt install -y git curl
```

### 3.2 - Instalar Docker

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

### 3.3 - Instalar Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### 3.4 - Clonar repositório

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/RafaelKadima/crm.git crm
cd crm
```

### 3.5 - Criar .env do Laravel

```bash
cat > .env << 'EOF'
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

LOG_CHANNEL=stack
LOG_LEVEL=error
EOF
```

### 3.6 - Criar .env do AI Service

```bash
cat > ai-service/.env << 'EOF'
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
LARAVEL_INTERNAL_KEY=gMmBDXkDg20g5LLXaeY63w16w4hikk8ZndqQUepivLo=
EOF
```

### 3.7 - Compilar Frontend

```bash
cd /var/www/crm/frontend
npm install --legacy-peer-deps
npm run build
cd /var/www/crm
```

### 3.8 - Subir Docker

```bash
docker compose build
docker compose up -d
sleep 15
```

### 3.9 - Configurar Laravel

```bash
docker compose exec -T php composer install --no-dev --optimize-autoloader
docker compose exec -T php php artisan key:generate --force
docker compose exec -T php php artisan config:cache
docker compose exec -T php php artisan route:cache
docker compose exec -T php php artisan view:cache
docker compose exec -T php php artisan migrate --force
docker compose exec -T php php artisan passport:install --force
docker compose exec -T php php artisan storage:link
docker compose exec -T php chown -R www-data:www-data /var/www/crm/storage
docker compose exec -T php chmod -R 775 /var/www/crm/storage
```

---

## Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `docker compose ps` | Ver status containers |
| `docker compose logs -f` | Ver logs em tempo real |
| `docker compose restart` | Reiniciar tudo |
| `docker compose down` | Parar tudo |
| `docker compose exec php php artisan migrate --force` | Rodar migrations |
| `docker compose exec php php artisan cache:clear` | Limpar cache |

---

## URLs

| Serviço | URL |
|---------|-----|
| Frontend | https://crm.omnify.center |
| API | https://crm.omnify.center/api |
| AI Service | https://crm.omnify.center/ai |

---

## Troubleshooting

### Erro de permissão
```bash
docker compose exec php chown -R www-data:www-data /var/www/crm/storage
docker compose exec php chmod -R 775 /var/www/crm/storage
```

### Ver logs de erro
```bash
docker compose logs php
docker compose logs ai-service
```

### Rebuild completo
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```
