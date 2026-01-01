package service

import (
	"compress/gzip"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/papertrade/backend-go/internal/domain"
)

// DataService handles data generation
type DataService struct {
	client            *http.Client
	instrumentMap     map[string]string // Symbol -> InstrumentKey (e.g., RELIANCE -> NSE_EQ|INE002A01018)
	instrumentLock    sync.RWMutex
	instrumentsLoaded bool
}

// UpstoxCandleResponse represents the JSON response from Upstox Public API
type UpstoxCandleResponse struct {
	Status string `json:"status"`
	Data   struct {
		Candles [][]interface{} `json:"candles"`
	} `json:"data"`
}

// NewDataService creates a new data service and starts loading instruments
func NewDataService() *DataService {
	ds := &DataService{
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		instrumentMap: make(map[string]string),
	}

	// Load instruments in background, or block?
	// Better to block slightly or let it fail?
	// Let's block for a few seconds then proceed background to ensure reliability on fresh start.
	fmt.Println("Initializing Data Service: Loading Upstox Instruments...")
	if err := ds.loadInstruments(); err != nil {
		fmt.Printf("Error loading instruments: %v\n", err)
	} else {
		fmt.Println("Successfully loaded Upstox instruments.")
	}

	return ds
}

// loadInstruments downloads and parses the master CSV file
func (s *DataService) loadInstruments() error {
	url := "https://assets.upstox.com/market-quote/instruments/exchange/NSE.csv.gz"

	resp, err := s.client.Get(url)
	if err != nil {
		return fmt.Errorf("failed to download instruments: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("bad status code downloading instruments: %d", resp.StatusCode)
	}

	// Decompress GZIP
	gzReader, err := gzip.NewReader(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to create gzip reader: %v", err)
	}
	defer gzReader.Close()

	// Parse CSV
	csvReader := csv.NewReader(gzReader)

	// Skip Header? Checking format:
	// instrument_key,exchange_token,tradingsymbol,name,last_price,expiry,strike,tick_size,lot_size,instrument_type,isin,exchange
	// First row is usually header.
	_, err = csvReader.Read()
	if err != nil {
		return fmt.Errorf("failed to read header: %v", err)
	}

	s.instrumentLock.Lock()
	defer s.instrumentLock.Unlock()

	count := 0
	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue // Skip bad lines
		}

		// CSV Columns (Approx based on standard Upstox format):
		// 0: instrument_key (NSE_EQ|INE...)
		// 1: exchange_token
		// 2: tradingsymbol (RELIANCE)
		// 3: name
		// ...

		if len(record) < 3 {
			continue
		}

		key := record[0]
		symbol := record[2]

		// Map "RELIANCE" -> "NSE_EQ|INE..."
		s.instrumentMap[symbol] = key
		count++
	}

	// Add Index mappings manually if not in NSE.csv (Indices often in separate file or different format)
	// Common indices
	s.instrumentMap["NIFTY 50"] = "NSE_INDEX|Nifty 50"
	s.instrumentMap["NIFTY50"] = "NSE_INDEX|Nifty 50"
	s.instrumentMap["NIFTY BANK"] = "NSE_INDEX|Nifty Bank"
	s.instrumentMap["BANKNIFTY"] = "NSE_INDEX|Nifty Bank"

	s.instrumentsLoaded = true
	fmt.Printf("Loaded %d instruments from Upstox.\n", count)
	return nil
}

// GetStockData fetches real data using Upstox Public API
func (s *DataService) GetStockData(symbol, date string, timewise bool) (*domain.StockData, error) {
	// 1. Resolve Instrument Key
	key, ok := s.getInstrumentKey(symbol)
	if !ok {
		return nil, fmt.Errorf("symbol not found in instrument map: %s", symbol)
	}

	// 2. Fetch Data (Daily Candle for the requested date)
	// Fetch exactly the requested date.
	candles, err := s.fetchCandles(key, "day", date, date)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch data for %s: %v", symbol, err)
	}

	var latest []interface{}
	if len(candles) > 0 {
		latest = candles[0]
	} else {
		return nil, fmt.Errorf("no market data found for date %s", date)
	}

	// Map to Domain
	// Upstox Candle Format: [Timestamp, Open, High, Low, Close, Volume, OpenInterest]
	open := toFloat(latest[1])
	high := toFloat(latest[2])
	low := toFloat(latest[3])
	closeP := toFloat(latest[4])
	vol := toInt64(latest[5])

	data := &domain.StockData{
		Symbol:     symbol,
		Date:       date,
		OpenPrice:  open,
		HighPrice:  high,
		LowPrice:   low,
		ClosePrice: closeP,
		Volume:     vol,
		IV:         1.0,
		Extra:      make(map[string]interface{}),
	}

	// 3. Timewise Data (Intraday)
	if timewise {
		// Fetch 1minute or 5minute candles for the requested 'date'
		// If date is today, we fetch today's intraday.
		// NOTE: Upstox Historical API 'from' and 'to' are dates.
		// If we ask for '1minute' for a specific date range, we get intraday.

		// Ensure execution date matches requested date?
		// For now, let's just fetch "From requested date to requested date"
		intraday, err := s.fetchCandles(key, "5minute", date, date)
		if err == nil {
			// Convert to Domain Format
			var timeData []domain.TimewiseData

			// Upstox sends Newest First. We usually want Oldest First for charts?
			// Let's reverse it.
			for i := len(intraday) - 1; i >= 0; i-- {
				c := intraday[i]

				// Timestamp: "2025-12-31T00:00:00+05:30"
				tsStr, _ := c[0].(string)

				// Parse to HH:mm
				t, _ := time.Parse(time.RFC3339, tsStr)
				timeStr := t.Format("15:04")

				timeData = append(timeData, domain.TimewiseData{
					Time:       timeStr,
					OpenPrice:  toFloat(c[1]),
					HighPrice:  toFloat(c[2]),
					LowPrice:   toFloat(c[3]),
					ClosePrice: toFloat(c[4]),
					Volume:     toInt64(c[5]),
				})
			}
			data.Timewise = timeData
		} else {
			fmt.Printf("Warning: Failed to fetch intraday for %s: %v\n", symbol, err)
		}
	}

	return data, nil
}

