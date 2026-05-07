# ==================================================
# CRM OMNIFY - MAKEFILE
# ==================================================

.PHONY: help setup deploy preflight verify rollback build up down restart logs shell migrate logs-perm logs-perm-cron

# Cores
GREEN  := $(shell printf '\033[0;32m')
YELLOW := $(shell printf '\033[1;33m')
RESET  := $(shell printf '\033[0m')

help: ## Mostra esta ajuda
	@echo "$(GREEN)CRM Omnify - Comandos disponíveis:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(RESET) %s\n", $$1, $$2}'

# --------------------------------------------------
# Setup e Deploy
# --------------------------------------------------
setup: ## Setup inicial completo (primeira vez)
	@chmod +x deploy/setup-vps.sh
	@./deploy/setup-vps.sh

ssl: ## Configura SSL (HTTPS)
	@chmod +x deploy/ssl-setup.sh
	@./deploy/ssl-setup.sh

# Pre-flight: o que vai entrar nesse deploy?
# Útil pra detectar commits de outras pessoas que vieram junto no git pull
# e arquivos críticos (Dockerfile, .env, migrations) que exigem cuidado extra.
preflight: ## Mostra o que vai mudar antes do deploy (commits + arquivos)
	@echo "$(GREEN)🔍 Pre-flight check...$(RESET)"
	@git fetch origin main --quiet
	@echo ""
	@echo "$(YELLOW)Commits que entrarão no deploy:$(RESET)"
	@git log HEAD..origin/main --oneline || echo "(já está em origin/main)"
	@echo ""
	@echo "$(YELLOW)Arquivos sensíveis modificados:$(RESET)"
	@git diff --name-only HEAD origin/main 2>/dev/null | grep -E '(Dockerfile|docker-compose|\.env|migrations/|ai-service/|nginx)' | sed 's/^/  /' || echo "  (nenhum)"
	@echo ""

deploy: ## Deploy/atualização em produção (com healthcheck automático)
	@echo "$(GREEN)🚀 Iniciando deploy...$(RESET)"
	git pull origin main
	cd frontend && npm run build && cd ..
	docker compose build
	docker compose up -d
	docker compose exec -T php php artisan migrate --force
	docker compose exec -T php php artisan optimize
	@$(MAKE) logs-perm   # corrige owner de logs criados por exec rodando como root
	docker compose restart queue scheduler reverb
	@# Recria do DNS: quando reverb é recriado, o container php mantém o IP antigo
	@# em cache e broadcasts (ShouldBroadcastNow) falham silenciosamente com cURL 7.
	@# Quando ai-service/php são recriados, o nginx mantém IP antigo e upstream vira 502.
	@# Restart do php limpa cache para chegar no reverb; restart nginx limpa para upstream.
	@# Ver: docs/DEPLOY-GUIDE.md seção 13 (incidente 2026-04-13).
	docker compose restart php
	docker compose restart nginx
	@echo "$(YELLOW)⏳ Aguardando containers estabilizarem (10s)...$(RESET)"
	@sleep 10
	@$(MAKE) verify || ( echo "$(YELLOW)⚠️  Deploy concluiu mas healthcheck FALHOU. Investigue antes de fechar a sessão.$(RESET)"; exit 1 )
	@echo "$(GREEN)✅ Deploy concluído e validado!$(RESET)"

