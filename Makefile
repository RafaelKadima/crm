# ==================================================
# CRM OMNIFY - MAKEFILE
# ==================================================

.PHONY: help setup deploy build up down restart logs shell migrate

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

deploy: ## Deploy/atualização em produção
	@echo "$(GREEN)🚀 Iniciando deploy...$(RESET)"
	git pull origin main
	cd frontend && npm run build && cd ..
	docker compose build
	docker compose up -d
	docker compose exec -T php php artisan migrate --force
	docker compose exec -T php php artisan optimize
	docker compose restart queue scheduler reverb
	@echo "$(GREEN)✅ Deploy concluído!$(RESET)"

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
clean: ## Remove containers e volumes não utilizados
	docker system prune -f
	docker volume prune -f

backup: ## Mostra comando de backup (Supabase é externo)
	@echo "$(YELLOW)Banco está no Supabase - faça backup pelo painel deles$(RESET)"
	@echo "https://supabase.com/dashboard"
