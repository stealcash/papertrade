package service

import (
	"fmt"
	"os"

	"github.com/papertrade/backend-go/internal/domain"
	"github.com/papertrade/backend-go/internal/providers"
	"github.com/papertrade/backend-go/internal/providers/random"
	"github.com/papertrade/backend-go/internal/providers/upstox"
)

type DataService struct {
	provider providers.StockDataProvider
}

func NewDataService() *DataService {
	source := os.Getenv("DATA_PROVIDER")
	var p providers.StockDataProvider

	if source == "RANDOM" {
		fmt.Println("Using Data Provider: RANDOM")
		p = random.NewRandomProvider()
	} else {
		// Default to Upstox
		fmt.Println("Using Data Provider: UPSTOX")
		p = upstox.NewUpstoxProvider()
	}

	return &DataService{provider: p}
}

func (s *DataService) GetStockData(symbol, date string, timewise bool) (*domain.StockData, error) {
	return s.provider.GetStockData(symbol, date, timewise)
}

func (s *DataService) GetSectorData(symbol, date string, timewise bool) (*domain.SectorData, error) {
	return s.provider.GetSectorData(symbol, date, timewise)
}
