import logging
from sqlalchemy.future import select
from sqlalchemy import desc
from app.models import Stock, StockPriceDaily
from datetime import timedelta

logger = logging.getLogger(__name__)

class PatternFinderEngine:
    def __init__(self, db):
        self.db = db

    async def find_patterns(self, symbol: str, tolerance_percent: float = 0.5):
        try:
            # 1. Fetch Stock
            result = await self.db.execute(select(Stock).filter(Stock.symbol == symbol))
            stock = result.scalar_one_or_none()
            if not stock: raise ValueError(f"Stock {symbol} not found")

            # 2. Fetch History (Last 2 Years)
            # Fetch plenty of data to ensure we have enough for 2 years analysis
            # We need date, close_price. Maybe Open/High/Low for visualization later?
            # Let's fetch all.
            limit_days = 365 * 2 + 30 # 2 years + buffer
            
            result = await self.db.execute(
                select(StockPriceDaily)
                .filter(StockPriceDaily.stock_id == stock.id)
                .order_by(desc(StockPriceDaily.date))
                .limit(limit_days)
            )
            data = result.scalars().all()
            
            # Sort by date ascending for processing
            data = sorted(data, key=lambda x: x.date)
            
            if len(data) < 14: # Need at least 7 days pattern + some history
                return {"error": "Not enough data"}

            # 3. Extract Target Pattern (Last 7 Days)
            # We use Close-to-Close % change usually, or Open-to-Close %?
            # User said: "current day to last 7 days my close percente is incrase or decarese"
            # So let's use Daily Return % based on Close Price.
            # % Change = (TodayClose - PrevClose) / PrevClose * 100
            
            # Pre-calculate % changes for the whole dataset
            dataset = []
            for i in range(1, len(data)):
                prev = data[i-1]
                curr = data[i]
                
                prev_close = float(prev.close_price)
                curr_close = float(curr.close_price)
                
                if prev_close == 0: change = 0
                else: change = ((curr_close - prev_close) / prev_close) * 100
                
                dataset.append({
                    "date": curr.date,
                    "close": curr_close,
                    "open": float(curr.open_price),
                    "high": float(curr.high_price),
                    "low": float(curr.low_price),
                    "change_pct": change,
                    "obj": curr
                })

            if len(dataset) < 7: return {"error": "Not enough data for pattern"}

            target_pattern = dataset[-7:] # Last 7 records
            target_changes = [d['change_pct'] for d in target_pattern]
            
            # 4. Scan History
            matches = []
            
            # We scan from start until the current pattern starts (don't match the current pattern itself against itself)
            # Scan window size = 7
            # We also need +3 days for projection, so stop scanning 7+3 days before end
            scan_end_index = len(dataset) - 7 - 3 
            
            for i in range(len(dataset) - 7): # Adjusted loop to simpler bounds, will check locally
                if i > scan_end_index: break
                
                window = dataset[i : i+7]
                window_changes = [d['change_pct'] for d in window]
                
                # Check match
                is_match = True
                for j in range(7):
                    diff = abs(window_changes[j] - target_changes[j])
                    if diff > tolerance_percent:
                        is_match = False
                        break
                
                if is_match:
                    # Found a match!
                    # Get next 3 days
                    projection = []
                    if i + 7 + 3 <= len(dataset):
                        proj_data = dataset[i+7 : i+7+3]
                        projection = [{
                            "day": k+1,
                            "change_pct": p['change_pct'],
                            "close": p['close']
                        } for k, p in enumerate(proj_data)]
                    
                    matches.append({
                        "date": window[-1]['date'].isoformat(), # End date of the pattern found
                        "start_date": window[0]['date'].isoformat(),
                        "pattern_data": [d['change_pct'] for d in window],
                        "projection_data": projection
                    })

            # 5. Aggregate Results
            # Sort matches by date descending (most recent matches first)
            matches.reverse()
            
            avg_return_3d = 0
            if matches:
                total_ret = sum([sum(d['change_pct'] for d in m['projection_data']) for m in matches])
                avg_return_3d = total_ret / len(matches)

            return {
                "symbol": symbol,
                "target_pattern": [{
                    "date": d['date'].isoformat(),
                    "change_pct": d['change_pct'],
                    "close": d['close']
                } for d in target_pattern],
                "matches": matches,
                "count": len(matches),
                "avg_3d_return": avg_return_3d
            }

        except Exception as e:
            logger.error(f"Pattern Finder failed: {e}", exc_info=True)
            raise e
