package api

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"whatsapp-api/internal/whatsapp"
)

func SetupRoutes(app *fiber.App, manager *whatsapp.Manager, apiKey string) {
	// Middlewares globais
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, X-API-Key",
	}))

	// Servir arquivos de mídia
	app.Static("/media", "/app/data/media")

	handler := NewHandler(manager)

	// Health check (sem auth)
	app.Get("/health", handler.HealthCheck)

	// Rotas autenticadas
	api := app.Group("/api", APIKeyAuth(apiKey))
	{
		// Sessões
		sessions := api.Group("/sessions")
		{
			sessions.Get("/", handler.ListSessions)
			sessions.Post("/", handler.CreateSession)
			sessions.Get("/:sessionId", handler.GetSessionStatus)
			sessions.Delete("/:sessionId", handler.DeleteSession)

			// Conexão
			sessions.Post("/:sessionId/connect", handler.ConnectSession)
			sessions.Post("/:sessionId/disconnect", handler.DisconnectSession)
			sessions.Get("/:sessionId/qr", handler.GetQRCode)

			// Mensagens
			sessions.Post("/:sessionId/send/text", handler.SendText)
			sessions.Post("/:sessionId/send/image", handler.SendImage)
			sessions.Post("/:sessionId/send/document", handler.SendDocument)
		}
	}
}
