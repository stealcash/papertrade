package upstox

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/papertrade/backend-go/internal/domain"
)

type UpstoxProvider struct {
	client         *http.Client
	instrumentMap  map[string]string
	instrumentLock sync.RWMutex
}

type UpstoxCandleResponse struct {
	Status string `json:"status"`
	Data   struct {
		Candles [][]interface{} `json:"candles"`
	} `json:"data"`
}

func NewUpstoxProvider() *UpstoxProvider {
	p := &UpstoxProvider{
		client:        &http.Client{Timeout: 10 * time.Second},
		instrumentMap: make(map[string]string),
	}

	if err := p.loadInstruments(); err != nil {
		fmt.Printf("Error loading instruments: %v\n", err)
	} else {
		fmt.Printf("Upstox Provider: Loaded %d instruments.\n", len(p.instrumentMap))
	}
	return p
}

func (p *UpstoxProvider) loadInstruments() error {
	file, err := os.Open("instruments.json")
	if err != nil {
		return fmt.Errorf("failed to open instruments.json: %v", err)
	}
	defer file.Close()

	p.instrumentLock.Lock()
	defer p.instrumentLock.Unlock()

	if err := json.NewDecoder(file).Decode(&p.instrumentMap); err != nil {
		return fmt.Errorf("failed to decode instruments.json: %v", err)
	}
	return nil
}

func (p *UpstoxProvider) GetStockData(symbol, date string, timewise bool) (*domain.StockData, error) {
	key, ok := p.getInstrumentKey(symbol)
	if !ok {
		return nil, fmt.Errorf("symbol not found: %s", symbol)
	}

	candles, err := p.fetchCandles(key, "day", date, date)
	if err != nil {
		return nil, err
	}

	var latest []interface{}
	if len(candles) > 0 {
		latest = candles[0]
	} else {
		return nil, fmt.Errorf("no data found for %s on %s", symbol, date)
	}

	data := &domain.StockData{
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
		intraday, err := p.fetchCandles(key, "5minute", date, date)
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

func (p *UpstoxProvider) GetSectorData(symbol, date string, timewise bool) (*domain.SectorData, error) {
	key, ok := p.getInstrumentKey(symbol)
	if !ok {
		return nil, fmt.Errorf("sector not found: %s", symbol)
	}

	candles, err := p.fetchCandles(key, "day", date, date)
	if err != nil {
		return nil, err
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

	// Timewise logic for sector if needed can be added here or copied. (Skipped for brevity/duplication reduction, assuming primarily stock focus or identical logic)
	// Actually, let's include it since GetSectorData had it before.
	if timewise {
		intraday, err := p.fetchCandles(key, "5minute", date, date)
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

func (p *UpstoxProvider) getInstrumentKey(symbol string) (string, bool) {
	p.instrumentLock.RLock()
	defer p.instrumentLock.RUnlock()
	if key, ok := p.instrumentMap[symbol]; ok {
		return key, true
	}
	if strings.HasSuffix(symbol, ".NS") {
		trimmed := strings.TrimSuffix(symbol, ".NS")
		if key, ok := p.instrumentMap[trimmed]; ok {
			return key, true
		}
	}
	return "", false
}

func (p *UpstoxProvider) fetchCandles(key, interval, fromDate, toDate string) ([][]interface{}, error) {
	encodedKey := strings.ReplaceAll(key, "|", "%7C")
	url := fmt.Sprintf("https://api.upstox.com/v2/historical-candle/%s/%s/%s/%s", encodedKey, interval, toDate, fromDate)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "PaperTrade-Backend")

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("status: %d body: %s", resp.StatusCode, string(body))
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
	}
	return 0
}
