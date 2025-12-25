# trips/views.py
from datetime import timedelta

from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q

from .models import Trip, DriverAnnouncement, Booking, Review
from .serializers import (
    TripCreateSerializer, TripListSerializer, TripDetailSerializer,
    AnnouncementCreateSerializer, AnnouncementListSerializer, AnnouncementDetailSerializer,
    BookingCreateSerializer, BookingSerializer,
    ReviewSerializer, ReviewCreateSerializer,
)
from .notifications import (
    send_booking_completed_notification,
    send_booking_created_notification,
    send_booking_status_notification,
    send_trip_completed_notification,
    send_trip_taken_notification,
)


def get_driver_priority_and_delay(user):
    """Получить приоритет и задержку водителя по подписке"""
    try:
        from billing.models import DriverSubscription
        sub = (
            DriverSubscription.objects
            .filter(driver=user, expires_at__gte=timezone.now())
            .select_related("plan")
            .order_by("-plan__priority_level")
            .first()
        )
        if sub:
            return sub.plan.priority_level, sub.plan.view_delay_seconds
    except Exception:
        pass
    return 0, 0


# ===================== TRIP VIEWS (Заказы пассажиров) =====================

class TripViewSet(viewsets.ModelViewSet):
    """CRUD для заказов пассажиров"""
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['available']:
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TripCreateSerializer
        if self.action == 'list':
            return TripListSerializer
        return TripDetailSerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_queryset(self):
        return Trip.objects.select_related('passenger', 'driver', 'car').order_by('-created_at')
    
    def perform_create(self, serializer):
        user = self.request.user
        if user.is_driver:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Водители создают объявления, не заказы. Используйте /api/announcements/")
        serializer.save(passenger=user)
    
    @action(detail=False, methods=['get'], url_path='my')
    def my(self, request):
        """GET /api/trips/my/ - мои заказы как пассажира"""
        qs = Trip.objects.filter(
            passenger=request.user
        ).select_related('passenger', 'driver', 'car').order_by('-created_at')
        
        serializer = TripListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        """GET /api/trips/available/ - доступные заказы для водителей"""
        user = request.user
        if not getattr(user, 'is_driver', False):
            return Response({"detail": "Только для водителей"}, status=403)
        
        priority_level, view_delay_seconds = get_driver_priority_and_delay(user)
        now = timezone.now()
        cutoff_time = now - timedelta(seconds=view_delay_seconds)
        
        qs = Trip.objects.filter(
            status='open',
            departure_time__gt=now,
            created_at__lte=cutoff_time
        ).exclude(passenger=user).order_by('departure_time')
        
        serializer = TripListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='my-active')
    def my_active(self, request):
        """GET /api/trips/my-active/ - мои активные поездки как водителя"""
        qs = Trip.objects.filter(
            driver=request.user,
            status__in=['taken', 'in_progress']
        ).order_by('departure_time')
        serializer = TripDetailSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='my-completed')
    def my_completed(self, request):
        """GET /api/trips/my-completed/ - завершённые поездки"""
        qs = Trip.objects.filter(
            Q(driver=request.user) | Q(passenger=request.user),
            status__in=['completed', 'cancelled']
        ).order_by('-updated_at')[:50]
        serializer = TripListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def take(self, request, pk=None):
        """POST /api/trips/{id}/take/ - водитель берёт заказ"""
        user = request.user
        if not getattr(user, 'is_driver', False):
            return Response({"detail": "Только водитель может взять заказ."}, status=403)
        
        trip = self.get_object()
        
        if trip.status != 'open':
            return Response({"detail": "Этот заказ уже недоступен."}, status=400)
        
        if trip.passenger == user:
            return Response({"detail": "Нельзя взять свой заказ."}, status=400)
        
        car_id = request.data.get('car_id')
        if car_id:
            from users.models import Car
            try:
                trip.car = Car.objects.get(id=car_id, owner=user, is_active=True)
            except Car.DoesNotExist:
                pass
        
        trip.driver = user
        trip.status = 'taken'
        trip.save(update_fields=['driver', 'car', 'status', 'updated_at'])

        send_trip_taken_notification(trip)
        
        return Response(TripDetailSerializer(trip, context={'request': request}).data)
    
    @action(detail=True, methods=['post'])
    def release(self, request, pk=None):
        """POST /api/trips/{id}/release/ - водитель отказывается от заказа"""
        trip = self.get_object()
        
        if trip.driver != request.user:
            return Response({"detail": "Это не ваш заказ."}, status=403)
        
        if trip.status not in ['taken', 'in_progress']:
            return Response({"detail": "Этот заказ нельзя вернуть."}, status=400)
        
        trip.driver = None
        trip.car = None
        trip.status = 'open'
        trip.save(update_fields=['driver', 'car', 'status', 'updated_at'])
        
        return Response(TripDetailSerializer(trip, context={'request': request}).data)
    
    @action(detail=True, methods=['post'])
    def finish(self, request, pk=None):
        """POST /api/trips/{id}/finish/ - завершить заказ"""
        trip = self.get_object()
        
        if trip.driver != request.user:
            return Response({"detail": "Только водитель может завершить."}, status=403)
        
        if trip.status not in ['taken', 'in_progress']:
            return Response({"detail": "Этот заказ нельзя завершить."}, status=400)
        
        trip.status = 'completed'
        trip.save(update_fields=['status', 'updated_at'])
        
        # Обновляем статистику
        if trip.driver:
            trip.driver.trips_completed_as_driver += 1
            trip.driver.save(update_fields=['trips_completed_as_driver'])
        if trip.passenger:
            trip.passenger.trips_completed_as_passenger += 1
            trip.passenger.save(update_fields=['trips_completed_as_passenger'])
        send_trip_completed_notification(trip)
        
        return Response(TripDetailSerializer(trip, context={'request': request}).data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """POST /api/trips/{id}/cancel/ - отменить заказ"""
        trip = self.get_object()
        user = request.user
        
        if user != trip.passenger and user != trip.driver:
            return Response({"detail": "Вы не участвуете в этом заказе."}, status=403)
        
        if trip.status in ['completed', 'cancelled']:
            return Response({"detail": "Этот заказ уже завершён/отменён."}, status=400)
        
        trip.status = 'cancelled'
        trip.save(update_fields=['status', 'updated_at'])
        
        return Response(TripDetailSerializer(trip, context={'request': request}).data)
    
    @action(detail=False, methods=['get'], url_path='my-driver')
    def my_driver_trips(self, request):
        """Поездки, которые водитель принял"""
        qs = Trip.objects.filter(driver=request.user).select_related(
            'driver', 'passenger', 'car'
        ).order_by('-created_at')

        serializer = TripListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)