verify: ## Healthcheck pós-deploy (containers + endpoints + cascata nginx)
	@echo "$(GREEN)🔬 Verificando saúde da produção...$(RESET)"
	@echo ""
	@echo "$(YELLOW)1) Containers em loop de restart (deveria ser vazio):$(RESET)"
	@RESTARTING=$$(docker compose ps --format '{{.Name}} {{.Status}}' | grep -i 'restarting' || true); \
	  if [ -n "$$RESTARTING" ]; then echo "  ❌ $$RESTARTING"; exit 1; else echo "  ✅ nenhum"; fi
	@echo ""
	@echo "$(YELLOW)2) Containers crítticos UP:$(RESET)"
	@for c in crm-nginx crm-php crm-ai-service crm-reverb crm-queue; do \
	  STATUS=$$(docker inspect -f '{{.State.Status}}' $$c 2>/dev/null || echo 'missing'); \
	  if [ "$$STATUS" = "running" ]; then echo "  ✅ $$c"; else echo "  ❌ $$c ($$STATUS)"; exit 1; fi; \
	done
	@echo ""
	@echo "$(YELLOW)3) Endpoints HTTP (rejeita 5xx e 000):$(RESET)"
	@# 4xx (401, 404, 405) significa que Laravel/nginx estão UP — só a request foi inválida.
	@# Quem está realmente fora retorna 5xx (gateway/upstream) ou 000 (não conectou).
	@CODE=$$(curl -s -o /dev/null -w '%{http_code}' -m 8 https://crm.omnify.center/); \
	  if echo "$$CODE" | grep -qE '^[1-4]'; then echo "  ✅ frontend ($$CODE)"; else echo "  ❌ frontend ($$CODE)"; exit 1; fi
	@CODE=$$(curl -s -o /dev/null -w '%{http_code}' -m 8 https://crm.omnify.center/api/branding); \
	  if echo "$$CODE" | grep -qE '^[1-4]'; then echo "  ✅ api/branding ($$CODE) — Laravel respondendo"; else echo "  ❌ api/branding ($$CODE) — PHP-FPM ou nginx-cascata"; exit 1; fi
	@CODE=$$(curl -s -o /dev/null -w '%{http_code}' -m 8 -X POST https://crm.omnify.center/api/webhooks/whatsapp); \
	  if echo "$$CODE" | grep -qE '^[1-4]'; then echo "  ✅ webhook whatsapp ($$CODE)"; else echo "  ❌ webhook whatsapp ($$CODE) — Meta vai parar de entregar mensagens"; exit 1; fi
	@echo ""
	@echo "$(YELLOW)4) WebSocket Reverb (101 = OK):$(RESET)"
	@CODE=$$(curl -s --http1.1 -o /dev/null -w '%{http_code}' -m 5 -k \
	  'https://crm.omnify.center/app/crm-omnify-reverb-key-2024?protocol=7&client=js&version=8.4.0&flash=false' \
	  -H 'Upgrade: websocket' -H 'Connection: upgrade' \
	  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' -H 'Sec-WebSocket-Version: 13'); \
	  if [ "$$CODE" = "101" ]; then echo "  ✅ reverb ($$CODE)"; else echo "  ❌ reverb ($$CODE) — real-time não vai funcionar"; exit 1; fi
	@echo ""
	@echo "$(YELLOW)5) Permissão de storage/logs (www-data:www-data — vide DEPLOY-GUIDE seção 15):$(RESET)"
	@WRONG=$$(find storage/logs -name 'laravel*.log' ! -user www-data 2>/dev/null); \
	  if [ -n "$$WRONG" ]; then \
	    echo "  ❌ logs com owner errado (rode 'make logs-perm'):"; \
	    echo "$$WRONG" | sed 's/^/    /'; exit 1; \
	  else echo "  ✅ todos www-data:www-data"; fi
	@echo ""
	@echo "$(GREEN)✅ Tudo verde!$(RESET)"

rollback: ## Reverte o último commit em produção (git revert HEAD + redeploy)
	@echo "$(YELLOW)⚠️  Vai reverter o último commit:$(RESET)"
	@git log -1 --oneline
	@echo ""
	@read -p "Confirma rollback? (y/N) " confirm; \
	  if [ "$$confirm" != "y" ] && [ "$$confirm" != "Y" ]; then echo "Cancelado."; exit 1; fi
	git revert --no-edit HEAD
	git push origin main
	$(MAKE) deploy

# --------------------------------------------------
# Docker Compose
# --------------------------------------------------
build: ## Builda todas as imagens
	docker compose build --no-cache

up: ## Sobe todos os containers
	docker compose up -d

down: ## Para todos os containers
	docker compose down

restart: ## Reinicia todos os containers
	docker compose restart

logs: ## Mostra logs de todos os containers
	docker compose logs -f

ps: ## Lista containers rodando
	docker compose ps

# --------------------------------------------------
# Laravel Commands
# --------------------------------------------------
shell: ## Acessa o shell do container PHP
	docker compose exec php sh

migrate: ## Executa migrations
	docker compose exec php php artisan migrate --force

seed: ## Executa seeders
	docker compose exec php php artisan db:seed --force

fresh: ## Recria banco do zero (CUIDADO!)
	docker compose exec php php artisan migrate:fresh --seed --force

cache: ## Limpa e recria caches
	docker compose exec php php artisan optimize:clear
	docker compose exec php php artisan config:cache
	docker compose exec php php artisan route:cache
	docker compose exec php php artisan view:cache

key: ## Gera APP_KEY
	docker compose exec php php artisan key:generate

passport: ## Instala Passport
	docker compose exec php php artisan passport:install --force

tinker: ## Acessa Laravel Tinker
	docker compose exec php php artisan tinker

# --------------------------------------------------
# Queue & Scheduler & Reverb
# --------------------------------------------------
queue-restart: ## Reinicia queue worker
	docker compose restart queue

queue-logs: ## Logs do queue worker
	docker compose logs -f queue

reverb-logs: ## Logs do Reverb (WebSocket)
	docker compose logs -f reverb

scheduler-logs: ## Logs do scheduler
	docker compose logs -f scheduler

# --------------------------------------------------
# AI Service
# --------------------------------------------------
ai-logs: ## Logs do AI Service
	docker compose logs -f ai-service

ai-shell: ## Shell do AI Service
	docker compose exec ai-service sh

# --------------------------------------------------
# Frontend
# --------------------------------------------------
frontend-build: ## Compila frontend para produção
	cd frontend && npm run build

frontend-dev: ## Roda frontend em modo dev
	cd frontend && npm run dev

# --------------------------------------------------
# Manutenção
# --------------------------------------------------
logs-perm: ## Corrige owner de storage/logs/* para www-data (vide DEPLOY-GUIDE §15)
	@# Comandos artisan via `docker compose exec` rodam como root e arquivos
	@# criados ficam root-owned — PHP-FPM (www-data) não consegue escrever depois.
	@# Sintoma: HTTP 500 silencioso em rotas que tentam logar (ex.: rejeição HMAC).
	@chown -R www-data:www-data storage/logs/ 2>/dev/null || \
	  sudo chown -R www-data:www-data storage/logs/
	@chmod -R u+rw,g+rw storage/logs/
	@echo "$(GREEN)✅ storage/logs/ → www-data:www-data$(RESET)"

logs-perm-cron: ## Instala cron diário (3h da manhã) que corrige perms de logs
	@echo "Adicione ao crontab da VPS (crontab -e):"
	@echo "  0 3 * * * cd $$(pwd) && chown -R www-data:www-data storage/logs/ >/dev/null 2>&1"
	@echo ""
	@echo "Defesa em camadas: o 'make deploy' já chama 'logs-perm' automaticamente."
	@echo "O cron protege contra criação de logs por outros comandos ad-hoc rodados como root."

clean: ## Remove containers e volumes não utilizados
	docker system prune -f
	docker volume prune -f

backup: ## Mostra comando de backup (Supabase é externo)
	@echo "$(YELLOW)Banco está no Supabase - faça backup pelo painel deles$(RESET)"
	@echo "https://supabase.com/dashboard"
