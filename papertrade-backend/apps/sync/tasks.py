"""
Celery tasks for sync operations.
"""
from celery import shared_task
from django.utils import timezone
from django.conf import settings
from django.db import transaction
import requests
import logging
import time
from datetime import datetime, timedelta, date
from .models import SyncLog
from .utils import ExternalAPILogger
from apps.stocks.models import Stock, StockPriceDaily
from apps.sectors.models import Sector
from apps.common.market_schedule import MarketSchedule

logger = logging.getLogger(__name__)


@shared_task
def auto_sync_daily():
    """Auto sync task that runs daily at configured time."""
    logger.info("Starting auto sync daily task")
    
    # Sync stocks
    # Sync stock task now handles both stocks and indices (is_index=True)
    sync_stocks_task.delay(is_auto=True)
    
    logger.info("Auto sync daily task completed")
    return "Sync tasks queued"


@shared_task
def sync_stocks_task(is_auto=False, user_id=None, from_date=None, to_date=None, instruments=None, sync_indices=None):
    """
    Sync stock data from Go service.
    
    Args:
        is_auto: Whether this is an auto sync
        user_id: User who triggered manual sync
        from_date: Start date for hard sync
        to_date: End date for hard sync
        instruments: Optional list of stock symbols to sync
        sync_indices: If True, sync ONLY indices. If False, sync ONLY stocks. If None, sync ALL.
    """
    from apps.adminpanel.models import SystemConfig

    start_time = timezone.now()
    api_logger = ExternalAPILogger()
    
    # Determine sync type for logging
    log_sync_type = 'stock'
    if sync_indices is True:
        log_sync_type = 'sector'
    
    # Create sync log
    sync_log = SyncLog.objects.create(
        sync_type=log_sync_type,
        is_auto_sync=is_auto,
        triggered_by_user_id=user_id,
        start_time=start_time,
    )
    
    try:
        # Get active stocks
        print(f"DTO-DEBUG: Starting sync_stocks_task. Instruments: {instruments}, Sync Indices: {sync_indices}")
        query = Stock.objects.filter(status='active')
        
        if instruments:
            query = query.filter(symbol__in=instruments)
            
        if sync_indices is not None:
            query = query.filter(is_index=sync_indices)
            
        stocks = query
        total_items = stocks.count()
        success_count = 0
        failed_count = 0
        errors = []
        
        # Determine global settings
        # Default Start Date
        default_start_date_config = SystemConfig.objects.filter(key='sync.default_start_date').first()
        default_start_date_str = default_start_date_config.value if default_start_date_config else '2020-01-01'
        try:
            global_default_start = datetime.strptime(default_start_date_str, '%Y-%m-%d').date()
        except ValueError:
            global_default_start = datetime(2020, 1, 1).date()

        # Go Service URL
        go_service_url_config = SystemConfig.objects.filter(key='go_service_url').first()
        go_service_base_url = go_service_url_config.value if go_service_url_config else settings.GO_SERVICE_URL
        go_service_base_url = go_service_base_url.rstrip('/')
        
        # Internal API Secret
        internal_api_secret_config = SystemConfig.objects.filter(key='internal_api_secret').first()
        internal_api_secret = internal_api_secret_config.value if internal_api_secret_config else settings.INTERNAL_API_SECRET

        # Initialize variables
        end_date = timezone.now().date()
        total_items = stocks.count()
        success_count = 0
        failed_count = 0
        
        # Sync each stock
        for stock in stocks:
            try:
                # Determine date range
                if from_date and to_date:
                    # Hard sync - process all stocks
                    stock_start_date = datetime.strptime(from_date, '%Y-%m-%d').date()
                    end_date = datetime.strptime(to_date, '%Y-%m-%d').date()
                else:
                    # Normal sync - incremental
                    end_date = timezone.now().date()
                    
                    if stock.last_synced_at:
                        stock_start_date = stock.last_synced_at.date()
                    else:
                        stock_start_date = global_default_start
                
                # Clamp end_date to today to prevent future data from Go service
                today = timezone.now().date()
                if end_date > today:
                    end_date = today
                
                # Sync date range
                saved_records_count = 0  # Track if we saved any data
                current_date = stock_start_date
                while current_date <= end_date:
                    # Check Market Status (File-Based)
                    is_open, reason = MarketSchedule.is_market_open(current_date)
                    if not is_open:
                        logger.info(f"Skipping {stock.symbol} for {current_date}: Market Closed ({reason})")
                        current_date += timedelta(days=1)
                        continue

                    try:
                        req_start = time.time()
                        # ... (Rest of existing logic)
                        if getattr(stock, 'is_index', False):
                            url = f"{go_service_base_url}/sector/data"
                            params = {
                                'symbol': stock.symbol,
                                'date': current_date.isoformat(),
                                'timewise': 'false'
                            }
                        else:
                            url = f"{go_service_base_url}/stock/data"
                            params = {
                                'symbol': stock.symbol,
                                'date': current_date.isoformat(),
                                'timewise': 'true'
                            }
                        
                        try:
                            # Call Go service
                            response = requests.get(
                                url,
                                params=params,
                                headers={
                                    'X-API-KEY': internal_api_secret
                                },
                                timeout=10
                            )
                            duration = (time.time() - req_start) * 1000
                            
                            # Log request
                            api_logger.log(
                                url=url,
                                method='GET',
                                params=params,
                                response_status=response.status_code,
                                response_body=response.text,
                                duration_ms=duration
                            )
                        except Exception as e:
                            duration = (time.time() - req_start) * 1000
                            api_logger.log(
                                url=url,
                                method='GET',
                                params=params,
                                response_status=0,
                                response_body=str(e),
                                duration_ms=duration
                            )
                            raise e
                        
                        if response.status_code == 200:
                            data = response.json()['data']
                            
                            print(f"DTO-DEBUG: Got data for {stock.symbol} on {current_date}")
                            
                            # Save daily price
                            try:
                                obj, created = StockPriceDaily.objects.update_or_create(
                                    stock=stock,
                                    date=current_date,
                                    defaults={
                                        'open_price': data['open_price'],
                                        'high_price': data['high_price'],
                                        'low_price': data['low_price'],
                                        'close_price': data['close_price'],
                                        'volume': data['volume'],
                                        'iv': data.get('iv'),
                                        'extra': data.get('extra', {}),
                                    }
                                )
                                saved_records_count += 1  # Increment counter on successful save
                            except Exception as save_err:
                                raise save_err
                            
                        # Save 5-min candles if available
                        # (Removed per user request as Stock5MinByDay is deleted)
                        
                        else:
                            # No data for this date - might be market closed
                            pass
                    
                    except Exception as e:
                        logger.warning(f"Failed to sync {stock.symbol} for {current_date}: {str(e)}")
                    
                    current_date += timedelta(days=1)
                
                # ONLY update last_synced_at if we saved at least one record
                if saved_records_count > 0:
                    stock.last_synced_at = timezone.now()
                    stock.save()
                
                
                success_count += 1
                
            except Exception as e:
                failed_count += 1
                errors.append({
                    'stock': stock.symbol,
                    'error': str(e)
                })
                logger.error(f"Failed to sync stock {stock.symbol}: {str(e)}")
        
        
        # Update sync log
        sync_log.end_time = timezone.now()
        sync_log.total_items = total_items
        sync_log.success_count = success_count
        sync_log.failed_count = failed_count
        sync_log.error_details = {'errors': errors}
        sync_log.save()
        
        logger.info(f"Stock sync completed: {success_count}/{total_items} successful")
        
    except Exception as e:
        logger.error(f"Stock sync task failed: {str(e)}")
        sync_log.error_details = {'error': str(e)}
        sync_log.save()








