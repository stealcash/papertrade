import os
import json
import logging
from datetime import datetime, timedelta
from django.conf import settings

class ExternalAPILogger:
    """
    Logger for external API calls (e.g., Go Service).
    Writes logs to a daily file in logs/external_api/ with 2-day retention.
    """
    def __init__(self, service_name='go_service'):
        self.log_dir = settings.BASE_DIR / 'logs' / 'external_api'
        self.service_name = service_name
        os.makedirs(self.log_dir, exist_ok=True)
        self._cleanup_old_logs()

    def _get_log_file_path(self):
        today = datetime.now().strftime('%Y-%m-%d')
        return self.log_dir / f"{self.service_name}_{today}.log"

    def log(self, url, method, params, response_status, response_body, duration_ms):
        """
        Log an API request and response.
        
        Args:
            url (str): The full URL called.
            method (str): HTTP method (GET, POST, etc.)
            params (dict): Query parameters or body.
            response_status (int): HTTP status code.
            response_body (any): Response content (will be JSON serialized if possible).
            duration_ms (float): Request duration in milliseconds.
        """
        # Try to parse response body as JSON if it's a string
        if isinstance(response_body, str):
            try:
                response_body = json.loads(response_body)
            except:
                pass # Keep as string if not valid JSON

        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'method': method,
            'url': url,
            'params': params,
            'status': response_status,
            'duration_ms': round(duration_ms, 2),
            'response': response_body
        }
        
        try:
            with open(self._get_log_file_path(), 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
        except Exception as e:
            # Fallback to standard logging if file write fails
            logging.error(f"Failed to write external API log: {e}")

    def _cleanup_old_logs(self):
        """Delete logs older than 2 days."""
        cutoff_date = datetime.now() - timedelta(days=2)
        if not os.path.exists(self.log_dir):
            return

        for filename in os.listdir(self.log_dir):
            if not filename.endswith('.log') or not filename.startswith(f"{self.service_name}_"):
                continue
                
            try:
                # filename format: service_YYYY-MM-DD.log
                date_part = filename.replace(f"{self.service_name}_", "").replace(".log", "")
                file_date = datetime.strptime(date_part, '%Y-%m-%d')
                
                # Compare dates (ignoring time)
                if file_date.date() < cutoff_date.date():
                    file_path = self.log_dir / filename
                    os.remove(file_path)
                    logging.info(f"Deleted old sync log: {filename}")
            except ValueError:
                continue # Skip files that don't match the date format
            except Exception as e:
                logging.error(f"Error cleaning up old log {filename}: {e}")
