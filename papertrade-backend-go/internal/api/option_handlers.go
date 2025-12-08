package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/papertrade/backend-go/internal/domain"
)

// GetOptionContracts handles GET /api/v1/options/contracts
func (h *Handler) GetOptionContracts(c *gin.Context) {
	underlyingType := c.Query("underlying_type")
	underlying := c.Query("underlying")
	expiryDate := c.Query("expiry_date")
	atmLevelsStr := c.DefaultQuery("atm_levels", "5")
	strikeIntervalStr := c.DefaultQuery("strike_interval", "50")

	if underlyingType == "" || underlying == "" {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{
			Status:    "error",
			Code:      "MISSING_PARAMETERS",
			Message:   "underlying_type and underlying are required",
			Details:   make(map[string]interface{}),
			Timestamp: time.Now(),
		})
		return
	}

	atmLevels, _ := strconv.Atoi(atmLevelsStr)
	strikeInterval, _ := strconv.ParseFloat(strikeIntervalStr, 64)

	contracts, err := h.dataService.GenerateOptionContracts(underlyingType, underlying, expiryDate, atmLevels, strikeInterval)
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
		Message:   "Option contracts generated successfully",
		Data:      contracts,
		Timestamp: time.Now(),
	})
}

// GetOptionCandles handles GET /api/v1/options/candles/5min
func (h *Handler) GetOptionCandles(c *gin.Context) {
	underlyingType := c.Query("underlying_type")
	underlying := c.Query("underlying")
	expiryDate := c.Query("expiry_date")
	optionType := c.Query("option_type")
	strikeStr := c.Query("strike")
	date := c.Query("date")

	if underlyingType == "" || underlying == "" || expiryDate == "" || optionType == "" || strikeStr == "" || date == "" {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{
			Status:    "error",
			Code:      "MISSING_PARAMETERS",
			Message:   "All parameters are required: underlying_type, underlying, expiry_date, option_type, strike, date",
			Details:   make(map[string]interface{}),
			Timestamp: time.Now(),
		})
		return
	}

	strike, err := strconv.ParseFloat(strikeStr, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{
			Status:    "error",
			Code:      "INVALID_STRIKE",
			Message:   "Strike must be a valid number",
			Details:   make(map[string]interface{}),
			Timestamp: time.Now(),
		})
		return
	}

	contract := domain.OptionContract{
		UnderlyingType: underlyingType,
		Underlying:     underlying,
		ExpiryDate:     expiryDate,
		OptionType:     optionType,
		Strike:         strike,
	}

	candles, err := h.dataService.GenerateOptionCandles(contract, date)
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
		Message:   "Option candles generated successfully",
		Data:      candles,
		Timestamp: time.Now(),
	})
}
