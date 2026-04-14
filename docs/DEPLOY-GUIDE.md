# Guia de Deploy - OmniFy HUB CRM

> Guia completo para deploy sem erros, incluindo setup inicial, atualizações, reinicialização do Nginx e troubleshooting.

---

## Dados da VPS

| Campo | Valor |
|-------|-------|
| **IP** | 212.85.20.129 |
| **Usuário** | root |
| **Auth** | SSH key (nunca commitar senhas em docs) |
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

### Via SSH key (recomendado)

```bash
# Copiar sua chave pública para a VPS (uma vez)
ssh-copy-id root@212.85.20.129

# Conectar
ssh root@212.85.20.129
cd /var/www/crm
```

### Via SSH com key file específica

```bash
# Conectar com key file
ssh -i ~/.ssh/id_rsa root@212.85.20.129

# Executar comando direto (sem abrir sessão interativa)
ssh -i ~/.ssh/id_rsa root@212.85.20.129 "cd /var/www/crm && docker compose ps"
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

**Sintoma no console do navegador:**
```
api/* : Failed to load resource: 502 (Bad Gateway)
WebSocket connection to 'wss://crm.omnify.center/app/...' failed
```

**502 NÃO significa só "PHP-FPM caiu".** Tem 3 causas comuns, sempre nessa ordem de investigação:

#### A) Cascata nginx ↔ upstream (causa #1 do incidente de 2026-04-13)

O `nginx` tem `proxy_pass ai-service:8001` no upstream. Se o `ai-service` (ou qualquer outro upstream nominal do nginx) entrar em crash loop, o nginx **não consegue resolver o hostname interno** e entra em crash loop também — derrubando TUDO, inclusive os webhooks da Meta.

```bash
# 1. Existe algum container em "Restarting"?
docker compose ps
# Se vir "crm-ai-service ... Restarting" ou "crm-nginx ... Restarting" → é cascata

# 2. Logs do container que está em loop (geralmente um upstream do nginx)
docker logs crm-ai-service --tail 30
# Procurar por: AttributeError, ImportError, ModuleNotFoundError, traceback Python

# 3. Logs do nginx confirmam o sintoma
docker logs crm-nginx --tail 5
# "[emerg] 1#1: host not found in upstream 'ai-service:8001'" → cascata confirmada
```

**Padrão recorrente: commit parcial em ai-service.** Se `ai-service/main.py` referencia `settings.x` mas `app/config.py` não declara `x`, a imagem builda OK mas o container morre no startup com `AttributeError`. Foi exatamente o caso do incidente 2026-04-13.

**Correção** após arrumar o código:
```bash
docker compose build ai-service       # OBRIGATÓRIO se mudou .py — código vai pra dentro da imagem
docker compose up -d ai-service       # recriar container com a imagem nova
docker compose restart nginx          # OBRIGATÓRIO — força nginx a re-resolver DNS interno
```

#### B) PHP-FPM caiu (causa clássica)

```bash
docker compose logs php --tail=50
# Procurar por: "FPM is not running", segfault, OOM
docker compose restart php
docker compose restart nginx          # força re-resolução do upstream php:9000
```

#### C) Recurso esgotado na VPS

```bash
df -h          # disco cheio? /var/lib/docker pode estar lotado
free -h        # RAM? Containers reiniciam quando OOM-killed
docker stats --no-stream
```

**Limpeza emergencial:**
```bash
docker system prune -af --volumes      # libera espaço (CUIDADO em prod)
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

> **Quase tudo nessa lista virou automatizado em `make verify` (rodado pelo `make deploy`).** Use a checklist como referência conceitual; o trabalho de validação é do Makefile.

### Antes
- [ ] `make preflight` — ver commits que vão entrar (e se tem commits de outras pessoas que vieram junto no `git pull`)
- [ ] Validar arquivos sensíveis listados pelo preflight (`Dockerfile`, `docker-compose.yml`, `.env`, `migrations/`, `ai-service/`)
- [ ] Sem segredos expostos no commit

### Durante
- [ ] `make deploy` — faz git pull, build, up, migrate, optimize, restart **e healthcheck**
- [ ] Acompanhar output até `✅ Deploy concluído e validado!`

### Depois (somente se algo do verify falhou)
- [ ] Investigar containers em loop: `docker compose ps`
- [ ] Logs do container suspeito: `docker logs <nome> --tail 30`
- [ ] Se nginx em loop por "host not found" → ver seção **8.A (Cascata)**
- [ ] Se não der pra arrumar em < 5 min → `make rollback` (reverte e re-deploya)
- [ ] Testar mensagem real no WhatsApp → som + borda verde no Kanban
- [ ] Reverb hostname correto: `docker compose logs --tail=3 reverb` → `crm.omnify.center`

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

### Comando único via SSH key (deploy remoto sem interação)

```bash
ssh root@212.85.20.129 \
  "cd /var/www/crm && git pull origin main && cd frontend && npm run build && cd .. && docker compose exec -T php php artisan config:cache && docker compose exec -T php php artisan route:cache && docker compose up -d && docker compose restart nginx && docker compose ps"
```

---

## URLs

| Serviço | URL |
|---------|-----|
| Frontend | https://crm.omnify.center |
| API | https://crm.omnify.center/api |
| AI Service | https://crm.omnify.center/ai |

---

## 13. Post-Mortem 2026-04-13 — produção fora por commit parcial em ai-service

### O que aconteceu

1. Deploy de uma feature de tickets puxou junto 4 commits do dia que outra pessoa havia pushado entre meu último deploy e o atual. Um desses commits adicionou `settings.cors_allowed_origins` em `ai-service/main.py:81` mas **esqueceu de declarar** essa setting em `ai-service/app/config.py`.
2. `make deploy` rodou `docker compose build ai-service` (porque source mudou) → imagem nova foi criada com o código quebrado.
3. Container `ai-service` iniciou e morreu imediatamente com `AttributeError: 'Settings' object has no attribute 'cors_allowed_origins'` → entrou em **crash loop**.
4. Container `nginx` tem `proxy_pass ai-service:8001` no upstream; sem `ai-service`, nginx **não conseguiu resolver o hostname interno** e também entrou em crash loop (`[emerg] host not found in upstream "ai-service:8001"`).
5. **TODA a aplicação caiu**: frontend, APIs, webhooks da Meta. Tempo até detecção: o `make deploy` retornou exit 0 (`✅ Deploy concluído!`) porque o último comando, `docker compose restart queue scheduler reverb`, terminou OK. Ninguém olhou os containers individualmente.

### Por que demorou pra detectar

- `make deploy` antigo **não tinha healthcheck pós-deploy**.
- Mensagem "✅ Deploy concluído!" deu falso sinal de sucesso.
- Detecção só veio quando o usuário abriu a UI e viu 502 no console do navegador.

### Correções estruturais já aplicadas

| # | Mudança | Onde |
|---|---|---|
| 1 | `make deploy` agora chama `make verify` no fim e falha (exit 1) se algum upstream estiver fora | `Makefile` |
| 2 | `make verify` testa: containers em restart, containers críticos UP, frontend 200, API 200, webhook WhatsApp respondendo, Reverb 101 | `Makefile` |
| 3 | `make preflight` mostra commits que vão entrar e marca arquivos sensíveis (`ai-service/`, `Dockerfile`, `migrations/`, `.env`) | `Makefile` |
| 4 | `make rollback` reverte HEAD + re-deploy com confirmação | `Makefile` |
| 5 | Seção **8.A Cascata nginx ↔ upstream** documenta o padrão completo de causa→sintoma→fix | este doc |
| 6 | Hotfix do incidente: `cors_allowed_origins` declarada no `config.py` (commit 550c04a) e `CORS_ALLOWED_ORIGINS` adicionada ao `.env` da VPS | repo + VPS |

### Regras pra evitar repetição

1. **Sempre rodar `make preflight` antes de `make deploy`.** Se o preflight mostrar arquivos em `ai-service/` modificados por commits que não são seus, abrir e revisar o diff antes — commits parciais Python são silenciosos no build, explosivos no runtime.
2. **Nunca confiar no exit 0 do `make deploy`.** O `make verify` integrado falha alto se algo estiver fora. Se ele falhar, **não fechar a sessão** — investigar imediatamente ou rodar `make rollback`.
3. **Quando código Python (`ai-service/`) muda → sempre `docker compose build ai-service`** antes de `up -d`. Editar arquivo no host não afeta a imagem (não tem bind mount).
4. **Quando container é recriado → restart no nginx** (`docker compose restart nginx`). DNS interno do Docker é cacheado e nginx mantém o IP velho.
5. **Pre-deploy local check** (recomendado): rodar `cd ai-service && python -c "from app.config import Settings; Settings()"` — um import simples já pega a maioria dos `AttributeError`/`ImportError` sem precisar subir o container.

---

## 14. Post-Mortem 2026-04-14 — Integração WhatsApp coexistência (MotoChefe)

Cliente MotoChefe reportou 8 sintomas (áudios fora de ordem, mensagens do celular não aparecendo no CRM, histórico incompleto, anúncio "not supported", não criar template etc.). Investigação revelou problemas distribuídos em backend + frontend + config Meta. Consolidação das lições:

### Aprendizados operacionais (correções já aplicadas neste commit)

1. **`docker compose restart nginx` agora é automático no `make deploy`.** Toda vez que `php`, `ai-service` ou outro upstream é recriado, nginx cacheia o IP velho e tudo vira 502. Antes era manual; agora o Makefile faz sozinho.

2. **Webhook fields da Meta são controlados no Meta App Dashboard, não em código.** O `subscribeAppToWaba()` habilita a entrega, mas **quais fields** vêm depende do checkbox em `developers.facebook.com → App → WhatsApp → Configuration → Webhooks`. Para coexistência os fields críticos são:
   - `smb_message_echoes` — mensagens enviadas pelo celular do operador
   - `smb_app_state_sync` — sync de contatos do app
   - `history` — backfill one-shot após onboarding
   - `message_template_status_update` — status de aprovação de template
   - `phone_number_quality_update` — qualidade do número
   
   `message_echoes` (sem `smb_`) é do Messenger — pode estar como "Falha ao assinar" no app WhatsApp, ignorar.

3. **Após mudar código que afeta subscribe → re-executar subscribe em tenants já conectados.** Senão eles continuam com os fields antigos. Comando:
   ```bash
   ssh root@212.85.20.129
   cd /var/www/crm
   docker compose exec -T php php artisan tinker --execute='
     foreach (\App\Models\MetaIntegration::where("is_coexistence",true)->get() as $i) {
       app(\App\Modules\Meta\Services\MetaOAuthService::class)->subscribeAppToWaba($i->waba_id, $i->access_token);
     }'
   ```

4. **Hard refresh no browser após deploy de frontend (Ctrl+Shift+R).** O build incrementa hash do bundle, mas browsers podem servir cache em CDN/service worker. Sintoma: "a correção não chegou" — mas chegou, só o browser está com JS antigo.

### Armadilhas de código encontradas (lições para futuras integrações Meta)

5. **Meta usa chaves diferentes no `value` do webhook por field.** `messages` vem em `value.messages[]`, mas `smb_message_echoes` vem em `value.message_echoes[]`. Se o handler faz `$value['messages']`, o SMB echo vira `message_count: 0` no log e é descartado silenciosamente. Normalize sempre antes de processar.

6. **Handlers genéricos (`processCoexistenceEcho`) que checam `field === 'messages'` bloqueiam payloads normalizados.** Ao delegar entre handlers, normalizar **tudo**: o field, o array de mensagens, a chave. Não assumir que só trocar o array resolve.

7. **WhatsApp Graph API: misturar versões v18/v19/v21 em endpoints diferentes é bomba-relógio.** O `getMediaUrl` estava em v21 enquanto o resto em v18 — podia derrubar download de mídia se Meta depreciasse v21. Centralizar versão em `config/services.php:services.{whatsapp,instagram,meta}.api_version` e usar `config(...)` em todos os services. Default atual: **v22.0**.

8. **Idempotência de webhook via `whereJsonContains('metadata->whatsapp_message_id', ...)` é frágil e lento.** Meta entrega webhooks com at-least-once delivery — duplicatas são esperadas. Solução: coluna dedicada `wa_message_id` indexada + UNIQUE parcial em Postgres. Migrado em `2026_04_14_000001_add_wa_message_id_unique_to_ticket_messages.php` com backfill em chunks (não trava base grande).

9. **`sent_at = now()` na criação de TicketMessage causa fora de ordem.** Webhooks não chegam ordenados. Sempre usar `Carbon::createFromTimestamp((int) $message['timestamp'])` — o timestamp do payload é canônico.

10. **URL de download de media da Meta tem TTL de ~5 minutos.** Se download síncrono falha no webhook (timeout, rede), a URL expira e o áudio fica permanentemente indisponível. Mitigação: job em fila `whatsapp-media` com retry exponencial (10s/30s/90s), dispara quando `media_pending=true` e termina dentro do TTL.

11. **WebSocket outbound handler no frontend assumia otimistic UI.** O handler de `message.created` ignorava toda mensagem `direction=outbound + sender_type=user` por achar que era eco da própria request HTTP. Echoes de coexistência (vêm do celular, sem temp message) eram silenciosamente descartados. Fix: detectar `metadata.coexistence_echo === true` e adicionar como nova, além de um fallback pro caso geral de sem temp.

12. **Botões que dependem de seleção não-obrigatória devem ter fallback, não disable.** Ex.: "Criar template" e "Sincronizar" ficavam desabilitados quando usuário deixava "Todos os canais" no dropdown. UX correta: se há pelo menos 1 canal, habilitar o botão e usar o primeiro como default. Disable só quando **não existe** canal configurado.

### Checklist pra próxima integração Meta

Antes de deploy de qualquer mudança que toque webhook/templates/Meta:

- [ ] Versão da Graph API unificada em `config/services.php`?
- [ ] Payload do webhook tem chave diferente por field? (Chequei doc da Meta para cada field subscrito?)
- [ ] Inserções de mensagem usam `wa_message_id` para idempotência?
- [ ] `sent_at` vem do `timestamp` do payload, não `now()`?
- [ ] Download de media tem fallback async com retry?
- [ ] Handler WebSocket no frontend trata OUTBOUND vindo do webhook (não só inbound)?
- [ ] Após mudança em `subscribeAppToWaba` ou campos novos → re-executar subscribe nos tenants existentes?
- [ ] Botões de ação têm fallback se o estado ainda não carregou?

