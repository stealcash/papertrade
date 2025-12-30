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
from datetime import datetime, timedelta
from .models import SyncLog
from .utils import ExternalAPILogger
from apps.stocks.models import Stock, StockPriceDaily, Stock5MinByDay
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
                                print(f"DTO-DEBUG: Saved {stock.symbol} {current_date}, created={created}, id={obj.id}")
                                saved_records_count += 1  # Increment counter on successful save
                            except Exception as save_err:
                                print(f"DTO-DEBUG: SAVE FAILED for {stock.symbol} {current_date}: {save_err}")
                                raise save_err
                            
                            # Save 5-min candles if available
                            if data.get('timewise'):
                                candles_json = {
                                    candle['time']: {
                                        'open': candle['open_price'],
                                        'high': candle['high_price'],
                                        'low': candle['low_price'],
                                        'close': candle['close_price'],
                                        'volume': candle['volume'],
                                    }
                                    for candle in data['timewise']
                                }
                                
                                Stock5MinByDay.objects.update_or_create(
                                    stock=stock,
                                    date=current_date,
                                    defaults={
                                        'candles_json': candles_json,
                                    }
                                )
                        
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
                    print(f"DTO-DEBUG: Updated {stock.symbol} last_synced_at (saved {saved_records_count} records)")
                else:
                    print(f"DTO-DEBUG: Skipped updating {stock.symbol} last_synced_at (no records saved)")
                
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
         # Option sync logic (if implemented)
         pass
