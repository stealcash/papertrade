package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/papertrade/backend-go/config"
	"github.com/papertrade/backend-go/internal/api"
	"github.com/papertrade/backend-go/internal/service"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Initialize services
	dataService := service.NewDataService()

	// Initialize handlers
	handler := api.NewHandler(dataService, cfg)

	// Setup Gin router
	router := gin.Default()

	// Health check endpoint
	router.GET("/health", handler.HealthCheck)

	// API v1 routes with authentication
	v1 := router.Group("/api/v1")
	v1.Use(handler.AuthMiddleware())
	{
		v1.GET("/stock/data", handler.GetStockData)
		v1.GET("/sector/data", handler.GetSectorData)

		// Options endpoints
		v1.GET("/options/contracts", handler.GetOptionContracts)
		v1.GET("/options/candles/5min", handler.GetOptionCandles)
	}

	// Start server
	addr := ":" + cfg.Port
	log.Printf("Starting Go service on %s", addr)
	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
