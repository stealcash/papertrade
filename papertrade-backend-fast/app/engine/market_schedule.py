import json
from datetime import datetime
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

# Point to the existing django fixtures
FIXTURES_DIR = os.getenv("DJANGO_FIXTURES_DIR", "/Users/chat360team/Documents/papertrade/papertrade-backend/fixtures")

class MarketSchedule:
    _cache = {}
    
    @classmethod
    def get_holidays_for_year(cls, year):
        year_str = str(year)
        if year_str in cls._cache:
            return cls._cache[year_str]
            
        file_path = Path(FIXTURES_DIR) / 'market_holidays' / f'{year_str}.json'
        
        if not file_path.exists():
            return {}
            
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
                cls._cache[year_str] = data
                return data
        except Exception as e:
            print(f"Error loading market holidays for {year}: {e}")
            return {}

    @classmethod
    def is_market_open(cls, check_date):
        if isinstance(check_date, datetime):
            check_date = check_date.date()
            
        if check_date.weekday() >= 5:
            return False, "Weekend"
            
        year = check_date.year
        holidays = cls.get_holidays_for_year(year)
        
        date_key = check_date.strftime("%Y%m%d")
        if date_key in holidays:
            return False, holidays[date_key]
            
        return True, ""
