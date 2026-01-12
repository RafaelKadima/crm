package config

import (
	"os"
)

type Config struct {
	Port        string
	APIKey      string
	WebhookURL  string
	DatabaseURL string
}

func Load() *Config {
	return &Config{
		Port:        getEnv("PORT", "3000"),
		APIKey:      getEnv("API_KEY", ""),
		WebhookURL:  getEnv("WEBHOOK_URL", ""),
		DatabaseURL: getEnv("DATABASE_URL", ""),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
