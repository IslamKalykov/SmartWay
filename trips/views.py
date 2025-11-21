from rest_framework import viewsets, mixins, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample

from django.utils import timezone
from django.db.models import Q

from datetime import datetime, timedelta  # если не используешь — можно удалить

from .models import Trip, Review
from .serializers import (
    TripSerializer,
    TripStatusUpdateSerializer,
    TripCreateSerializer,
    TripListSerializer,
    ReviewSerializer,
)
from .permissions import IsDriverWithActiveSubscription

from billing.utils import get_driver_priority_and_delay
from rest_framework.throttling import AnonRateThrottle


class IsAuthenticatedOrReadOnly(permissions.IsAuthenticatedOrReadOnly):
    pass

class TripViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Trip.objects.all().order_by("departure_time")
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return TripCreateSerializer
        return TripListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ("list", "retrieve"):
            # только будущие/активные в публичной ленте
            qs = qs.filter(departure_time__gt=timezone.now(), status=Trip.TripStatus.PENDING)
        return qs


    @action(detail=False, methods=["get"], url_path="my-active")
    def my_active(self, request):
        """
        GET /api/trips/my-active/ — активные заказы текущего водителя.
        """
        user = request.user
        if not getattr(user, "is_driver", False):
            return Response({"detail": "Только для водителей."}, status=status.HTTP_403_FORBIDDEN)

        qs = Trip.objects.filter(
            driver=user,
            status__in=["taken", "in_progress"],  # подгони под свои статусы
        ).order_by("departure_time")

        serializer = TripListSerializer(qs, many=True)
        return Response(serializer.data)


    @action(detail=False, methods=["get"], url_path="my-history")
    def my_history(self, request):
        """
        GET /api/trips/my-history/ — история заказов водителя.
        """
        user = request.user
        if not getattr(user, "is_driver", False):
            return Response({"detail": "Только для водителей."}, status=status.HTTP_403_FORBIDDEN)

        qs = Trip.objects.filter(
            driver=user,
            status__in=["completed", "cancelled"],  # подгони под реальные значения
        ).order_by("-departure_time")

        serializer = TripListSerializer(qs, many=True)
        return Response(serializer.data)


    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def my(self, request):
        qs = Trip.objects.filter(passenger=request.user).order_by("-created_at")
        page = self.paginate_queryset(qs)
        ser = TripListSerializer(page or qs, many=True)
        return self.get_paginated_response(ser.data) if page else Response(ser.data)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def taken(self, request):
        qs = Trip.objects.filter(driver=request.user).order_by("-created_at")
        page = self.paginate_queryset(qs)
        ser = TripListSerializer(page or qs, many=True)
        return self.get_paginated_response(ser.data) if page else Response(ser.data)

    @action(detail=True, methods=["post"], url_path="take")
    def take(self, request, pk=None):
        """
        POST /api/trips/<id>/take/ — водитель берёт поездку.
        """
        user = request.user
        if not getattr(user, "is_driver", False):
            return Response(
                {"detail": "Только водитель может взять поездку."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            trip = self.get_object()
        except Trip.DoesNotExist:
            return Response(
                {"detail": "Поездка не найдена."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # статус храним как строку
        if trip.status != "open":
            return Response(
                {"detail": "Эта поездка уже недоступна."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if trip.passenger_id == user.id:
            return Response(
                {"detail": "Нельзя взять собственную поездку."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        trip.driver = user
        trip.status = "taken"   # <- строковый статус
        trip.save(update_fields=["driver", "status"])

        return Response(TripSerializer(trip).data, status=status.HTTP_200_OK)

class AvailableTripsForDriversView(generics.ListAPIView):
    """
    GET /api/trips/available/ — список поездок, доступных для текущего водителя
    с учётом его подписки (view_delay_seconds).
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TripSerializer
    throttle_classes: list = [] 

    def get_queryset(self):
        user = self.request.user

        # Только водитель видит этот список
        if not getattr(user, "is_driver", False):
            return Trip.objects.none()

        # Узнаём задержку по подписке (и приоритет, который можно использовать в сортировке)
        priority_level, view_delay_seconds = get_driver_priority_and_delay(user)

        now = timezone.now()
        cutoff_time = now - timedelta(seconds=view_delay_seconds)

        # ⚠️ Нюанс по статусам:
        # здесь предполагается, что в модели Trip есть статус "open" (открытая поездка)
        # Если у тебя Enum типа Trip.Status.OPEN или Trip.TripStatus.OPEN — подставь его.
        return (
            Trip.objects
            .filter(
                status="open",
                departure_time__gt=now,
                created_at__lte=cutoff_time,
            )
            .order_by("departure_time")
        )



class TripCreateAPIView(generics.CreateAPIView):
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        if not self.request.user.is_driver:  # только пассажиры могут создавать
            serializer.save(passenger=self.request.user)
        else:
            raise PermissionError("Водители не могут создавать поездки")

class TripListAPIView(generics.ListAPIView):
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_driver:
            # Водитель видит все свободные поездки с pending статусом и без назначенного водителя
            return Trip.objects.filter(
                status=Trip.TripStatus.PENDING,
                driver__isnull=True,
                departure_time__gte=now(),
                is_active=True,
            ).order_by('departure_time')
        else:
            # Пассажиры видят свои активные свободные поездки
            return Trip.objects.filter(
                is_active=True,
                status=Trip.TripStatus.PENDING,
                departure_time__gte=now()
            ).order_by('departure_time')


class TakeTripAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, trip_id):
        trip = get_object_or_404(Trip, id=trip_id)

        if request.user.is_driver:
            if trip.status != Trip.TripStatus.PENDING:
                return Response({"error": "Эта поездка уже занята."}, status=status.HTTP_400_BAD_REQUEST)

            trip.driver = request.user
            trip.status = Trip.TripStatus.TAKEN
            trip.save()

            return Response({"success": "Вы успешно взяли поездку."}, status=status.HTTP_200_OK)
        return Response({"error": "Только водители могут брать поездки."}, status=status.HTTP_403_FORBIDDEN)
    

class MyTripsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        trips = Trip.objects.filter(driver=user) | Trip.objects.filter(passenger=user)
        serializer = TripSerializer(trips, many=True)
        return Response(serializer.data)

class TakenTripsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        trips = Trip.objects.filter(driver=user)
        serializer = TripSerializer(trips, many=True)
        return Response(serializer.data)

class PublishedTripsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        trips = Trip.objects.filter(passenger=user)
        serializer = TripSerializer(trips, many=True)
        return Response(serializer.data)
    
    
class ReviewCreateAPIView(generics.CreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        try:
            trip = Trip.objects.get(id=self.request.data['trip'])
        except Trip.DoesNotExist:
            raise NotFound("Поездка не найдена.")

        if self.request.user != trip.passenger and self.request.user != trip.driver:
            raise serializers.ValidationError("Вы не участвовали в этой поездке.")

        recipient = trip.driver if self.request.user == trip.passenger else trip.passenger
        serializer.save(author=self.request.user, recipient=recipient)
        
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get_recipient(self, trip_id, author):
        # логика, чтобы найти получателя отзыва
        trip = Trip.objects.get(id=trip_id)
        return trip.driver if trip.passenger == author else trip.passenger
    
    
class UserReviewsListAPIView(generics.ListAPIView):
    """Список отзывов, которые получил конкретный пользователь (по query param ?user_id=)."""
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user_id = self.request.query_params.get("user_id")
        qs = Review.objects.select_related("author", "recipient", "trip").order_by("-created_at")
        if user_id:
            qs = qs.filter(recipient_id=user_id)
        return qs
    
    
class UpdateTripStatusAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        trip = get_object_or_404(Trip, pk=pk)

        user = request.user
        new_status = request.data.get('status')

        if new_status not in ['canceled', 'completed']:
            return Response({"error": "Invalid status"}, status=400)

        # Проверка: пассажир или водитель?
        is_passenger = trip.passenger == user
        is_driver = trip.driver == user

        if not is_passenger and not is_driver:
            return Response({"error": "Нет доступа"}, status=403)

        if new_status == 'completed' and not is_driver:
            return Response({"error": "Только водитель может завершить поездку"}, status=403)

        if new_status == 'canceled':
            trip.status = 'canceled'
        elif new_status == 'completed':
            trip.status = 'completed'

        trip.save()
        return Response({"message": "Статус обновлён", "status": trip.status})
    
    
@extend_schema(request=TripStatusUpdateSerializer)
class TripStatusUpdateAPIView(generics.UpdateAPIView):
    queryset = Trip.objects.all()
    serializer_class = TripStatusUpdateSerializer
    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
