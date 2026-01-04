from django.contrib import admin
from .models import Sector


@admin.register(Sector)
class SectorAdmin(admin.ModelAdmin):
    list_display = ['symbol', 'name', 'status']
    list_filter = ['status']
    search_fields = ['symbol', 'name']



