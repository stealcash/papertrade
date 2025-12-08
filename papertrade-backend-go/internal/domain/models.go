package domain

import "time"

// StockData represents stock price data
type StockData struct {
	StockEnum  string          `json:"stock_enum"`
	Date       string          `json:"date"`
	OpenPrice  float64         `json:"open_price"`
	HighPrice  float64         `json:"high_price"`
	LowPrice   float64         `json:"low_price"`
	ClosePrice float64         `json:"close_price"`
	Volume     int64           `json:"volume"`
	IV         float64         `json:"iv"`
	Timewise   []TimewiseData  `json:"timewise,omitempty"`
	Extra      map[string]interface{} `json:"extra,omitempty"`
}

// SectorData represents sector price data
type SectorData struct {
	SectorEnum string          `json:"sector_enum"`
	Date       string          `json:"date"`
	OpenPrice  float64         `json:"open_price"`
	HighPrice  float64         `json:"high_price"`
	LowPrice   float64         `json:"low_price"`
	ClosePrice float64         `json:"close_price"`
	Volume     int64           `json:"volume"`
	IV         float64         `json:"iv"`
	Timewise   []TimewiseData  `json:"timewise,omitempty"`
	Extra      map[string]interface{} `json:"extra,omitempty"`
}

// TimewiseData represents 5-minute candle data
type TimewiseData struct {
	Time       string  `json:"time"`
	OpenPrice  float64 `json:"open_price"`
	HighPrice  float64 `json:"high_price"`
	LowPrice   float64 `json:"low_price"`
	ClosePrice float64 `json:"close_price"`
	Volume     int64   `json:"volume"`
}

// OptionContract represents an option contract (CE/PE)
type OptionContract struct {
	UnderlyingType string  `json:"underlying_type"` // "stock" or "sector"
	Underlying     string  `json:"underlying"`      // RELIANCE, NIFTY50
	ExpiryDate     string  `json:"expiry_date"`     // YYYY-MM-DD
	OptionType     string  `json:"option_type"`     // CE or PE
	Strike         float64 `json:"strike"`
}

// OptionCandles represents 5-min premium candles for an option
type OptionCandles struct {
	Contract   OptionContract  `json:"contract"`
	Date       string          `json:"date"`
	Candles    []TimewiseData  `json:"candles"`
}

// ErrorResponse represents API error response
type ErrorResponse struct {
	Status    string                 `json:"status"`
	Code      string                 `json:"code"`
	Message   string                 `json:"message"`
	Details   map[string]interface{} `json:"details"`
	Timestamp time.Time              `json:"timestamp"`
}

// SuccessResponse represents API success response
type SuccessResponse struct {
	Status    string      `json:"status"`
	Message   string      `json:"message"`
	Data      interface{} `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
}
