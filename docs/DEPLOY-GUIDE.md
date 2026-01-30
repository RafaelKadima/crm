# Guia de Deploy - OmniFy HUB CRM

> Guia completo para deploy sem erros, incluindo setup inicial, atualizações, reinicialização do Nginx e troubleshooting.

---

## Dados da VPS

| Campo | Valor |
|-------|-------|
| **IP** | 212.85.20.129 |
| **Usuário** | root |
| **Senha** | Motochefe2025@ |
| **Domínio** | crm.omnify.center |
| **Path** | /var/www/crm |
| **Git** | git@github.com:RafaelKadima/crm.git |

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

### Via SSH (com senha)

```bash
ssh root@212.85.20.129
# Senha: Motochefe2025@
cd /var/www/crm
```

### Via sshpass (sem digitar senha - útil para scripts e Claude Code)

```bash
# Instalar sshpass (macOS)
brew install hudochenkov/sshpass/sshpass

# Instalar sshpass (Ubuntu/Debian)
apt install -y sshpass

# Conectar
sshpass -p 'Motochefe2025@' ssh -o StrictHostKeyChecking=no root@212.85.20.129

# Executar comando direto (sem abrir sessão interativa)
sshpass -p 'Motochefe2025@' ssh -o StrictHostKeyChecking=no root@212.85.20.129 "cd /var/www/crm && docker compose ps"
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

> **IMPORTANTE:** Após recriar containers (`docker compose up -d`), SEMPRE reinicie o Nginx para atualizar os IPs Docker internos:
> ```bash
> docker compose restart nginx
> ```
> Se não fizer isso, o Nginx pode tentar conectar em IPs antigos dos containers, causando erro 502.

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

### WebSocket / Real-time não funciona (sem som, sem borda verde, sem notificações)

O real-time usa **Laravel Reverb** (WebSocket) com o **Pusher.js** no frontend. O fluxo é:

```
Mensagem recebida → PHP dispara evento → Reverb (WebSocket) → Browser (Echo/Pusher.js)
                                                                    ↓
                                                              Som + borda verde + notificação
```

**Há 3 camadas que podem falhar:**

#### Camada 1: PHP → Reverb (backend broadcasting)

```bash
# Verificar variável BROADCAST_CONNECTION (DEVE ser "reverb", NÃO "log" ou "null")
grep BROADCAST_CONNECTION .env
# Correto: BROADCAST_CONNECTION=reverb

# Verificar conexão PHP → Reverb
docker compose exec -T php env | grep REVERB
# Deve mostrar: REVERB_HOST=reverb, REVERB_PORT=8080, REVERB_SCHEME=http

docker compose exec -T queue env | grep REVERB
# Deve mostrar: REVERB_HOST=reverb, REVERB_PORT=8080, REVERB_SCHEME=http

# Testar disparo de evento
docker compose exec -T php php artisan tinker --execute='$msg = App\Models\TicketMessage::latest()->first(); $ticket = $msg->ticket; event(new App\Events\TicketMessageCreated($msg, $ticket)); echo "OK";'
# Se der erro "cURL error 7: Failed to connect" → PHP não alcança o Reverb
```

**Erro comum:** `.env` com `BROADCAST_CONNECTION=log` faz os eventos irem para o log ao invés do WebSocket.

**Correção:** `BROADCAST_CONNECTION=reverb` no `.env` + `php artisan config:clear`

#### Camada 2: Reverb (servidor WebSocket)

```bash
# Ver logs do Reverb
docker compose logs --tail=20 reverb
# Deve mostrar: "Starting server on 0.0.0.0:8080 (crm.omnify.center)"

