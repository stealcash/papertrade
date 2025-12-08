"""
Additional backtest strategies.
"""
from decimal import Decimal
from typing import List
from apps.stocks.models import StockPriceDaily


class RSIStrategy:
    """Relative Strength Index strategy."""
    
    def __init__(self, period=14, oversold=30, overbought=70):
        self.period = period
        self.oversold = oversold
        self.overbought = overbought
    
    def calculate_rsi(self, prices: List[StockPriceDaily]) -> Decimal:
        """Calculate RSI."""
        if len(prices) < self.period:
            return Decimal('50')
        
        gains = []
        losses = []
        
        for i in range(1, len(prices)):
            change = Decimal(str(prices[i].close_price)) - Decimal(str(prices[i-1].close_price))
            if change > 0:
                gains.append(change)
                losses.append(Decimal('0'))
            else:
                gains.append(Decimal('0'))
                losses.append(abs(change))
        
        avg_gain = sum(gains[-self.period:]) / self.period
        avg_loss = sum(losses[-self.period:]) / self.period
        
        if avg_loss == 0:
            return Decimal('100')
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def generate_signal(self, prices: List[StockPriceDaily]) -> str:
        """Generate buy/sell/hold signal."""
        rsi = self.calculate_rsi(prices)
        
        if rsi < self.oversold:
            return 'buy'
        elif rsi > self.overbought:
            return 'sell'
        return 'hold'


class MACDStrategy:
    """Moving Average Convergence Divergence strategy."""
    
    def __init__(self, fast_period=12, slow_period=26, signal_period=9):
        self.fast_period = fast_period
        self.slow_period = slow_period
        self.signal_period = signal_period
    
    def calculate_ema(self, prices: List[Decimal], period: int) -> Decimal:
        """Calculate Exponential Moving Average."""
        if len(prices) < period:
            return sum(prices) / len(prices) if prices else Decimal('0')
        
        multiplier = Decimal('2') / (period + 1)
        ema = sum(prices[:period]) / period
        
        for price in prices[period:]:
            ema = (price * multiplier) + (ema * (1 - multiplier))
        
        return ema
    
    def generate_signal(self, prices: List[StockPriceDaily]) -> str:
        """Generate buy/sell/hold signal."""
        close_prices = [Decimal(str(p.close_price)) for p in prices]
        
        if len(close_prices) < self.slow_period:
            return 'hold'
        
        fast_ema = self.calculate_ema(close_prices, self.fast_period)
        slow_ema = self.calculate_ema(close_prices, self.slow_period)
        
        macd = fast_ema - slow_ema
        
        # Simple signal: positive MACD = buy, negative = sell
        if macd > 0:
            return 'buy'
        elif macd < 0:
            return 'sell'
        return 'hold'


class BollingerBandsStrategy:
    """Bollinger Bands strategy."""
    
    def __init__(self, period=20, std_dev=2):
        self.period = period
        self.std_dev = std_dev
    
    def calculate_bands(self, prices: List[StockPriceDaily]):
        """Calculate Bollinger Bands."""
        if len(prices) < self.period:
            return None, None, None
        
        close_prices = [Decimal(str(p.close_price)) for p in prices[-self.period:]]
        
        # Middle band (SMA)
        middle = sum(close_prices) / self.period
        
        # Standard deviation
        variance = sum((p - middle) ** 2 for p in close_prices) / self.period
        std = variance ** Decimal('0.5')
        
        # Upper and lower bands
        upper = middle + (std * self.std_dev)
        lower = middle - (std * self.std_dev)
        
        return upper, middle, lower
    
    def generate_signal(self, prices: List[StockPriceDaily]) -> str:
        """Generate buy/sell/hold signal."""
        upper, middle, lower = self.calculate_bands(prices)
        
        if upper is None:
            return 'hold'
        
        current_price = Decimal(str(prices[-1].close_price))
        
        # Buy when price touches lower band
        if current_price <= lower:
            return 'buy'
        # Sell when price touches upper band
        elif current_price >= upper:
            return 'sell'
        return 'hold'


class MomentumStrategy:
    """Momentum strategy based on price rate of change."""
    
    def __init__(self, period=10, threshold=5):
        self.period = period
        self.threshold = threshold  # Percentage threshold
    
    def calculate_momentum(self, prices: List[StockPriceDaily]) -> Decimal:
        """Calculate momentum as percentage change."""
        if len(prices) < self.period:
            return Decimal('0')
        
        current_price = Decimal(str(prices[-1].close_price))
        past_price = Decimal(str(prices[-self.period].close_price))
        
        if past_price == 0:
            return Decimal('0')
        
        momentum = ((current_price - past_price) / past_price) * 100
        return momentum
    
    def generate_signal(self, prices: List[StockPriceDaily]) -> str:
        """Generate buy/sell/hold signal."""
        momentum = self.calculate_momentum(prices)
        
        if momentum > self.threshold:
            return 'buy'
        elif momentum < -self.threshold:
            return 'sell'
        return 'hold'
