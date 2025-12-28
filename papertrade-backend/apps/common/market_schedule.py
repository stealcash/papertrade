import os
import json
from datetime import datetime, date
from django.conf import settings
from pathlib import Path

class MarketSchedule:
    _cache = {}
    
    @classmethod
    def get_holidays_for_year(cls, year):
        """
        Get holidays for a specific year.
        Uses in-memory caching to avoid repeated file reads.
        """
        year_str = str(year)
        if year_str in cls._cache:
            return cls._cache[year_str]
            
        file_path = Path(settings.BASE_DIR) / 'fixtures' / 'market_holidays' / f'{year_str}.json'
        
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
        """
        Check if market is open on a given date.
        Returns: (is_open: bool, reason: str)
        """
        if isinstance(check_date, datetime):
            check_date = check_date.date()
            
        # 1. Check Weekend
        # 5 = Saturday, 6 = Sunday
        if check_date.weekday() >= 5:
            return False, "Weekend"
            
        # 2. Check Holiday File
        year = check_date.year
        holidays = cls.get_holidays_for_year(year)
        
        date_key = check_date.strftime("%Y%m%d")
        if date_key in holidays:
            return False, holidays[date_key]
            
        return True, ""

    @classmethod
    def get_holiday_reason(cls, check_date):
        is_open, reason = cls.is_market_open(check_date)
        return reason if not is_open else None
