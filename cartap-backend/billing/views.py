# billing/views.py
from datetime import timedelta

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from .models import SubscriptionPlan, DriverSubscription, Payment
from .serializers import PlanSerializer, DriverSubscriptionSerializer  # см. пункт 3

from rest_framework.permissions import IsAuthenticated


class PlanListView(generics.ListAPIView):
    """
    GET /api/billing/plans/ — активные тарифы
    """
    queryset = SubscriptionPlan.objects.filter(is_active=True).order_by("price")
    serializer_class = PlanSerializer
    permission_classes = [permissions.AllowAny]


class MockPayView(APIView):
    """
    POST /api/billing/mock-pay/ {"plan_id": <id>}
    — имитация успешной оплаты: создаёт подписку водителю
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        plan_id = request.data.get("plan_id")
        if not plan_id:
            return Response({"detail": "plan_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response({"detail": "Plan not found or inactive"}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        expires_at = now + timedelta(days=plan.duration_days)

        # создаём платёж (ты в модели Payment используешь user, а не driver)
        payment = Payment.objects.create(
            user=user,
            amount=plan.price,
            status="paid",
            external_id="mock",  # если нужно
        )

        # создаём подписку
        DriverSubscription.objects.create(
            driver=user,
            plan=plan,
            started_at=now,
            expires_at=expires_at,
        )

        return Response(
            {
                "status": "ok",
                "payment_id": payment.id,
                "expires_at": expires_at,
            },
            status=status.HTTP_201_CREATED,
        )


class MySubscriptionsView(generics.ListAPIView):
    """
    GET /api/billing/my/ — список подписок текущего пользователя (водителя)
    """
    serializer_class = DriverSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            DriverSubscription.objects
            .filter(driver=self.request.user)
            .order_by("-started_at")
        )


class CurrentPlanView(APIView):
    """
    GET /api/billing/current/ — текущий план водителя (если есть).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()

        sub = (
            DriverSubscription.objects
            .select_related("plan")
            .filter(driver=user, expires_at__gte=now)
            .order_by("-expires_at")
            .first()
        )
        if not sub:
            return Response({"plan": None}, status=200)

        plan = sub.plan
        return Response(
            {
                "plan": {
                    "id": plan.id,
                    "name": plan.name,
                    "price": str(plan.price),
                    "duration_days": plan.duration_days,
                    "priority_level": plan.priority_level,
                    "view_delay_seconds": plan.view_delay_seconds,
                },
                "expires_at": sub.expires_at,
            },
            status=200,
        )