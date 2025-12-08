package service

import (
	"errors"
	"fmt"
	"math"
	"math/rand"
	"time"

	"github.com/papertrade/backend-go/internal/domain"
)

// GenerateOptionContracts generates option contracts (CE/PE) for given parameters
func (ds *DataService) GenerateOptionContracts(underlyingType, underlying, expiryDate string, atmLevels int, strikeInterval float64) ([]domain.OptionContract, error) {
	// Get current spot price of underlying
	var spotPrice float64
	today := time.Now().Format("2006-01-02")

	if underlyingType == "stock" {
		stockData, err := ds.GetStockData(underlying, today, false)
		if err != nil {
			return nil, err
		}
		spotPrice = stockData.ClosePrice
	} else if underlyingType == "sector" {
		sectorData, err := ds.GetSectorData(underlying, today, false)
		if err != nil {
			return nil, err
		}
		spotPrice = sectorData.ClosePrice
	} else {
		return nil, errors.New("invalid underlying_type")
	}

	// Calculate ATM strike (round to nearest  interval)
	atmStrike := math.Round(spotPrice/strikeInterval) * strikeInterval

	// Generate strikes ATM ± N levels
	var contracts []domain.OptionContract

	for i := -atmLevels; i <= atmLevels; i++ {
		strike := atmStrike + float64(i)*strikeInterval

		// CE contract
		contracts = append(contracts, domain.OptionContract{
			UnderlyingType: underlyingType,
			Underlying:     underlying,
			ExpiryDate:     expiryDate,
			OptionType:     "CE",
			Strike:         strike,
		})

		// PE contract
		contracts = append(contracts, domain.OptionContract{
			UnderlyingType: underlyingType,
			Underlying:     underlying,
			ExpiryDate:     expiryDate,
			OptionType:     "PE",
			Strike:         strike,
		})
	}

	return contracts, nil
}

// GenerateOptionCandles generates 5-min premium candles for a specific option contract
func (ds *DataService) GenerateOptionCandles(contract domain.OptionContract, date string) (*domain.OptionCandles, error) {
	// Get underlying 5-min candles first
	var underlyingCandles []domain.TimewiseData

	if contract.UnderlyingType == "stock" {
		stockData, err := ds.GetStockData(contract.Underlying, date, true)
		if err != nil {
			return nil, err
		}
		underlyingCandles = stockData.Timewise
	} else if contract.UnderlyingType == "sector" {
		sectorData, err := ds.GetSectorData(contract.Underlying, date, true)
		if err != nil {
			return nil, err
		}
		underlyingCandles = sectorData.Timewise
	} else {
		return nil, errors.New("invalid underlying_type")
	}

	// Calculate time to expiry (days)
	dateTime, _ := time.Parse("2006-01-02", date)
	expiryTime, _ := time.Parse("2006-01-02", contract.ExpiryDate)
	daysToExpiry := expiryTime.Sub(dateTime).Hours() / 24

	// Generate option premium candles
	var premiumCandles []domain.TimewiseData

	for _, underlyingCandle := range underlyingCandles {
		premium := calculateOptionPremium(
			underlyingCandle.ClosePrice,
			contract.Strike,
			contract.OptionType,
			daysToExpiry,
		)

		// Add small random noise to OHLC around the premium
		noise := (rand.Float64() - 0.5) * premium * 0.02 // ±1% noise

		premiumCandle := domain.TimewiseData{
			Time:       underlyingCandle.Time,
			OpenPrice:  math.Max(0, premium+noise),
			HighPrice:  math.Max(0, premium+math.Abs(noise)*1.5),
			LowPrice:   math.Max(0, premium-math.Abs(noise)*1.5),
			ClosePrice: math.Max(0, premium),
			Volume:     underlyingCandle.Volume / 10, // Options have lower volume
		}

		premiumCandles = append(premiumCandles, premiumCandle)
	}

	return &domain.OptionCandles{
		Contract: contract,
		Date:     date,
		Candles:  premiumCandles,
	}, nil
}

// calculateOptionPremium calculates option premium using simplified model
func calculateOptionPremium(spotPrice, strike float64, optionType string, daysToExpiry float64) float64 {
	// Intrinsic value
	var intrinsic float64
	if optionType == "CE" {
		intrinsic = math.Max(0, spotPrice-strike)
	} else { // PE
		intrinsic = math.Max(0, strike-spotPrice)
	}

	// Time value (simplified - decays with square root of time)
	timeValue := 0.0
	if daysToExpiry > 0 {
		// Base time value ~ 2% of strike, decaying with sqrt(days)
		timeValue = strike * 0.02 * math.Sqrt(daysToExpiry/30.0)
	}

	// Total premium
	premium := intrinsic + timeValue

	// Add small random factor for realism (±5%)
	randomFactor := 1.0 + (rand.Float64()-0.5)*0.1

	return math.Max(1, premium*randomFactor) // Minimum premium of 1
}

// Helper to format contract identifier
func FormatContractID(contract domain.OptionContract) string {
	return fmt.Sprintf("%s-%s-%s-%s-%.2f",
		contract.UnderlyingType,
		contract.Underlying,
		contract.ExpiryDate,
		contract.OptionType,
		contract.Strike,
	)
}
