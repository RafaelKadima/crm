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

Para atualizar após mudanças no código:

```bash
cd /var/www/crm
make deploy
```

Ou manualmente:

```bash
git pull origin main
docker compose build
docker compose up -d
docker compose exec php php artisan migrate --force
docker compose exec php php artisan optimize
docker compose restart queue scheduler reverb
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
