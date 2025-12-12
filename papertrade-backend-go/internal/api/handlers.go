package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/papertrade/backend-go/config"
	"github.com/papertrade/backend-go/internal/domain"
	"github.com/papertrade/backend-go/internal/service"
)

// Handler handles HTTP requests
type Handler struct {
	dataService *service.DataService
	config      *config.Config
}

// NewHandler creates a new handler
func NewHandler(dataService *service.DataService, cfg *config.Config) *Handler {
	return &Handler{
		dataService: dataService,
		config:      cfg,
	}
}

// AuthMiddleware validates X-API-KEY header
func (h *Handler) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := c.GetHeader("X-API-KEY")

		if apiKey != h.config.InternalAPISecret {
			c.JSON(http.StatusUnauthorized, domain.ErrorResponse{
				Status:    "error",
				Code:      "UNAUTHORIZED",
				Message:   "Invalid or missing X-API-KEY header",
				Details:   make(map[string]interface{}),
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// GetStockData handles GET /api/v1/stock/data
func (h *Handler) GetStockData(c *gin.Context) {
	symbol := c.Query("symbol")
	date := c.Query("date")
	timewise := c.Query("timewise") == "true"

	if symbol == "" || date == "" {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{
			Status:    "error",
			Code:      "MISSING_PARAMETERS",
			Message:   "symbol and date are required",
			Details:   make(map[string]interface{}),
			Timestamp: time.Now(),
		})
		return
	}

	data, err := h.dataService.GetStockData(symbol, date, timewise)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{
			Status:    "error",
			Code:      "INTERNAL_ERROR",
			Message:   err.Error(),
			Details:   make(map[string]interface{}),
			Timestamp: time.Now(),
		})
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse{
		Status:    "success",
		Message:   "Stock data retrieved successfully",
		Data:      data,
		Timestamp: time.Now(),
	})
}

// GetSectorData handles GET /api/v1/sector/data
func (h *Handler) GetSectorData(c *gin.Context) {
	symbol := c.Query("symbol")
	date := c.Query("date")
	timewise := c.Query("timewise") == "true"

	if symbol == "" || date == "" {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{
			Status:    "error",
			Code:      "MISSING_PARAMETERS",
			Message:   "symbol and date are required",
			Details:   make(map[string]interface{}),
			Timestamp: time.Now(),
		})
		return
	}

	data, err := h.dataService.GetSectorData(symbol, date, timewise)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{
			Status:    "error",
			Code:      "INTERNAL_ERROR",
			Message:   err.Error(),
			Details:   make(map[string]interface{}),
			Timestamp: time.Now(),
		})
		return
	}

	c.JSON(http.StatusOK, domain.SuccessResponse{
		Status:    "success",
		Message:   "Sector data retrieved successfully",
		Data:      data,
		Timestamp: time.Now(),
	})
}

// HealthCheck handles GET /health
func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "papertrade-go-service",
		"time":    time.Now(),
	})
}
