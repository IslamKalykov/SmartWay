from rest_framework.permissions import BasePermission
from django.utils import timezone

class IsDriverWithActiveSubscription(BasePermission):
    message = "Подписка не активна. Оплатите план, чтобы получать заказы."

    def has_permission(self, request, view):
        u = request.user
        if not getattr(u, "is_authenticated", False):
            return False
        if not getattr(u, "is_driver", False):
            return False
        return u.subscriptions.filter(is_active=True, ends_at__gt=timezone.now()).exists()
