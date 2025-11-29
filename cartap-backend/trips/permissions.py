from rest_framework.permissions import BasePermission

class IsDriverWithActiveSubscription(BasePermission):
    message = "Доступ только для водителей с активной подпиской."

    def has_permission(self, request, view):
        user = request.user
        if not getattr(user, "is_authenticated", False):
            return False

        # Если в модели пользователя нет признака роли — не блокируем (мягкая деградация)
        is_driver = getattr(user, "is_driver", None)
        if is_driver is None:
            return True

        if not is_driver:
            return False

        # Пробуем проверить подписку через billing.Subscription,
        # если нет модели/импорта — не валимся, пускаем (мягкая деградация до внедрения биллинга)
        try:
            from billing.models import Subscription  # type: ignore
            return Subscription.objects.filter(user=user, is_active=True).exists()
        except Exception:
            return True
