# Guia de Deploy - OmniFy HUB CRM

> Guia completo para deploy sem erros, incluindo setup inicial, atualizações, reinicialização do Nginx e troubleshooting.

---

## Dados da VPS

| Campo | Valor |
|-------|-------|
| **IP** | 212.85.20.129 |
| **Usuário** | root |
| **Domínio** | crm.omnify.center |

---

## Arquitetura dos Containers

```
Internet (80/443)
       │
   [crm-nginx]         ← Reverse proxy, SSL, arquivos estáticos
       │
  ┌────┼────────────┬──────────────┐
  │    │            │              │
[crm-php]    [crm-reverb]   [crm-ai-service]
Laravel API   WebSocket      Python/FastAPI
  │    │            │
  │  [crm-queue]    │
  │  Jobs background│
  │    │            │
  │  [crm-scheduler]│
  │  Tarefas cron   │
  │                 │
  └──[crm-redis]────┘       [crm-whatsapp-api]
     Cache/Filas              Go/Whatsmeow
```

| Container | Porta | Função |
|-----------|-------|--------|
| `crm-nginx` | 80, 443 | Reverse proxy, SSL, static files |
| `crm-php` | 9000 (interno) | Laravel API |
| `crm-reverb` | 8080 (interno) | WebSocket (tempo real) |
| `crm-queue` | - | Queue worker (Redis) |
| `crm-scheduler` | - | Tarefas agendadas |
| `crm-ai-service` | 8001 (interno) | Agentes IA |
| `crm-redis` | 6379 (interno) | Cache, filas, sessões |
| `crm-whatsapp-api` | 3000 (interno) | WhatsApp interno |

**Banco de dados:** PostgreSQL externo (Supabase)

### Ordem de Inicialização

```
1. redis            ← sem dependências (healthcheck: redis-cli ping)
2. php              ← depende: redis healthy
3. reverb           ← depende: php started + redis healthy
4. queue            ← depende: php started + redis healthy
5. scheduler        ← depende: php started + redis healthy
6. ai-service       ← depende: redis healthy
7. nginx            ← depende: php + reverb + ai-service
8. whatsapp-api     ← depende: nginx started
```

`docker compose up -d` já respeita essa ordem automaticamente.

---

## 1. Conectar na VPS

```bash
ssh root@212.85.20.129
cd /var/www/crm
```

---

## 2. Deploy de Atualizações (dia a dia)

### Comando Único (mais usado)

```bash
cd /var/www/crm && git pull origin main && cd frontend && npm install --legacy-peer-deps && npm run build && cd .. && docker compose exec -T php composer install --no-dev --optimize-autoloader && docker compose exec -T php php artisan migrate --force && docker compose exec -T php php artisan config:cache && docker compose exec -T php php artisan route:cache && docker compose exec -T php php artisan view:cache && docker compose restart nginx php queue reverb scheduler
```

### Via Makefile

```bash
make deploy
```

### Via Script

```bash
bash deploy/update.sh
```

### Passo a Passo (para entender cada etapa)

```bash
cd /var/www/crm

# 1. Baixar código atualizado
git pull origin main

# 2. Compilar frontend
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..

# 3. Atualizar dependências PHP
docker compose exec -T php composer install --no-dev --optimize-autoloader

# 4. Rodar migrations
docker compose exec -T php php artisan migrate --force

# 5. Reconstruir caches do Laravel
docker compose exec -T php php artisan config:cache
docker compose exec -T php php artisan route:cache
docker compose exec -T php php artisan view:cache

# 6. Reiniciar containers
docker compose restart nginx php queue reverb scheduler

# 7. Verificar status
docker compose ps
```

---

## 3. Deploy Parcial (apenas o que mudou)

### Apenas Frontend

```bash
cd /var/www/crm/frontend
npm install --legacy-peer-deps
npm run build
cd ..
docker compose restart nginx
```

### Apenas Backend PHP

```bash
cd /var/www/crm
docker compose exec -T php composer install --no-dev --optimize-autoloader
docker compose exec -T php php artisan migrate --force
docker compose exec -T php php artisan config:cache
docker compose exec -T php php artisan route:cache
docker compose exec -T php php artisan view:cache
docker compose restart php queue scheduler
```

### Apenas AI Service

```bash
cd /var/www/crm
docker compose build ai-service
docker compose up -d ai-service
```

### Apenas WhatsApp API

```bash
cd /var/www/crm
docker compose build whatsapp-api
docker compose up -d whatsapp-api
```

---

## 4. Nginx - Reiniciar Sem Erros

### SEMPRE testar config antes de reiniciar

```bash
docker compose exec nginx nginx -t
```

Saída esperada:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