# Verificar hostname do Reverb (DEVE ser o domínio público, NÃO 0.0.0.0)
docker compose exec -T reverb env | grep REVERB
# Deve mostrar: REVERB_HOST=crm.omnify.center, REVERB_PORT=443, REVERB_SCHEME=https
```

**Erro comum:** `REVERB_HOST=0.0.0.0` no container Reverb faz ele rejeitar conexões do browser com `Host: crm.omnify.center` (hostname mismatch → 500).

**Correção:** No `docker-compose.yml`, o serviço `reverb` deve ter:
```yaml
REVERB_HOST: ${VITE_REVERB_HOST:-crm.omnify.center}
REVERB_PORT: ${VITE_REVERB_PORT:-443}
REVERB_SCHEME: ${VITE_REVERB_SCHEME:-https}
REVERB_SERVER_HOST: 0.0.0.0      # bind address (interno)
REVERB_SERVER_PORT: 8080          # bind port (interno)
```

O `REVERB_HOST` no container Reverb é o hostname **público** (para validação do Host header).
O `REVERB_HOST` nos containers PHP/Queue é o hostname **interno** Docker (`reverb`).

#### Camada 3: Browser → Reverb (frontend WebSocket)

```bash
# Testar WebSocket externamente (DEVE usar --http1.1, não HTTP/2)
curl -sv --http1.1 'https://crm.omnify.center/app/crm-omnify-reverb-key-2024?protocol=7&client=js&version=8.4.0&flash=false' \
  -H 'Upgrade: websocket' -H 'Connection: upgrade' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  -H 'Sec-WebSocket-Version: 13' --max-time 5 -k 2>&1 | grep -E 'HTTP|pusher'
# Deve mostrar: "HTTP/1.1 101 Switching Protocols" e "pusher:connection_established"
```

**Erro comum:** `enabledTransports: ['wss']` no `echo.ts`. O Pusher.js 8.x NÃO reconhece `'wss'` como transporte — deve ser `['ws']`. O TLS é controlado por `forceTLS: true`.

**Config correta do `frontend/src/lib/echo.ts`:**
```typescript
echo = new Echo({
  broadcaster: 'reverb',
  wsHost: 'crm.omnify.center',
  wsPort: 443,
  wssPort: 443,
  forceTLS: true,
  enabledTransports: ['ws'],  // NÃO usar 'wss'!
  // ...
})
```

**Verificar variáveis do frontend (.env no frontend):**
```
VITE_REVERB_APP_KEY=crm-omnify-reverb-key-2024
VITE_REVERB_HOST=crm.omnify.center
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

> **IMPORTANTE:** Essas variáveis são embutidas no build do frontend (`npm run build`). Se mudar alguma, precisa recompilar o frontend.

#### Tabela de variáveis REVERB por container

| Container | REVERB_HOST | REVERB_PORT | REVERB_SCHEME | Para quê |
|-----------|-------------|-------------|---------------|----------|
| **reverb** | `crm.omnify.center` | `443` | `https` | Hostname público (validação WebSocket) |
| **php** | `reverb` | `8080` | `http` | Conexão interna Docker (broadcasting) |
| **queue** | `reverb` | `8080` | `http` | Conexão interna Docker (broadcasting) |
| **frontend** | `crm.omnify.center` | `443` | `https` | Conexão do browser (VITE_REVERB_*) |

#### Erro 502 / Nginx com IP antigo

Quando containers são recriados (`docker compose up -d`), eles podem receber novos IPs Docker. O Nginx cacheia os IPs dos upstreams. Se o Nginx mostrar `connect() failed (111: Connection refused)`:

```bash
# Reiniciar Nginx para atualizar DNS dos containers
docker compose restart nginx
```

#### Checklist completo de real-time

