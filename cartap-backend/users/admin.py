from django.contrib import admin
from django.utils.html import format_html
from .models import User, Car, VerificationRequest


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'phone_number', 'full_name', 'is_driver',
        'is_verified_driver', 'is_verified_passenger',
        'is_active', 'created_at'
    )
    list_filter = (
        'is_driver', 'is_verified_driver', 'is_verified_passenger',
        'is_active', 'is_staff', 'is_superuser'
    )
    search_fields = ('phone_number', 'full_name', 'public_id')
    readonly_fields = ('public_id', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Основное', {
            'fields': ('phone_number', 'full_name', 'photo', 'public_id')
        }),
        ('Профиль', {
            'fields': ('bio', 'city', 'birth_date')
        }),
        ('Роль и верификация', {
            'fields': (
                'is_driver', 'is_verified_driver', 'is_verified_passenger',
                'is_approved', 'verification_comment'
            )
        }),
        ('Документы', {
            'fields': ('passport_photo', 'license_photo'),
            'classes': ('collapse',)
        }),
        ('Статистика', {
            'fields': ('trips_completed_as_driver', 'trips_completed_as_passenger'),
            'classes': ('collapse',)
        }),
        ('Системные', {
            'fields': (
                'is_active', 'is_staff', 'is_superuser',
                'telegram_chat_id', 'created_at', 'updated_at'
            ),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['verify_as_driver', 'verify_as_passenger', 'unverify_driver', 'unverify_passenger']
    
    @admin.action(description="Подтвердить как водителя")
    def verify_as_driver(self, request, queryset):
        queryset.update(is_verified_driver=True)
    
    @admin.action(description="Подтвердить как пассажира")
    def verify_as_passenger(self, request, queryset):
        queryset.update(is_verified_passenger=True)
    
    @admin.action(description="Снять верификацию водителя")
    def unverify_driver(self, request, queryset):
        queryset.update(is_verified_driver=False)
    
    @admin.action(description="Снять верификацию пассажира")
    def unverify_passenger(self, request, queryset):
        queryset.update(is_verified_passenger=False)


@admin.register(Car)
class CarAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'owner', 'brand', 'model', 'year',
        'plate_number', 'passenger_seats',
        'is_active', 'is_verified'
    )
    list_filter = ('is_active', 'is_verified', 'car_type', 'brand')
    search_fields = ('brand', 'model', 'plate_number', 'owner__full_name')
    raw_id_fields = ('owner',)
    
    fieldsets = (
        ('Владелец', {
            'fields': ('owner',)
        }),
        ('Автомобиль', {
            'fields': ('brand', 'model', 'year', 'color', 'car_type', 'plate_number', 'passenger_seats', 'photo')
        }),
        ('Удобства', {
            'fields': (
                'has_air_conditioning', 'has_wifi', 'has_child_seat',
                'allows_smoking', 'allows_pets', 'has_luggage_space'
            )
        }),
        ('Статус', {
            'fields': ('is_active', 'is_verified', 'registration_photo')
        }),
    )
    
    actions = ['verify_cars', 'unverify_cars']
    
    @admin.action(description="Подтвердить авто")
    def verify_cars(self, request, queryset):
        queryset.update(is_verified=True)
    
    @admin.action(description="Снять подтверждение авто")
    def unverify_cars(self, request, queryset):
        queryset.update(is_verified=False)


@admin.register(VerificationRequest)
class VerificationRequestAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'user', 'verification_type', 'status',
        'created_at', 'reviewed_at'
    )
    list_filter = ('status', 'verification_type', 'created_at')
    search_fields = ('user__full_name', 'user__phone_number')
    raw_id_fields = ('user', 'reviewed_by')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Заявка', {
            'fields': ('user', 'verification_type', 'status', 'comment')
        }),
        ('Документы', {
            'fields': ('document_1', 'document_2', 'document_3')
        }),
        ('Модерация', {
            'fields': ('admin_comment', 'reviewed_by', 'reviewed_at')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['approve_requests', 'reject_requests']
    
    @admin.action(description="Одобрить заявки")
    def approve_requests(self, request, queryset):
        from django.utils import timezone
        
        for req in queryset.filter(status='pending'):
            req.status = 'approved'
            req.reviewed_by = request.user
            req.reviewed_at = timezone.now()
            req.save()
            
            # Обновляем статус верификации пользователя
            if req.verification_type == 'driver':
                req.user.is_verified_driver = True
            else:
                req.user.is_verified_passenger = True
            req.user.save()
    
    @admin.action(description="Отклонить заявки")
    def reject_requests(self, request, queryset):
        from django.utils import timezone
        
        queryset.filter(status='pending').update(
            status='rejected',
            reviewed_by=request.user,
            reviewed_at=timezone.now()
        )