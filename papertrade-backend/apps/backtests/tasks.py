"""
Celery tasks for backtest execution.
"""
from celery import shared_task
import logging
from .models import BacktestRun
from .engine import BacktestEngine
from apps.notifications.models import Notification

logger = logging.getLogger(__name__)


@shared_task
def execute_backtest_task(backtest_run_id: int, stock_ids: list, execution_mode: str = 'signal_close'):
    """
    Execute backtest in background.
    
    Args:
        backtest_run_id: BacktestRun ID
        stock_ids: List of stock IDs
        execution_mode: Execution mode
    """
    try:
        backtest_run = BacktestRun.objects.get(id=backtest_run_id)
        
        # Check concurrency limits
        from apps.adminpanel.models import SystemConfig
        
        # Check per-user limit
        user_limit_config = SystemConfig.objects.filter(key='backtest.max_concurrent_per_user').first()
        if user_limit_config:
            user_limit = int(user_limit_config.value)
            running_count = BacktestRun.objects.filter(
                user=backtest_run.user,
                status='running'
            ).count()
            
            if running_count >= user_limit:
                backtest_run.status = 'failed'
                backtest_run.error_message = f'Maximum concurrent backtests per user ({user_limit}) exceeded'
                backtest_run.save()
                raise Exception(f'Max concurrent backtests per user exceeded: {user_limit}')
        
        # Check global limit
        global_limit_config = SystemConfig.objects.filter(key='backtest.global_max_concurrent').first()
        if global_limit_config:
            global_limit = int(global_limit_config.value)
            total_running = BacktestRun.objects.filter(status='running').count()
            
            if total_running >= global_limit:
                backtest_run.status = 'failed'
                backtest_run.error_message = f'Global concurrent backtest limit ({global_limit}) exceeded'
                backtest_run.save()
                raise Exception(f'Global concurrent backtest limit exceeded: {global_limit}')
        
        # Execute backtest
        engine = BacktestEngine(backtest_run)
        engine.execute(stock_ids, execution_mode)
        
        # Create notification
        Notification.objects.create(
            user=backtest_run.user,
            title='Backtest Completed',
            message=f'Your backtest {backtest_run.run_id} has completed successfully. '
                   f'Total P/L: ₹{backtest_run.total_pnl}',
            notification_type='success',
        )
        
        logger.info(f"Backtest task completed for run {backtest_run.run_id}")
        
    except BacktestRun.DoesNotExist:
        logger.error(f"BacktestRun {backtest_run_id} not found")
    except Exception as e:
        logger.error(f"Backtest task failed: {str(e)}")
        
        # Create error notification
        try:
            backtest_run = BacktestRun.objects.get(id=backtest_run_id)
            Notification.objects.create(
                user=backtest_run.user,
                title='Backtest Failed',
                message=f'Your backtest {backtest_run.run_id} failed: {str(e)}',
                notification_type='error',
            )
        except:
            pass
