# billing/serializers.py
from rest_framework import serializers
from .models import SubscriptionPlan, DriverSubscription


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = (
            "id",
            "name",
            "price",
            "duration_days",
            "priority_level",
            "view_delay_seconds",
            "is_active",
        )


class DriverSubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)
    is_active = serializers.SerializerMethodField()

    class Meta:
        model = DriverSubscription
        fields = ("id", "plan", "started_at", "expires_at", "is_active")

    def get_is_active(self, obj):
        return obj.is_active  # твой @property
