package api

import (
	"github.com/gofiber/fiber/v2"
)

func APIKeyAuth(apiKey string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if apiKey == "" {
			return c.Next()
		}

		key := c.Get("X-API-Key")
		if key == "" {
			key = c.Query("api_key")
		}

		if key != apiKey {
			return c.Status(401).JSON(fiber.Map{
				"error": "unauthorized",
			})
		}

		return c.Next()
	}
}
