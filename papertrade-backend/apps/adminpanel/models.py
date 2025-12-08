from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone

class AdminUser(models.Model):
    """
    Separate user model for Admins and Superadmins.
    This is distinct from the regular User model used for traders.
    """
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('superadmin', 'SuperAdmin'),
    ]

    email = models.EmailField(unique=True, db_index=True)
    password = models.CharField(max_length=128)
    name = models.CharField(max_length=100, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='admin')
    is_active = models.BooleanField(default=True)
    can_manage_stocks = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'adminpanel_adminuser'
        verbose_name = 'Admin User'
        verbose_name_plural = 'Admin Users'

    def __str__(self):
        return f"{self.email} ({self.role})"

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)
    
    @property
    def is_authenticated(self):
        return True

class SystemConfig(models.Model):
    """System configuration settings."""
    key = models.CharField(max_length=100, unique=True, primary_key=True)
    value = models.TextField()
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'adminpanel_systemconfig'
        verbose_name = 'System Config'
        verbose_name_plural = 'System Configs'
        
    def __str__(self):
        return self.key

class AdminActivityLog(models.Model):
    """Log of admin activities."""
    admin_user = models.CharField(max_length=255)
    action = models.CharField(max_length=100)
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'adminpanel_activitylog'
        verbose_name = 'Admin Activity Log'
        verbose_name_plural = 'Admin Activity Logs'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.admin_user} - {self.action}"
