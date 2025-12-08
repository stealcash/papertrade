"""
Config Manager Utility for SystemConfig
Provides centralized access to system configurations with type safety
"""
from django.conf import settings
from .models import SystemConfig
import logging

logger = logging.getLogger(__name__)


class ConfigManager:
    """Centralized configuration manager with fallback to settings.py"""
    
    # Predefined config keys
    SYNC_AUTO_TIME = 'auto_sync_time'
    SYNC_ENABLED = 'sync_enabled'
    DEFAULT_WALLET_AMOUNT = 'default_wallet_amount'
    RATE_LIMIT_PER_MINUTE = 'rate_limit_per_minute'
    RESPONSE_SIZE_LIMIT_MB = 'response_size_limit_mb'
    BACKTEST_RETENTION_DAYS = 'backtest_retention_days'
    GO_SERVICE_URL = 'go_service_url'
    INTERNAL_API_SECRET = 'internal_api_secret'
    MAINTENANCE_MODE = 'maintenance_mode'
    
    @staticmethod
    def get_config(key, default=None, value_type=str):
        """
        Get configuration value with type conversion.
        Falls back to settings.py if not found in database.
        
        Args:
            key: Configuration key
            default: Default value if not found
            value_type: Type to convert value to (str, int, float, bool)
        """
        try:
            config = SystemConfig.objects.get(key=key)
            value = config.value
            
            # Type conversion
            if value_type == bool:
                return value.lower() in ('true', '1', 'yes', 'on')
            elif value_type == int:
                return int(value) if value and value != 'null' else default
            elif value_type == float:
                return float(value) if value and value != 'null' else default
            else:
                return value if value != 'null' else default
                
        except SystemConfig.DoesNotExist:
            logger.warning(f"Config '{key}' not found in database, using default: {default}")
            return default
    
    @classmethod
    def get_auto_sync_time(cls):
        """Returns auto sync time (HH:MM format)"""
        return cls.get_config(
            cls.SYNC_AUTO_TIME,
            default=getattr(settings, 'DEFAULT_AUTO_SYNC_TIME', '03:00')
        )
    
    @classmethod
    def is_sync_enabled(cls):
        """Returns whether auto sync is enabled"""
        return cls.get_config(
            cls.SYNC_ENABLED,
            default=True,
            value_type=bool
        )
    
    @classmethod
    def get_default_wallet_amount(cls):
        """Returns default wallet amount for new users"""
        return cls.get_config(
            cls.DEFAULT_WALLET_AMOUNT, 
            default=getattr(settings, 'DEFAULT_WALLET_AMOUNT', 100000),
            value_type=float
        )
    
    @classmethod
    def get_rate_limit_per_minute(cls):
        """Returns API rate limit per minute"""
        return cls.get_config(
            cls.RATE_LIMIT_PER_MINUTE,
            default=getattr(settings, 'RATE_LIMIT_PER_MINUTE', 100),
            value_type=int
        )
    
    @classmethod
    def get_response_size_limit_mb(cls):
        """Returns API response size limit in MB"""
        return cls.get_config(
            cls.RESPONSE_SIZE_LIMIT_MB,
            default=getattr(settings, 'DEFAULT_RESPONSE_SIZE_LIMIT_MB', 5),
            value_type=int
        )
    
    @classmethod
    def get_backtest_retention_days(cls):
        """Returns backtest retention days (None = keep forever)"""
        return cls.get_config(
            cls.BACKTEST_RETENTION_DAYS,
            default=getattr(settings, 'DEFAULT_BACKTEST_RETENTION_DAYS', None),
            value_type=int
        )
    
    @classmethod
    def get_go_service_url(cls):
        """Returns Go service URL"""
        return cls.get_config(
            cls.GO_SERVICE_URL,
            default=getattr(settings, 'GO_SERVICE_URL', 'http://localhost:8080/api/v1')
        )
    
    @classmethod
    def get_internal_api_secret(cls):
        """Returns internal API secret for Go service communication"""
        return cls.get_config(
            cls.INTERNAL_API_SECRET,
            default=getattr(settings, 'INTERNAL_API_SECRET', 'shared-secret')
        )
    
    @classmethod
    def is_maintenance_mode(cls):
        """Returns whether maintenance mode is enabled"""
        return cls.get_config(
            cls.MAINTENANCE_MODE,
            default=False,
            value_type=bool
        )
    
    @classmethod
    def get_all_configs(cls):
        """Returns all system configurations as a dictionary"""
        return {
            'auto_sync_time': cls.get_auto_sync_time(),
            'sync_enabled': cls.is_sync_enabled(),
            'default_wallet_amount': cls.get_default_wallet_amount(),
            'rate_limit_per_minute': cls.get_rate_limit_per_minute(),
            'response_size_limit_mb': cls.get_response_size_limit_mb(),
            'backtest_retention_days': cls.get_backtest_retention_days(),
            'go_service_url': cls.get_go_service_url(),
            'maintenance_mode': cls.is_maintenance_mode(),
        }