# ===================== ANNOUNCEMENT VIEWS (Объявления водителей) =====================

class AnnouncementViewSet(viewsets.ModelViewSet):
    """CRUD для объявлений водителей"""
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['available', 'list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AnnouncementCreateSerializer
        if self.action == 'list':
            return AnnouncementListSerializer
        return AnnouncementDetailSerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_queryset(self):
        return DriverAnnouncement.objects.select_related('driver', 'car').order_by('-created_at')
    
    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_driver:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Только водители могут создавать объявления.")
        serializer.save(driver=user)
    
    @action(detail=False, methods=['get'])
    def my(self, request):
        """GET /api/announcements/my/ - мои объявления"""
        qs = DriverAnnouncement.objects.filter(driver=request.user).order_by('-created_at')
        serializer = AnnouncementListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        """GET /api/announcements/available/ - доступные объявления для пассажиров"""
        now = timezone.now()
        
        qs = DriverAnnouncement.objects.filter(
            status='active',
            departure_time__gt=now,
        ).order_by('departure_time')
        
        if request.user.is_authenticated:
            qs = qs.exclude(driver=request.user)
        
        from_loc = request.query_params.get('from')
        to_loc = request.query_params.get('to')
        seats = request.query_params.get('seats')
        
        if from_loc:
            qs = qs.filter(from_location__icontains=from_loc)
        if to_loc:
            qs = qs.filter(to_location__icontains=to_loc)
        if seats:
            try:
                qs = qs.filter(available_seats__gte=int(seats))
            except ValueError:
                pass
        
        serializer = AnnouncementListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def bookings(self, request, pk=None):
        """GET /api/announcements/{id}/bookings/ - бронирования на это объявление"""
        announcement = self.get_object()
        
        if announcement.driver != request.user:
            return Response({"detail": "Только владелец видит бронирования."}, status=403)
        
        bookings = announcement.bookings.all().order_by('-created_at')
        serializer = BookingSerializer(bookings, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """POST /api/announcements/{id}/cancel/ - отменить объявление"""
        announcement = self.get_object()
        
        if announcement.driver != request.user:
            return Response({"detail": "Это не ваше объявление."}, status=403)
        
        if announcement.status in ['completed', 'cancelled']:
            return Response({"detail": "Объявление уже завершено/отменено."}, status=400)
        
        announcement.status = 'cancelled'
        announcement.save(update_fields=['status', 'updated_at'])
        
        affected_bookings = announcement.bookings.filter(
            status__in=['pending', 'confirmed']
        ).select_related(
            'passenger',
            'announcement',
            'announcement__driver',
            'announcement__from_location',
            'announcement__to_location',
        )
        for booking in affected_bookings:
            booking.status = 'cancelled'
            booking.save(update_fields=['status', 'updated_at'])
            send_booking_status_notification(booking)
        
        return Response(AnnouncementDetailSerializer(announcement, context={'request': request}).data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """POST /api/announcements/{id}/complete/ - завершить объявление"""
        announcement = self.get_object()
        
        if announcement.driver != request.user:
            return Response({"detail": "Это не ваше объявление."}, status=403)
        
        announcement.status = 'completed'
        announcement.save(update_fields=['status', 'updated_at'])
        
        announcement.bookings.filter(status='confirmed').update(status='completed')
        
        confirmed_bookings = announcement.bookings.filter(status='completed')
        for booking in confirmed_bookings:
            booking.passenger.trips_completed_as_passenger += 1
            booking.passenger.save(update_fields=['trips_completed_as_passenger'])
            send_booking_completed_notification(booking, notify_driver=False)
        
        announcement.driver.trips_completed_as_driver += 1
        announcement.driver.save(update_fields=['trips_completed_as_driver'])
        if confirmed_bookings.exists():
            send_booking_completed_notification(confirmed_bookings.first(), notify_passenger=False)
        
        return Response(AnnouncementDetailSerializer(announcement, context={'request': request}).data)


# ===================== BOOKING VIEWS =====================

class BookingViewSet(viewsets.ModelViewSet):
    """CRUD для бронирований"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return BookingCreateSerializer
        return BookingSerializer

    def get_serializer_context(self):
        """Всегда передаём request в context - КРИТИЧНО для has_review_from_me"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_queryset(self):
        user = self.request.user
        return Booking.objects.filter(
            Q(passenger=user) | Q(announcement__driver=user)
        ).select_related(
            'passenger',
            'announcement',
            'announcement__driver',
            'announcement__from_location',
            'announcement__to_location',
        ).order_by('-created_at')

    def perform_create(self, serializer):
        booking = serializer.save()
        send_booking_created_notification(booking)
    
    @action(detail=False, methods=['get'])
    def my(self, request):
        """GET /api/bookings/my/ - мои бронирования как пассажира"""
        qs = Booking.objects.filter(passenger=request.user).select_related(
            'passenger',
            'announcement',
            'announcement__driver',
            'announcement__from_location',
            'announcement__to_location',
        ).order_by('-created_at')
        serializer = BookingSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def incoming(self, request):
        """GET /api/bookings/incoming/ - входящие бронирования на мои объявления"""
        qs = Booking.objects.filter(
            announcement__driver=request.user
        ).select_related(
            'passenger',
            'announcement',
            'announcement__driver',
            'announcement__from_location',
            'announcement__to_location',
        ).order_by('-created_at')
        # КРИТИЧНО: передаём context с request для has_review_from_me
        serializer = BookingSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """POST /api/bookings/{id}/confirm/ - водитель подтверждает бронирование"""
        booking = self.get_object()
        
        if booking.announcement.driver != request.user:
            return Response({"detail": "Только владелец может подтвердить."}, status=403)
        
        if booking.status != 'pending':
            return Response({"detail": "Это бронирование уже обработано."}, status=400)
        
        announcement = booking.announcement
        if not announcement.can_book(booking.seats_count):
            return Response({"detail": "Недостаточно свободных мест."}, status=400)
        
        booking.status = 'confirmed'
        booking.save(update_fields=['status', 'updated_at'])
        
        announcement.booked_seats += booking.seats_count
        if announcement.free_seats <= 0:
            announcement.status = 'full'
        announcement.save(update_fields=['booked_seats', 'status', 'updated_at'])
        send_booking_status_notification(booking)
        # ИСПРАВЛЕНО: добавлен context
        return Response(BookingSerializer(booking, context={'request': request}).data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """POST /api/bookings/{id}/reject/ - водитель отклоняет бронирование"""
        booking = self.get_object()
        
        if booking.announcement.driver != request.user:
            return Response({"detail": "Только владелец может отклонить."}, status=403)
        
        if booking.status != 'pending':
            return Response({"detail": "Это бронирование уже обработано."}, status=400)
        
        booking.status = 'rejected'
        booking.driver_comment = request.data.get('comment', '')
        booking.save(update_fields=['status', 'driver_comment', 'updated_at'])
        send_booking_status_notification(booking)
        # ИСПРАВЛЕНО: добавлен context
        return Response(BookingSerializer(booking, context={'request': request}).data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """POST /api/bookings/{id}/cancel/ - пассажир отменяет бронирование"""
        booking = self.get_object()
        
        if booking.passenger != request.user:
            return Response({"detail": "Это не ваше бронирование."}, status=403)
        
        if booking.status not in ['pending', 'confirmed']:
            return Response({"detail": "Это бронирование нельзя отменить."}, status=400)
        
        if booking.status == 'confirmed':
            announcement = booking.announcement
            announcement.booked_seats -= booking.seats_count
            if announcement.status == 'full':
                announcement.status = 'active'
            announcement.save(update_fields=['booked_seats', 'status', 'updated_at'])
        
        booking.status = 'cancelled'
        booking.save(update_fields=['status', 'updated_at'])
        send_booking_status_notification(booking)
        # ИСПРАВЛЕНО: добавлен context
        return Response(BookingSerializer(booking, context={'request': request}).data)


# ===================== REVIEW VIEWS =====================

class ReviewViewSet(viewsets.ModelViewSet):
    """CRUD для отзывов"""
    permission_classes = [IsAuthenticated]
    serializer_class = ReviewSerializer
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ReviewCreateSerializer
        return ReviewSerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_queryset(self):
        return Review.objects.select_related('author', 'recipient', 'booking', 'trip').order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def my_received(self, request):
        """GET /api/reviews/my_received/ - отзывы обо мне"""
        qs = Review.objects.filter(recipient=request.user).select_related(
            'author', 'recipient', 'booking', 'trip'
        ).order_by('-created_at')
        serializer = ReviewSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_written(self, request):
        """GET /api/reviews/my_written/ - мои отзывы"""
        qs = Review.objects.filter(author=request.user).select_related(
            'author', 'recipient', 'booking', 'trip'
        ).order_by('-created_at')
        serializer = ReviewSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)


# ===================== LEGACY VIEWS =====================

class UserReviewsListAPIView(generics.ListAPIView):
    """GET /api/users/{user_id}/reviews/ - отзывы о пользователе"""
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        return Review.objects.filter(recipient_id=user_id).select_related(
            'author', 'recipient', 'booking', 'trip'
        ).order_by('-created_at')