# 🚀 Deploy CRM Omnify - VPS

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                         NGINX                               │
│                    (Porta 80/443)                           │
└─────────┬──────────────┬──────────────┬──────────────┬──────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Frontend   │ │   Laravel   │ │   Reverb    │ │ AI Service  │
│   (React)   │ │  (PHP-FPM)  │ │ (WebSocket) │ │  (Python)   │
└─────────────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
                       │               │               │
                       └───────────────┴───────────────┘
                                       │
                       ┌───────────────┴───────────────┐
                       │                               │
                       ▼                               ▼
              ┌─────────────────┐           ┌─────────────────┐
              │     Supabase    │           │      Redis      │
              │   (PostgreSQL)  │           │  (Cache/Queue)  │
              │     EXTERNO     │           │     LOCAL       │
              └─────────────────┘           └─────────────────┘
```

---

## 📋 Containers Docker

| Container | Descrição | Porta |
|-----------|-----------|-------|
| `crm-nginx` | Servidor web + proxy | 80, 443 |
| `crm-php` | Laravel API | 9000 (interno) |
| `crm-reverb` | WebSocket Server | 8080 (interno) |
| `crm-queue` | Processador de filas | - |
| `crm-scheduler` | Tarefas agendadas | - |
| `crm-ai-service` | Agente IA (Python) | 8001 (interno) |
| `crm-redis` | Cache/Filas | 6379 (interno) |

**Nota:** PostgreSQL está no Supabase (externo), não em container local.

---

## 🚀 Deploy Inicial (Primeira Vez)

### Na VPS, execute:

```bash
# 1. Entrar no diretório do projeto
cd /var/www/crm

# 2. Dar permissão e executar setup
chmod +x deploy/setup-vps.sh
./deploy/setup-vps.sh
```

O script faz automaticamente:
- ✅ Copia arquivos .env configurados
- ✅ Instala Docker se necessário
- ✅ Compila frontend React
- ✅ Builda imagens Docker
- ✅ Sobe todos os containers
- ✅ Configura Laravel (key, migrations, passport)

---

## 🔒 Configurar SSL (HTTPS)

Após o setup inicial:

```bash
chmod +x deploy/ssl-setup.sh
./deploy/ssl-setup.sh
```

Ou manualmente:

```bash
# Instalar Certbot
apt install certbot

# Parar nginx
docker compose stop nginx

# Gerar certificado
certbot certonly --standalone -d crm.omnify.center

# Copiar certificados
cp /etc/letsencrypt/live/crm.omnify.center/fullchain.pem docker/nginx/ssl/
cp /etc/letsencrypt/live/crm.omnify.center/privkey.pem docker/nginx/ssl/

# Subir nginx
docker compose up -d nginx
```

---

## 🔄 Atualizações (Deploy)

### Fluxo padrão (3 passos)

```bash
cd /var/www/crm
make preflight   # 1) ver o que vai mudar (commits + arquivos sensíveis)
make deploy      # 2) deploy + healthcheck automático
                 # 3) se algo falhar, make rollback
```

### O que `make deploy` faz

```
git pull origin main
cd frontend && npm run build && cd ..
docker compose build
docker compose up -d
docker compose exec php php artisan migrate --force
docker compose exec php php artisan optimize
docker compose restart queue scheduler reverb
sleep 10
make verify      # ⚠️ se falhar, exit 1 — NÃO pinte de verde
```

### `make verify` — healthcheck automático

Roda no fim do `make deploy`, pode ser invocado isolado:

- ✅ Nenhum container em loop de restart
- ✅ Containers críticos (`nginx`, `php`, `ai-service`, `reverb`, `queue`) em `running`
- ✅ Frontend (`/`) responde 2xx/3xx
- ✅ API (`/api/branding`) responde 2xx/3xx — detecta PHP-FPM down
- ✅ Webhook WhatsApp (`/api/webhooks/whatsapp`) responde — detecta nginx-cascata
- ✅ Reverb WebSocket (`/app/crm-omnify-reverb-key-2024`) responde 101

Se qualquer um falhar, o deploy é marcado como FALHO mesmo que o `git pull` e `docker compose` tenham retornado 0. **Não feche a sessão sem investigar.**

### `make rollback` — quando deploy falhou

```bash
make rollback    # git revert HEAD + git push + make deploy (com confirmação)
```

### Padrão de cascata `nginx ↔ upstream` (LIÇÃO IMPORTANTE)

O `nginx` tem `proxy_pass ai-service:8001` no upstream. Se o `ai-service` entrar em crash loop:

1. nginx tenta resolver `ai-service:8001` → DNS interno falha → nginx também entra em crash loop
2. **Toda a aplicação cai** (não só `/ai`): porque sem nginx, nada chega no Laravel
3. Webhooks da Meta começam a receber 502 → Meta para de entregar mensagens em poucos minutos

**Sintomas no console do navegador:**
```
api/* : Failed to load resource: 502 (Bad Gateway)
WebSocket connection to 'wss://crm.omnify.center/app/...' failed
```

**Diagnóstico rápido:**
```bash
docker compose ps                          # algum em "Restarting"?
docker logs crm-ai-service --tail 30       # AttributeError? ImportError?
docker logs crm-nginx --tail 5             # "host not found in upstream"?
```

**Solução** depois de fixar o ai-service:
```bash
docker compose build ai-service            # se mudou código Python
docker compose up -d ai-service
docker compose restart nginx               # OBRIGATÓRIO — re-resolve DNS interno
```

---

## 📊 Comandos Úteis

```bash
# Ver todos os comandos
make help

# Status dos containers
make ps

# Ver logs
make logs

# Logs específicos
make queue-logs
make reverb-logs
make ai-logs

# Acessar shell PHP
make shell

# Reiniciar queue
make queue-restart

# Limpar caches
make cache
```

---

## 🐛 Troubleshooting

### Container não sobe
```bash
docker compose logs <container>
```

### Erro de conexão com banco
- Verificar se Supabase está acessível
- Verificar credenciais no .env

### WebSocket não conecta
```bash
make reverb-logs
```

### Queue não processa
```bash
make queue-restart
make queue-logs
```

---

## 📁 Arquivos de Configuração

```
deploy/
├── env.production      → Copiar para .env
├── ai-service.env      → Copiar para ai-service/.env
├── setup-vps.sh        → Script de setup inicial
└── ssl-setup.sh        → Script para configurar SSL

docker/
├── nginx/
│   ├── nginx.conf
│   ├── sites/default.conf
│   └── ssl/            → Certificados SSL
├── php/
│   ├── Dockerfile
│   └── php.ini
└── postgres/
    └── init.sql        → (não usado - Supabase externo)
```

---

## 🔐 Credenciais

| Serviço | Detalhes |
|---------|----------|
| **Domínio** | crm.omnify.center |
| **Banco** | Supabase (externo) |
| **OpenAI** | Configurado no .env |
| **AWS S3** | meu-crm-storage |

---

## ✅ Checklist de Deploy

- [ ] Docker instalado na VPS
- [ ] Projeto clonado em `/var/www/crm`
- [ ] `./deploy/setup-vps.sh` executado
- [ ] SSL configurado (`./deploy/ssl-setup.sh`)
- [ ] DNS apontando para IP da VPS
- [ ] Teste: https://crm.omnify.center
