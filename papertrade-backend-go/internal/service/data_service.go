package service

import (
	"fmt"
	"math"
	"math/rand"
	"time"

	"github.com/papertrade/backend-go/internal/domain"
)

// DataService handles data generation
type DataService struct {
	rand *rand.Rand
}

// NewDataService creates a new data service
func NewDataService() *DataService {
	return &DataService{
		rand: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// GetStockData generates dummy stock data
func (s *DataService) GetStockData(stockEnum, date string, timewise bool) (*domain.StockData, error) {
	// Base price depends on stock
	basePrice := s.getBasePrice(stockEnum)

	// Generate daily OHLCV
	data := &domain.StockData{
		StockEnum:  stockEnum,
		Date:       date,
		OpenPrice:  basePrice + s.randomFloat(-10, 10),
		HighPrice:  basePrice + s.randomFloat(5, 20),
		LowPrice:   basePrice + s.randomFloat(-20, -5),
		ClosePrice: basePrice + s.randomFloat(-8, 8),
		Volume:     int64(s.randomInt(1000000, 10000000)),
		IV:         s.randomFloat(15, 35),
		Extra:      make(map[string]interface{}),
	}

	// Ensure high is highest and low is lowest
	data.HighPrice = math.Max(data.HighPrice, math.Max(data.OpenPrice, data.ClosePrice))
	data.LowPrice = math.Min(data.LowPrice, math.Min(data.OpenPrice, data.ClosePrice))

	// Generate timewise data if requested
	if timewise {
		data.Timewise = s.generateTimewiseData(data.OpenPrice, data.ClosePrice)
	}

	return data, nil
}

// GetSectorData generates dummy sector data
func (s *DataService) GetSectorData(sectorEnum, date string, timewise bool) (*domain.SectorData, error) {
	// Base value depends on sector
	baseValue := s.getSectorBaseValue(sectorEnum)

	// Generate daily OHLCV
	data := &domain.SectorData{
		SectorEnum: sectorEnum,
		Date:       date,
		OpenPrice:  baseValue + s.randomFloat(-100, 100),
		HighPrice:  baseValue + s.randomFloat(50, 200),
		LowPrice:   baseValue + s.randomFloat(-200, -50),
		ClosePrice: baseValue + s.randomFloat(-80, 80),
		Volume:     int64(s.randomInt(50000000, 200000000)),
		IV:         s.randomFloat(12, 28),
		Extra:      make(map[string]interface{}),
	}

	// Ensure high is highest and low is lowest
	data.HighPrice = math.Max(data.HighPrice, math.Max(data.OpenPrice, data.ClosePrice))
	data.LowPrice = math.Min(data.LowPrice, math.Min(data.OpenPrice, data.ClosePrice))

	// Generate timewise data if requested
	if timewise {
		data.Timewise = s.generateTimewiseData(data.OpenPrice, data.ClosePrice)
	}

	return data, nil
}

func (s *DataService) getBasePrice(stockEnum string) float64 {
	prices := map[string]float64{
		"RELIANCE": 2500.0,
		"TCS":      3500.0,
		"INFY":     1500.0,
	}

	if price, ok := prices[stockEnum]; ok {
		return price
	}
	return 1000.0 // Default
}

func (s *DataService) getSectorBaseValue(sectorEnum string) float64 {
	values := map[string]float64{
		"NIFTY50":   19500.0,
		"NIFTYIT":   30000.0,
		"BANKNIFTY": 44000.0,
	}

	if value, ok := values[sectorEnum]; ok {
		return value
	}
	return 10000.0 // Default
}

func (s *DataService) generateTimewiseData(openPrice, closePrice float64) []domain.TimewiseData {
	timewise := make([]domain.TimewiseData, 0)

	// Generate 5-minute candles from 9:15 to 15:30 (IST market hours)
	startHour, startMin := 9, 15
	endHour, endMin := 15, 30

	currentPrice := openPrice
	priceStep := (closePrice - openPrice) / 75.0 // Approximate number of 5-min intervals

	for hour := startHour; hour <= endHour; hour++ {
		startMinute := 0
		if hour == startHour {
			startMinute = startMin
		}

		endMinute := 59
		if hour == endHour {
			endMinute = endMin
		}

		for minute := startMinute; minute <= endMinute; minute += 5 {
			if hour == endHour && minute > endMin {
				break
			}

			timeStr := fmt.Sprintf("%02d:%02d", hour, minute)

			open := currentPrice
			close := currentPrice + priceStep + s.randomFloat(-5, 5)
			high := math.Max(open, close) + s.randomFloat(0, 3)
			low := math.Min(open, close) - s.randomFloat(0, 3)

			timewise = append(timewise, domain.TimewiseData{
				Time:       timeStr,
				OpenPrice:  open,
				HighPrice:  high,
				LowPrice:   low,
				ClosePrice: close,
				Volume:     int64(s.randomInt(10000, 100000)),
			})

			currentPrice = close
		}
	}

	return timewise
}

func (s *DataService) randomFloat(min, max float64) float64 {
	return min + s.rand.Float64()*(max-min)
}

func (s *DataService) randomInt(min, max int) int {
	return min + s.rand.Intn(max-min)
}
