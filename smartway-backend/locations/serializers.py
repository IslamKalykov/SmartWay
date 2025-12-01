# locations/serializers.py
from rest_framework import serializers
from .models import Location


class LocationSerializer(serializers.ModelSerializer):
    """Полный сериализатор локации"""
    
    class Meta:
        model = Location
        fields = (
            'id', 'code', 
            'name_ru', 'name_en', 'name_ky',
            'region', 'sort_order', 'is_active'
        )


class LocationListSerializer(serializers.ModelSerializer):
    """
    Сериализатор для списка локаций.
    Возвращает название на нужном языке в поле 'name'.
    """
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = Location
        fields = ('id', 'code', 'name', 'region')
    
    def get_name(self, obj):
        # Получаем язык из контекста запроса
        request = self.context.get('request')
        lang = 'ru'  # по умолчанию
        
        if request:
            # Пробуем получить из query params или headers
            lang = request.query_params.get('lang') or \
                   request.headers.get('Accept-Language', 'ru')[:2]
        
        return obj.get_name(lang)


class LocationMinimalSerializer(serializers.ModelSerializer):
    """Минимальный сериализатор для отображения в Trip/Announcement"""
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = Location
        fields = ('id', 'code', 'name')
    
    def get_name(self, obj):
        request = self.context.get('request')
        lang = 'ru'
        
        if request:
            lang = request.query_params.get('lang') or \
                   request.headers.get('Accept-Language', 'ru')[:2]
        
        return obj.get_name(lang)