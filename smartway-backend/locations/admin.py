# locations/admin.py
from django.contrib import admin
from .models import Location


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = (
        'code', 'name_ru', 'name_en', 'name_ky', 
        'region', 'sort_order', 'is_active'
    )
    list_filter = ('is_active', 'region')
    search_fields = ('code', 'name_ru', 'name_en', 'name_ky')
    list_editable = ('sort_order', 'is_active')
    ordering = ('sort_order', 'name_ru')
    
    fieldsets = (
        ('Основное', {
            'fields': ('code', 'is_active', 'sort_order')
        }),
        ('Названия', {
            'fields': ('name_ru', 'name_en', 'name_ky')
        }),
        ('Дополнительно', {
            'fields': ('region',),
            'classes': ('collapse',)
        }),
    )
    
    # Быстрые действия
    actions = ['activate', 'deactivate']
    
    @admin.action(description="Активировать выбранные локации")
    def activate(self, request, queryset):
        queryset.update(is_active=True)
    
    @admin.action(description="Деактивировать выбранные локации")
    def deactivate(self, request, queryset):
        queryset.update(is_active=False)