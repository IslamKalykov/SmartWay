# locations/views.py
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Location
from .serializers import LocationSerializer


class LocationViewSet(viewsets.ReadOnlyModelViewSet):
    """Публичный справочник локаций"""
    queryset = Location.objects.all().order_by('sort_order', 'name_ru')
    serializer_class = LocationSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = super().get_queryset().filter(is_active=True)  # Только активные
        lang = self.request.query_params.get('lang', 'ru')
        search = self.request.query_params.get('search', '')
        
        if search:
            queryset = queryset.filter(**{f'name_{lang}__icontains': search})
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Популярные локации — первые 10 по sort_order"""
        queryset = self.get_queryset()[:10]  # ← Убрали is_popular
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)