```bash
# 1. BROADCAST_CONNECTION deve ser "reverb"
grep BROADCAST_CONNECTION .env

# 2. Reverb rodando com hostname correto
docker compose logs --tail=5 reverb
# Deve mostrar: "Starting server on 0.0.0.0:8080 (crm.omnify.center)"

# 3. PHP/Queue conectam internamente ao Reverb
docker compose exec -T php env | grep REVERB_HOST
# Deve ser: reverb

# 4. Teste de broadcast
docker compose exec -T php php artisan tinker --execute='broadcast(new App\Events\TicketMessageCreated(App\Models\TicketMessage::latest()->first(), App\Models\TicketMessage::latest()->first()->ticket)); echo "OK";'

# 5. Teste WebSocket externo
curl -s --http1.1 'https://crm.omnify.center/app/crm-omnify-reverb-key-2024?protocol=7&client=js&version=8.4.0&flash=false' \
  -H 'Upgrade: websocket' -H 'Connection: upgrade' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  -H 'Sec-WebSocket-Version: 13' --max-time 3 -k -o /dev/null -w '%{http_code}'
# Deve retornar: 101

# 6. Se tudo OK, pedir ao usuário dar F5 no navegador
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
- [ ] API responde: `curl -s -o /dev/null -w '%{http_code}' https://crm.omnify.center/api/branding` → 200
- [ ] WebSocket responde: `curl -s --http1.1 -o /dev/null -w '%{http_code}' 'https://crm.omnify.center/app/crm-omnify-reverb-key-2024?protocol=7&client=js&version=8.4.0&flash=false' -H 'Upgrade: websocket' -H 'Connection: upgrade' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' -H 'Sec-WebSocket-Version: 13' --max-time 3 -k` → 101
- [ ] Testar mensagem no WhatsApp → som + borda verde no Kanban
- [ ] `docker compose logs --tail=50` sem erros
- [ ] Reverb mostra hostname correto: `docker compose logs --tail=3 reverb` → `crm.omnify.center`

---

## 12. Deploy Correto para Evitar Erros de Real-time e Notificações

### Quando mudar APENAS código frontend ou backend

```bash
cd /var/www/crm
git pull origin main

# Se mudou frontend:
cd frontend && npm run build && cd ..

# Se mudou backend:
docker compose exec -T php php artisan config:cache
docker compose exec -T php php artisan route:cache

# Reiniciar (sem recriar containers = sem problemas de DNS)
docker compose restart php queue scheduler
```

### Quando mudar docker-compose.yml ou .env do Docker

```bash
cd /var/www/crm
git pull origin main

# Recriar apenas os containers afetados
docker compose up -d reverb queue

# OBRIGATÓRIO: reiniciar Nginx para atualizar IPs dos containers recriados
docker compose restart nginx

# Verificar que Reverb subiu com hostname correto
docker compose logs --tail=3 reverb
# Esperado: "Starting server on 0.0.0.0:8080 (crm.omnify.center)"
```

### Quando mudar variáveis VITE_REVERB_* (frontend .env)

As variáveis `VITE_*` são embutidas no JavaScript durante `npm run build`. Mudar o `.env` do frontend **requer recompilação**:

```bash
cd /var/www/crm/frontend
# Editar .env se necessário
npm run build
cd ..
# Nginx serve os arquivos estáticos diretamente, basta reload
docker compose exec nginx nginx -s reload
```

### Deploy completo seguro (quando não sabe o que mudou)

```bash
cd /var/www/crm
git pull origin main

# Frontend
cd frontend && npm install --legacy-peer-deps && npm run build && cd ..

# Backend
docker compose exec -T php composer install --no-dev --optimize-autoloader
docker compose exec -T php php artisan migrate --force
docker compose exec -T php php artisan config:cache
docker compose exec -T php php artisan route:cache
docker compose exec -T php php artisan view:cache

# Recriar containers (pega novas configs do docker-compose.yml)
docker compose up -d

# SEMPRE reiniciar Nginx por último (para pegar os novos IPs)
docker compose restart nginx

# Verificar
docker compose ps
docker compose logs --tail=3 reverb
```

### Comando único via sshpass (deploy remoto sem interação)

```bash
sshpass -p 'Motochefe2025@' ssh -o StrictHostKeyChecking=no root@212.85.20.129 \
  "cd /var/www/crm && git pull origin main && cd frontend && npm run build && cd .. && docker compose exec -T php php artisan config:cache && docker compose exec -T php php artisan route:cache && docker compose up -d && docker compose restart nginx && docker compose ps"
```

---

## URLs

| Serviço | URL |
|---------|-----|
| Frontend | https://crm.omnify.center |
| API | https://crm.omnify.center/api |
| AI Service | https://crm.omnify.center/ai |
