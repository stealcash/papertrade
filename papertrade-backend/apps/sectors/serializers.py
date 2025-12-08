from rest_framework import serializers
from .models import Sector, SectorPriceDaily


class SectorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sector
        fields = '__all__'


class SectorPriceDailySerializer(serializers.ModelSerializer):
    sector_name = serializers.CharField(source='sector.name', read_only=True)
    
    class Meta:
        model = SectorPriceDaily
        fields = '__all__'