// GetSectorData fetches real sector data (Indices)
func (s *DataService) GetSectorData(symbol, date string, timewise bool) (*domain.SectorData, error) {
	// Logic is identical to stock data, just reusing the method or copying logic.
	// Indices might need different instrument keys (already handled in loadInstruments).

	key, ok := s.getInstrumentKey(symbol)
	if !ok {
		// Try fallback if not in map?
		// Ensure NIFTY 50 is mapped.
		return nil, fmt.Errorf("sector symbol not found: %s", symbol)
	}

	// Fetch Day Candle for requested Date
	candles, err := s.fetchCandles(key, "day", date, date)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch sector data: %v", err)
	}

	var latest []interface{}
	if len(candles) > 0 {
		latest = candles[0]
	} else {
		return nil, fmt.Errorf("no data for sector %s on %s", symbol, date)
	}

	data := &domain.SectorData{
		Symbol:     symbol,
		Date:       date,
		OpenPrice:  toFloat(latest[1]),
		HighPrice:  toFloat(latest[2]),
		LowPrice:   toFloat(latest[3]),
		ClosePrice: toFloat(latest[4]),
		Volume:     toInt64(latest[5]),
		IV:         1.0,
		Extra:      make(map[string]interface{}),
	}

	if timewise {
		intraday, err := s.fetchCandles(key, "5minute", date, date)
		if err == nil {
			var timeData []domain.TimewiseData
			for i := len(intraday) - 1; i >= 0; i-- {
				c := intraday[i]
				tsStr, _ := c[0].(string)
				t, _ := time.Parse(time.RFC3339, tsStr)

				timeData = append(timeData, domain.TimewiseData{
					Time:       t.Format("15:04"),
					OpenPrice:  toFloat(c[1]),
					HighPrice:  toFloat(c[2]),
					LowPrice:   toFloat(c[3]),
					ClosePrice: toFloat(c[4]),
					Volume:     toInt64(c[5]),
				})
			}
			data.Timewise = timeData
		}
	}

	return data, nil
}

// --- Helpers ---

func (s *DataService) getInstrumentKey(symbol string) (string, bool) {
	s.instrumentLock.RLock()
	defer s.instrumentLock.RUnlock()

	// Try Exact Match
	if key, ok := s.instrumentMap[symbol]; ok {
		return key, true
	}

	// Try without .NS suffix if present
	if strings.HasSuffix(symbol, ".NS") {
		trimmed := strings.TrimSuffix(symbol, ".NS")
		if key, ok := s.instrumentMap[trimmed]; ok {
			return key, true
		}
	}

	return "", false
}

func (s *DataService) fetchCandles(key, interval, fromDate, toDate string) ([][]interface{}, error) {
	// URL: https://api.upstox.com/v2/historical-candle/{instrumentKey}/{interval}/{to_date}/{from_date}
	// Note: Upstox URL parameter order is TO then FROM.
	// Encode pipe in key?
	// key "NSE_EQ|INE..." often needs pipe encoded to %7C?
	// Go's http client usually handles path escaping, but let's be careful.
	// Actually, usually it's cleaner to just replace | with %7C manually if needed,
	// but let's try raw first or standard url encoding.
	// The user provided curl used %7C.

	encodedKey := strings.ReplaceAll(key, "|", "%7C")
	url := fmt.Sprintf("https://api.upstox.com/v2/historical-candle/%s/%s/%s/%s", encodedKey, interval, toDate, fromDate)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	// Public API -> No Authorization Header needed.
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "PaperTrade-Backend")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("status: %d, body: %s", resp.StatusCode, string(body))
	}

	var jsonResp UpstoxCandleResponse
	if err := json.NewDecoder(resp.Body).Decode(&jsonResp); err != nil {
		return nil, err
	}

	if jsonResp.Status != "success" {
		return nil, fmt.Errorf("api status: %s", jsonResp.Status)
	}

	return jsonResp.Data.Candles, nil
}

func toFloat(v interface{}) float64 {
	if f, ok := v.(float64); ok {
		return f
	}
	return 0.0
}

func toInt64(v interface{}) int64 {
	if f, ok := v.(float64); ok {
		return int64(f)
	} // JSON numbers are floats
	return 0
}