Se der erro, NÃO reinicie. Corrija o arquivo antes.

### Reload sem downtime (preferível)

```bash
docker compose exec nginx nginx -s reload
```

Diferença entre reload e restart:
- **reload**: aplica config nova sem derrubar conexões existentes
- **restart**: derruba tudo e sobe de novo (breve downtime)

### Restart completo

```bash
docker compose restart nginx
```

### Se o Nginx não subir

```bash
# 1. Ver o erro
docker compose logs nginx --tail=50

# 2. Verificar se a porta está livre
netstat -tlnp | grep -E ':80|:443'

# 3. Se outra coisa estiver usando a porta
kill $(lsof -t -i:80) 2>/dev/null
kill $(lsof -t -i:443) 2>/dev/null

# 4. Subir novamente
docker compose up -d nginx
```

### Arquivos de config do Nginx

```
docker/nginx/
├── nginx.conf              # Config global (workers, gzip, buffers)
├── sites/default.conf      # Rotas HTTP/HTTPS, SSL, proxy rules
└── ssl/
    ├── fullchain.pem       # Certificado SSL
    └── privkey.pem         # Chave privada
```

---

## 5. Reiniciando Containers

### Reiniciar tudo

```bash
docker compose restart
```

### Reiniciar container específico

```bash
docker compose restart nginx       # Mudou config nginx
docker compose restart php         # Mudou .env ou código PHP
docker compose restart queue       # Mudou jobs/handlers
docker compose restart reverb      # Problemas de WebSocket
docker compose restart scheduler   # Mudou tarefas agendadas
docker compose restart ai-service  # Mudou código Python
docker compose restart redis       # CUIDADO: limpa filas em memória
```

### Quando restart não resolve: parar e recriar

```bash
# Um container
docker compose stop php && docker compose up -d php

# Todos
docker compose down && docker compose up -d
```

### Quando mudou o Dockerfile: rebuild

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## 6. SSL / HTTPS

### Setup inicial

```bash
chmod +x deploy/ssl-setup.sh
./deploy/ssl-setup.sh
```

### Renovar certificado (Let's Encrypt expira a cada 90 dias)

```bash
# 1. Parar nginx para liberar porta 80
docker compose stop nginx

# 2. Renovar
certbot renew

# 3. Copiar certificados atualizados
cp /etc/letsencrypt/live/crm.omnify.center/fullchain.pem /var/www/crm/docker/nginx/ssl/
cp /etc/letsencrypt/live/crm.omnify.center/privkey.pem /var/www/crm/docker/nginx/ssl/

# 4. Subir nginx
docker compose up -d nginx
```

### Renovação automática (adicionar ao crontab)

```bash
crontab -e
```

Adicionar:
```cron
0 3 1 */2 * cd /var/www/crm && docker compose stop nginx && certbot renew --quiet && cp /etc/letsencrypt/live/crm.omnify.center/fullchain.pem docker/nginx/ssl/ && cp /etc/letsencrypt/live/crm.omnify.center/privkey.pem docker/nginx/ssl/ && docker compose up -d nginx
```

---

## 7. Logs e Monitoramento

### Ver logs

```bash
# Todos (follow)
docker compose logs -f

# Container específico
docker compose logs -f nginx
docker compose logs -f php
docker compose logs -f queue
docker compose logs -f reverb
docker compose logs -f ai-service
docker compose logs -f whatsapp-api

# Últimas N linhas
docker compose logs --tail=100 php

# Logs de erro do Nginx
docker compose exec nginx cat /var/log/nginx/crm_error.log
```

### Status dos containers

```bash
docker compose ps
```

Saída esperada (todos `Up`):
```
NAME                STATUS          PORTS
crm-nginx           Up             0.0.0.0:80->80, 0.0.0.0:443->443
crm-php             Up             9000/tcp
crm-reverb          Up             8080/tcp
crm-queue           Up
crm-scheduler       Up
crm-ai-service      Up             8001/tcp
crm-redis           Up (healthy)   6379/tcp
crm-whatsapp-api    Up (healthy)   3000/tcp
```

### Uso de recursos

```bash
docker stats --no-stream
```

---

## 8. Troubleshooting

### Erro 502 Bad Gateway

```bash
# PHP-FPM caiu
docker compose logs php --tail=50
docker compose restart php
```

### Erro 504 Gateway Timeout

```bash
# Requisição excedeu timeout (300s no AI Service)
docker compose logs ai-service --tail=50
docker compose restart ai-service
```

### WebSocket não conecta

```bash
docker compose logs reverb --tail=50
docker compose restart reverb

# Verificar variáveis REVERB_*
grep REVERB .env
```

