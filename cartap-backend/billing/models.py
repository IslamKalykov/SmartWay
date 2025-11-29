from django.db import models
from django.conf import settings
from django.utils import timezone


class SubscriptionPlan(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_days = models.PositiveIntegerField()

    # 🔽 НОВОЕ: уровень приоритета для выдачи заказов (0, 5, 10 и т.п.)
    priority_level = models.IntegerField(default=0)

    # 🔽 НОВОЕ: задержка в секундах, через сколько после создания
    #          поездки водитель этого плана увидит её
    view_delay_seconds = models.PositiveIntegerField(default=120)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} (prio={self.priority_level}, delay={self.view_delay_seconds}s)"


class DriverSubscription(models.Model):
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="driver_subscriptions",
    )
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT)
    started_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"{self.driver_id} -> {self.plan.name} до {self.expires_at}"

    @property
    def is_active(self):
        return self.expires_at >= timezone.now()


class Payment(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    # опционально, если есть связь с подпиской
    subscription = models.ForeignKey(
        DriverSubscription,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="payments",
    )

    external_id = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=50, default="created")

    def __str__(self):
        return f"Payment {self.id} {self.amount} by {self.user_id}"
