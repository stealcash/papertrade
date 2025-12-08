from django.contrib import admin
from .models import PaymentRecord


@admin.register(PaymentRecord)
class PaymentRecordAdmin(admin.ModelAdmin):
    list_display = ['payment_id', 'user', 'amount', 'status', 'created_at']
    list_filter = ['status', 'payment_gateway']
    search_fields = ['payment_id', 'order_id', 'user__email']
