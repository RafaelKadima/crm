package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"

	"whatsapp-api/internal/api"
	"whatsapp-api/internal/config"
	"whatsapp-api/internal/store"
	"whatsapp-api/internal/webhook"
	"whatsapp-api/internal/whatsapp"
)

func main() {
	// Carregar .env (opcional)
	godotenv.Load()

	// Carregar configurações
	cfg := config.Load()

	// Validar configurações obrigatórias
	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	if cfg.APIKey == "" {
		log.Println("WARNING: API_KEY not set, API will be unprotected")
	}

	// Conectar ao PostgreSQL
	log.Println("Connecting to database...")
	pgStore, err := store.NewPostgresStore(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pgStore.Close()
	log.Println("Database connected")

	// Criar webhook sender
	webhookSender := webhook.NewSender(cfg.WebhookURL, cfg.APIKey)

	// Criar gerenciador de sessões
	manager := whatsapp.NewManager(pgStore, webhookSender)

	// Carregar sessões existentes
	log.Println("Loading existing sessions...")
	ctx := context.Background()
	if err := manager.LoadExistingSessions(ctx); err != nil {
		log.Printf("Warning: Failed to load existing sessions: %v", err)
	}

	// Criar diretório de mídia
	os.MkdirAll("/app/data/media", 0755)

	// Criar servidor Fiber
	app := fiber.New(fiber.Config{
		BodyLimit: 50 * 1024 * 1024, // 50MB para uploads
	})

	// Configurar rotas
	api.SetupRoutes(app, manager, cfg.APIKey)

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		log.Println("Shutting down...")
		manager.Shutdown()
		app.Shutdown()
	}()

	// Iniciar servidor
	log.Printf("Server starting on port %s", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
