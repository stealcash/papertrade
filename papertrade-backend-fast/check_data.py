import asyncio
import os
from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models import OptionDailyData, StockPriceDaily, Stock
import datetime

async def check_data():
    async with AsyncSessionLocal() as db:
        start_date = datetime.date(2026, 1, 1)
        end_date = datetime.date(2026, 1, 31)
        
        # 1. Check Spot Prices for NIFTY50
        result = await db.execute(select(Stock).filter(Stock.symbol == "NIFTY50"))
        stock = result.scalar_one_or_none()
        if stock:
            spot_count = await db.execute(
                select(func.count(StockPriceDaily.id))
                .filter(StockPriceDaily.stock_id == stock.id, StockPriceDaily.date >= start_date, StockPriceDaily.date <= end_date)
            )
            print(f"Spot prices for NIFTY50 in Jan 2026: {spot_count.scalar()}")
        else:
            print("Stock NIFTY50 not found")
            
        # 2. Check Option Data for NIFTY
        opt_count = await db.execute(
            select(func.count(OptionDailyData.id))
            .filter(OptionDailyData.underlying_symbol == "NIFTY", OptionDailyData.date >= start_date, OptionDailyData.date <= end_date)
        )
        print(f"OptionDailyData for NIFTY in Jan 2026: {opt_count.scalar()}")
        
        # 3. Check Expiries
        expiries = await db.execute(
            select(OptionDailyData.expiry_date)
            .filter(OptionDailyData.underlying_symbol == "NIFTY", OptionDailyData.expiry_date >= start_date)
            .distinct()
            .order_by(OptionDailyData.expiry_date)
            .limit(5)
        )
        print(f"Next 5 expiries for NIFTY: {[r[0] for r in expiries]}")

if __name__ == "__main__":
    asyncio.run(check_data())
