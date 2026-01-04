package random

import (
	"math/rand"
	"time"

	"github.com/papertrade/backend-go/internal/domain"
)

type RandomProvider struct{}

func NewRandomProvider() *RandomProvider {
	rand.Seed(time.Now().UnixNano())
	return &RandomProvider{}
}

func (p *RandomProvider) GetStockData(symbol, date string, timewise bool) (*domain.StockData, error) {
	// Generate base price between 1000 and 2000
	basePrice := 1000.0 + rand.Float64()*1000.0

	data := &domain.StockData{
		Symbol:     symbol,
		Date:       date,
		OpenPrice:  basePrice,
		HighPrice:  basePrice * 1.02,
		LowPrice:   basePrice * 0.98,
		ClosePrice: basePrice * 1.01,
		Volume:     int64(rand.Intn(1000000) + 500000),
		IV:         0.5 + rand.Float64()*0.5,
		Extra:      make(map[string]interface{}),
	}

	if timewise {
		var candles []domain.TimewiseData
		// Generate 75 5-min candles (approx 6.5 hours)
		currentPrice := basePrice
		startTime, _ := time.Parse("15:04", "09:15")

		for i := 0; i < 75; i++ {
			change := (rand.Float64() - 0.5) * 10
			open := currentPrice
			closeP := currentPrice + change
			high := max(open, closeP) + rand.Float64()*2
			low := min(open, closeP) - rand.Float64()*2

			candles = append(candles, domain.TimewiseData{
				Time:       startTime.Add(time.Duration(i*5) * time.Minute).Format("15:04"),
				OpenPrice:  open,
				HighPrice:  high,
				LowPrice:   low,
				ClosePrice: closeP,
				Volume:     int64(rand.Intn(10000)),
			})
			currentPrice = closeP
		}
		data.Timewise = candles
	}

	return data, nil
}

func (p *RandomProvider) GetSectorData(symbol, date string, timewise bool) (*domain.SectorData, error) {
	// Similar logic for sectors
	basePrice := 10000.0 + rand.Float64()*5000.0 // Indices usually higher

	data := &domain.SectorData{
		Symbol:     symbol,
		Date:       date,
		OpenPrice:  basePrice,
		HighPrice:  basePrice * 1.01,
		LowPrice:   basePrice * 0.99,
		ClosePrice: basePrice * 1.005,
		Volume:     0, // Indices often have 0 volume here or handled differently
		IV:         15.0 + rand.Float64()*5.0,
		Extra:      make(map[string]interface{}),
	}

	if timewise {
		// ... (Similar candle generation if needed, or skip for brevity)
	}
	return data, nil
}

func max(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}
func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