### Jobs não processam (fila parada)

```bash
# Ver logs do queue worker
docker compose logs queue --tail=50

# Reiniciar
docker compose restart queue

# Verificar Redis
docker compose exec redis redis-cli ping
# Deve retornar: PONG
```

### AI Service não responde

```bash
docker compose logs ai-service --tail=50
docker compose build ai-service && docker compose up -d ai-service
```

### Banco de dados inacessível

```bash
# Testar conexão
docker compose exec -T php php artisan db:monitor

# Verificar variáveis
docker compose exec php env | grep DB_

# Causas comuns:
# - IP do VPS não está no allowlist do Supabase
# - Senha expirou ou mudou
# - Supabase em manutenção
```

### Container reiniciando em loop

```bash
docker compose logs --tail=50 NOME_DO_CONTAINER

# Causas comuns:
# - .env com variável faltando
# - Banco inacessível
# - Redis não está healthy
```

### Frontend não atualiza após deploy

```bash
# Recompilar
cd /var/www/crm/frontend
npm install --legacy-peer-deps
npm run build
cd ..

# Reiniciar nginx
docker compose restart nginx

# Pedir para usuários: Ctrl+Shift+R no navegador
```

### Erro de permissão no storage

```bash
docker compose exec -T php chown -R www-data:www-data /var/www/crm/storage
docker compose exec -T php chmod -R 775 /var/www/crm/storage
```

### Redis sem memória

```bash
# Verificar uso
docker compose exec redis redis-cli INFO memory

# Limpar apenas cache (preserva filas)
docker compose exec -T php php artisan cache:clear

# Limpar TUDO no Redis (CUIDADO: perde filas e sessões)
docker compose exec redis redis-cli FLUSHALL
```

---

## 9. Comandos Rápidos (Makefile)

| Comando | Descrição |
|---------|-----------|
| `make help` | Lista todos os comandos |
| `make setup` | Setup inicial (primeira vez) |
| `make ssl` | Configurar SSL |
| `make deploy` | Deploy completo |
| `make build` | Rebuild imagens Docker |
| `make up` | Subir containers |
| `make down` | Parar containers |
| `make restart` | Reiniciar todos |
| `make logs` | Ver logs (follow) |
| `make ps` | Status dos containers |
| `make shell` | Shell no container PHP |
| `make migrate` | Rodar migrations |
| `make cache` | Limpar e reconstruir caches |
| `make queue-restart` | Reiniciar queue worker |
| `make queue-logs` | Logs do queue |
| `make reverb-logs` | Logs do WebSocket |
| `make ai-logs` | Logs do AI Service |
| `make frontend-build` | Compilar frontend |
| `make clean` | Limpar Docker (prune) |

---

## 10. Instalação do Zero (primeira vez)

### 10.1 - Atualizar servidor

```bash
apt update && apt upgrade -y
apt install -y git curl
```

### 10.2 - Instalar Docker

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

### 10.3 - Instalar Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### 10.4 - Clonar repositório

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/RafaelKadima/crm.git crm
cd crm
```

### 10.5 - Configurar variáveis de ambiente

```bash
cp deploy/env.production .env
cp deploy/ai-service.env ai-service/.env
```

Editar `.env` e `ai-service/.env` com as credenciais corretas.

### 10.6 - Compilar Frontend

```bash
cd /var/www/crm/frontend
npm install --legacy-peer-deps
npm run build
cd /var/www/crm
```

### 10.7 - Subir Docker

```bash
docker compose build
docker compose up -d
sleep 15
```

### 10.8 - Configurar Laravel

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

### 10.9 - Configurar SSL

```bash
chmod +x deploy/ssl-setup.sh
./deploy/ssl-setup.sh
```

### 10.10 - Verificar

```bash
docker compose ps
```

---

## 11. Checklist de Deploy

### Antes
- [ ] Código testado localmente
- [ ] Commit e push no GitHub
- [ ] Sem segredos expostos no commit

### Durante
- [ ] `git pull` sem conflitos
- [ ] Frontend compilou sem erros
- [ ] Migrations rodaram sem erros
- [ ] Caches reconstruídos
- [ ] Containers reiniciados

### Depois
- [ ] `docker compose ps` → todos containers `Up`
- [ ] https://crm.omnify.center carrega
- [ ] Login funciona
- [ ] WebSocket conecta (mensagens em tempo real)
- [ ] Testar mensagem no WhatsApp
- [ ] `docker compose logs --tail=50` sem erros

---

## URLs

| Serviço | URL |
|---------|-----|
| Frontend | https://crm.omnify.center |
| API | https://crm.omnify.center/api |
| AI Service | https://crm.omnify.center/ai |
