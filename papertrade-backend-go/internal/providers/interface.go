package providers

import "github.com/papertrade/backend-go/internal/domain"

// StockDataProvider defines the methods required for any data source
type StockDataProvider interface {
	GetStockData(symbol, date string, timewise bool) (*domain.StockData, error)
	GetSectorData(symbol, date string, timewise bool) (*domain.SectorData, error)
}
