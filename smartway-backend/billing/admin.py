from django.contrib import admin
from .models import SubscriptionPlan, DriverSubscription, Payment


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "price",
        "duration_days",
        "priority_level",
        "view_delay_seconds",
        "is_active",
    )
    list_filter = ("is_active",)
    search_fields = ("name",)


@admin.register(DriverSubscription)
class DriverSubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "driver",
        "plan",
        "started_at",
        "expires_at",
        "is_active",  # property, но в list_display так можно
    )
    list_filter = ("plan",)
    search_fields = (
        "driver__phone_number",
        "driver__full_name",
    )  # оставляю как было, если поля есть в кастомном User


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "amount",
        "status",
        "created_at",
        "subscription",
        "external_id",
    )
    list_filter = ("status",)
    search_fields = (
        "user__phone_number",
        "user__full_name",
        "external_id",
    )
