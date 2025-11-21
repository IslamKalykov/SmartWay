from datetime import timedelta

from django.utils import timezone

from .models import DriverSubscription

# дефолты для водителя без подписки
DEFAULT_PRIORITY = 0
DEFAULT_VIEW_DELAY = 120  # сек, когда бесплатник увидит заказ


def get_driver_priority_and_delay(driver):
    """
    Возвращает (priority_level, view_delay_seconds) для водителя.
    Если активной подписки нет — дефолтные значения.
    """
    now = timezone.now()

    sub = (
        DriverSubscription.objects
        .select_related("plan")
        .filter(
            driver=driver,
            expires_at__gte=now,
            plan__is_active=True,
        )
        .order_by("-plan__priority_level")  # если вдруг несколько — берём самую жирную
        .first()
    )

    if not sub or not sub.plan:
        return DEFAULT_PRIORITY, DEFAULT_VIEW_DELAY

    return sub.plan.priority_level, sub.plan.view_delay_seconds