@shared_task
def sync_options_task(is_auto=False, user_id=None, from_date=None, to_date=None):
    """
    Sync option data from NSE for enabled indices.
    """
    from apps.adminpanel.models import SystemConfig
    from apps.adminpanel.utils import ConfigManager
    from apps.options.models import OptionDailyData
    
    start_time = timezone.now()
    
    # Create sync log
    sync_log = SyncLog.objects.create(
        sync_type='option',
        is_auto_sync=is_auto,
        triggered_by_user_id=user_id,
        start_time=start_time,
    )
    
    try:
        # Get active indices/stocks with option sync enabled
        stocks = Stock.objects.filter(is_option_enable=True)
        total_items = stocks.count()
        success_count = 0
        failed_count = 0
        errors = []
        
        # Global Configs
        config_start_date = ConfigManager.get_option_price_sync_start_date()
        lookback_days = ConfigManager.get_option_sync_lookback_days()
        
        logger.info(f"Starting Option Sync. Start Config: {config_start_date}, Lookback: {lookback_days} days")
        
        headers = {
            'accept': '*/*',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'accept-language': 'en-US,en;q=0.9',
            'referer': 'https://www.nseindia.com/report-detail/fo_eq_security'
        }
        
        session = requests.Session()
        session.headers.update(headers)
        
        # Initial visit to get cookies
        try:
            session.get(settings.NSE_API_BASE_URL, timeout=10)
        except Exception as e:
            logger.warning(f"Failed to visit homepage for cookies: {e}")

        for stock in stocks:
            try:
                symbol = stock.option_symbol if stock.option_symbol else stock.symbol
                # Clean symbol just in case
                symbol = symbol.replace(' ', '') 
                
                # Determine date range
                if from_date and to_date:
                    current_start_date = datetime.strptime(from_date, '%Y-%m-%d').date()
                    today = datetime.strptime(to_date, '%Y-%m-%d').date()
                else:
                    if stock.last_option_sync:
                        current_start_date = stock.last_option_sync + timedelta(days=1)
                    elif config_start_date:
                        current_start_date = config_start_date
                    else:
                        # Default fallback
                        current_start_date = date(2024, 1, 1)
                    
                    today = timezone.now().date()
                
                if current_start_date > today:
                    logger.info(f"Skipping {stock.symbol}: Up to date (Last sync: {stock.last_option_sync if not from_date else from_date})")
                    success_count += 1
                    continue
                
                # Process year by year from start date to today
                years_to_process = range(current_start_date.year, today.year + 1)
                
                max_processed_date = stock.last_option_sync # Keep track of max date we got data for
                if not max_processed_date:
                    max_processed_date = current_start_date - timedelta(days=1)

                for year in years_to_process:
                        # Determine instrument type
                        is_index = getattr(stock, 'is_index', False)
                        instrument_type = 'OPTIDX' if is_index else 'OPTSTK'
                        
                        # Determine range % based on index or stock
                        if is_index:
                            range_pct = ConfigManager.get_option_strike_range_index() / 100.0
                        else:
                            range_pct = ConfigManager.get_option_strike_range_stock() / 100.0

                        # 1. Fetch Expiry Dates
                        expiry_url = f"{settings.NSE_API_BASE_URL}/api/historicalOR/meta/foCPV/expireDts"
                        try:
                            resp = session.get(expiry_url, params={'instrument': instrument_type, 'symbol': symbol, 'year': year}, timeout=10)
                            if resp.status_code != 200:
                                logger.error(f"Failed to fetch expiry dates for {symbol} {year}: {resp.status_code}")
                                continue
                            
                            expiry_dates = resp.json().get('expiresDts', [])
                        except Exception as e:
                            logger.error(f"Error fetching expiries for {symbol} {year}: {e}")
                            continue
                            
                        for expiry_date_str in expiry_dates:
                            # Parse expiry date (02-Jan-2025)
                            try:
                                expiry_date = datetime.strptime(expiry_date_str, '%d-%b-%Y').date()
                            except ValueError:
                                # Try upper case just in case
                                expiry_date = datetime.strptime(expiry_date_str.upper(), '%d-%b-%Y').date()
                            
                            # Optimization: Skip if expiry is way before our start date
                            # Data API covers (expiry - lookback to expiry). 
                            # We add a buffer of 5 days to ensure we don't miss data if lookback is small
                            if expiry_date < (current_start_date - timedelta(days=5)):
                                continue
                                
                            # Call API for CE and PE
                            # Range: Expiry - lookback_days to Expiry
                            start_q_date_obj = expiry_date - timedelta(days=lookback_days)
                            
                            # Adjust for weekends: If start date is Sat/Sun, move forward to Monday
                            # Try up to 3 days to ensure we get a weekday (per USER request)
                            attempts = 0
                            while start_q_date_obj.weekday() >= 5 and attempts < 3:
                                start_q_date_obj += timedelta(days=1)
                                attempts += 1
                                
                            start_q_date = start_q_date_obj.strftime('%d-%m-%Y')
                            end_q_date = expiry_date.strftime('%d-%m-%Y')
                            
                            for opt_type in ['CE', 'PE']:
                                data_url = f"{settings.NSE_API_BASE_URL}/api/historicalOR/foCPV"
                                params = {
                                    'from': start_q_date,
                                    'to': end_q_date,
                                    'instrumentType': instrument_type,
                                    'symbol': symbol,
                                    'year': year,
                                    'expiryDate': expiry_date_str,
                                    'optionType': opt_type,
                                    'csv': 'true'
                                }
                                
                                try:
                                    # NSE is strict, might need delay
                                    time.sleep(0.5) 
                                    data_resp = session.get(data_url, params=params, timeout=15)
                                    
                                    if data_resp.status_code == 200:
                                        raw_data = data_resp.json()
                                        records = raw_data.get('data', [])
                                        
                                        bulk_data = []
                                        for record in records:
                                            try:
                                                # Parse Record Date
                                                rec_date_str = record.get('FH_TIMESTAMP')
                                                rec_date = datetime.strptime(rec_date_str, '%d-%b-%Y').date()
                                                
                                                # Only process if within our needed range (start date -> today)
                                                if rec_date < current_start_date or rec_date > today:
                                                    continue
                                                
                                                strike_price = float(record.get('FH_STRIKE_PRICE', 0))
                                                underlying_val = float(record.get('FH_UNDERLYING_VALUE', 0))
                                                
                                                # Filtering: Only store strikes within X% of underlying value
                                                if underlying_val > 0:
                                                    lower_bound = underlying_val * (1 - range_pct)
                                                    upper_bound = underlying_val * (1 + range_pct)
                                                    
                                                    if strike_price < lower_bound or strike_price > upper_bound:
                                                        continue

                                                # Prepare fields for bulk create
                                                open_price = float(record.get('FH_OPENING_PRICE', 0))
                                                high_price = float(record.get('FH_TRADE_HIGH_PRICE', 0))
                                                low_price = float(record.get('FH_TRADE_LOW_PRICE', 0))
                                                close_price = float(record.get('FH_CLOSING_PRICE', 0))
                                                ltp = float(record.get('FH_LAST_TRADED_PRICE', 0))
                                                volume = int(float(record.get('FH_TOT_TRADED_QTY', 0)))
                                                traded_value = float(record.get('FH_TOT_TRADED_VAL', 0))
                                                open_interest = int(float(record.get('FH_OPEN_INT', 0)))
                                                change_in_oi = int(float(record.get('FH_CHANGE_IN_OI', 0)))
                                                
                                                settle_price = None
                                                if record.get('FH_SETTLE_PRICE'):
                                                    sp = float(record.get('FH_SETTLE_PRICE', 0))
                                                    if sp > 0 and abs(sp - underlying_val) > (underlying_val * 0.1):
                                                         settle_price = sp

                                                bulk_data.append(OptionDailyData(
                                                    stock=stock,
                                                    underlying_symbol=symbol,
                                                    expiry_date=expiry_date,
                                                    strike_price=strike_price,
                                                    option_type=opt_type,
                                                    date=rec_date,
                                                    open_price=open_price,
                                                    high_price=high_price,
                                                    low_price=low_price,
                                                    close_price=close_price,
                                                    ltp=ltp,
                                                    volume=volume,
                                                    traded_value=traded_value,
                                                    open_interest=open_interest,
                                                    change_in_oi=change_in_oi,
                                                    underlying_value=underlying_val,
                                                    settle_price=settle_price
                                                ))
                                                
                                                if rec_date > max_processed_date:
                                                    max_processed_date = rec_date

                                            except Exception as e:
                                                logger.info(f"Failed to parse record for {symbol} {opt_type}: {e}")
                                                continue

                                        if bulk_data:
                                            OptionDailyData.objects.bulk_create(
                                                bulk_data,
                                                update_conflicts=True,
                                                unique_fields=['underlying_symbol', 'expiry_date', 'strike_price', 'option_type', 'date'],
                                                update_fields=[
                                                    'open_price', 'high_price', 'low_price', 'close_price', 'ltp', 
                                                    'volume', 'traded_value', 'open_interest', 'change_in_oi', 
                                                    'underlying_value', 'settle_price', 'stock'
                                                ]
                                            )
                                                
                                        logger.info(f"Synced {symbol} {expiry_date_str} {opt_type}: Fetched {len(records)} records")
                                    else:
                                        logger.debug(f"NSE API returned {data_resp.status_code} for {symbol} {opt_type} {expiry_date_str}")
                                        
                                except Exception as e:
                                    logger.error(f"Error fetching data for {symbol} {opt_type} {expiry_date_str}: {e}")
                                    continue
                
                # Update Stock Last Sync
                if max_processed_date and (max_processed_date > (stock.last_option_sync or date(2000,1,1))):
                    stock.last_option_sync = max_processed_date
                    stock.save()
                    
                success_count += 1
                
            except Exception as e:
                failed_count += 1
                errors.append(f"{stock.symbol}: {str(e)}")
                logger.error(f"Option sync failed for {stock.symbol}: {e}")

        # Finalize Log
        sync_log.end_time = timezone.now()
        sync_log.total_items = total_items
        sync_log.success_count = success_count
        sync_log.failed_count = failed_count
        sync_log.error_details = {'errors': errors}
        sync_log.save()
        
    except Exception as e:
        logger.error(f"Option sync task fatal error: {e}")
        sync_log.error_details = {'fatal_error': str(e)}
        sync_log.save()


@shared_task
def sync_hard_task(sync_type, start_date, end_date, instruments=None, user_id=None):
    """
    Dispatcher for Hard Sync tasks.
    """
    if sync_type == 'stock':
        sync_stocks_task.delay(
            is_auto=False, 
            user_id=user_id, 
            from_date=start_date, 
            to_date=end_date, 
            instruments=instruments,
            sync_indices=False
        )
    elif sync_type == 'sector':
        sync_stocks_task.delay(
            is_auto=False, 
            user_id=user_id, 
            from_date=start_date, 
            to_date=end_date,
            instruments=None, # Sectors usually sync all, or we could pass filtered list if needed
            sync_indices=True
        )
    elif sync_type == 'option':
         from .tasks import sync_options_task
         sync_options_task.delay(
             is_auto=False, 
             user_id=user_id,
             from_date=start_date,
             to_date=end_date
         )
