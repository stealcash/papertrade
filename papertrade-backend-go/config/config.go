package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds application configuration
type Config struct {
	Port              string
	InternalAPISecret string
}

// LoadConfig loads configuration from environment
func LoadConfig() *Config {
	// Load .env file if it exists
	_ = godotenv.Load()

	config := &Config{
		Port:              getEnv("PORT", "8080"),
		InternalAPISecret: getEnv("GO_INTERNAL_API_SECRET", "shared-secret"),
	}

	log.Printf("Configuration loaded: Port=%s", config.Port)
	return config
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
