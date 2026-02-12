from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, DateTime, JSON, Boolean, Numeric, Text, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from .database import Base
import datetime

class User(Base):
    __tablename__ = "users_user"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)

class Stock(Base):
    __tablename__ = "stocks_stock"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, index=True)
    name = Column(String)
    is_index = Column(Boolean, default=False)
    status = Column(String, default="active")

class StockPriceDaily(Base):
    __tablename__ = "stock_price_daily"
    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks_stock.id"))
    date = Column(Date, index=True)
    open_price = Column(Numeric(15, 2))
    high_price = Column(Numeric(15, 2))
    low_price = Column(Numeric(15, 2))
    close_price = Column(Numeric(15, 2))
    volume = Column(Integer)
    
    stock = relationship("Stock", backref="daily_prices")

class OptionDailyData(Base):
    __tablename__ = "option_daily_data"
    id = Column(Integer, primary_key=True, index=True)
    underlying_symbol = Column(String, index=True)
    expiry_date = Column(Date, index=True)
    strike_price = Column(Numeric(10, 2))
    option_type = Column(String(2))
    date = Column(Date, index=True)
    open_price = Column(Numeric(15, 2))
    high_price = Column(Numeric(15, 2))
    low_price = Column(Numeric(15, 2))
    close_price = Column(Numeric(15, 2))
    volume = Column(Integer)
    underlying_value = Column(Numeric(15, 2))

class StrategyMaster(Base):
    __tablename__ = "strategies_master"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)
    name = Column(String)
    type = Column(String)
    rule_based_strategy_id = Column(Integer, ForeignKey("strategies_rule_based.id"), nullable=True)

class StrategyRuleBased(Base):
    __tablename__ = "strategies_rule_based"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    rules_json = Column(JSON)

class OptionStrategy(Base):
    __tablename__ = "strategies_option"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    configuration = Column(JSON)

class BacktestRun(Base):
    __tablename__ = "backtest_runs"
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users_user.id"))
    strategy_predefined_id = Column(Integer, ForeignKey("strategies_master.id"), nullable=True)
    strategy_rule_based_id = Column(Integer, ForeignKey("strategies_rule_based.id"), nullable=True)
    start_date = Column(Date)
    end_date = Column(Date)
    initial_wallet_amount = Column(Numeric(15, 2))
    status = Column(String, default="pending")
    total_signals = Column(Integer, default=0)
    win_count = Column(Integer, default=0)
    loss_count = Column(Integer, default=0)
    win_rate = Column(Numeric(5, 2))
    list_of_trades_json = Column(JSON, default=list)
    time_taken = Column(Float)
    error_message = Column(Text)
    criteria_type = Column(String, default="direction")
    magnitude_threshold = Column(Integer, default=50)
    trade_strategy = Column(String)
    final_wallet_amount = Column(Numeric(15, 2))
    total_pnl = Column(Numeric(15, 2))
    pnl_percentage = Column(Numeric(10, 2))
    number_of_trades = Column(Integer, default=0)

class OptionBacktestRun(Base):
    __tablename__ = "option_backtest_runs"
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users_user.id"))
    strategy_id = Column(Integer, ForeignKey("strategies_option.id"))
    underlying_symbol = Column(String)
    start_date = Column(Date)
    end_date = Column(Date)
    lot_size = Column(Integer, default=50)

    # Strategy Snapshot fields
    snapshot_name = Column(String, nullable=True)
    snapshot_description = Column(Text, nullable=True)
    snapshot_config = Column(JSON, nullable=True)
    
    # Results
    status = Column(String, default="pending")
    total_trades = Column(Integer, default=0)
    win_count = Column(Integer, default=0)
    loss_count = Column(Integer, default=0)
    win_rate = Column(Numeric(5, 2))
    total_pnl = Column(Numeric(15, 2))
    
    results_summary_json = Column(JSON, default=dict)
    
    time_taken = Column(Float)
    error_message = Column(Text)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class OptionTrade(Base):
    __tablename__ = "option_trades"
    id = Column(Integer, primary_key=True, index=True)
    backtest_run_id = Column(Integer, ForeignKey("option_backtest_runs.id"))
    user_id = Column(Integer, ForeignKey("users_user.id"))
    underlying_symbol = Column(String)
    entry_date = Column(Date)
    exit_date = Column(Date)
    expiry_date = Column(Date)
    legs_json = Column(JSON)
    total_pnl = Column(Numeric(15, 2))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
