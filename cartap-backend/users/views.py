from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Avg, Count, Q

from .models import User, Car, VerificationRequest
from .serializers import (
    UserSerializer, UserShortSerializer, UserPublicSerializer,
    UserProfileSerializer, UserProfileUpdateSerializer,
    DriverDocumentUploadSerializer,
    CarSerializer, CarCreateUpdateSerializer, CarListSerializer,
    VerificationRequestSerializer, VerificationRequestCreateSerializer,
    DriverWithCarsSerializer
)
from .otp import get_otp, delete_otp
from trips.serializers import ReviewSerializer
from trips.models import Review


# ===================== OTP AUTH =====================

class SendOtpView(APIView):
    """Отправка OTP кода"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        from .otp import generate_otp, store_otp
        from .telegram_utils import send_otp_message
        
        phone = request.data.get("phone_number", "").strip()
        if not phone:
            return Response(
                {"detail": "phone_number is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        normalized_phone = phone.replace("+", "").replace(" ", "")
        
        # Генерируем и сохраняем код
        code = generate_otp()
        store_otp(normalized_phone, code)
        
        # Пытаемся отправить через Telegram
        try:
            user = User.objects.filter(phone_number=normalized_phone).first()
            if user and user.telegram_chat_id:
                send_otp_message(user.telegram_chat_id, code)
        except Exception as e:
            print(f"[OTP] Telegram send error: {e}")
        
        return Response({"detail": "OTP sent"}, status=status.HTTP_200_OK)


class VerifyOtpView(APIView):
    """Верификация OTP и авторизация"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        phone = request.data.get("phone_number", "").strip()
        code = request.data.get("otp_code", "").strip()
        full_name = request.data.get("full_name", "").strip()
        role = request.data.get("role", "").strip()
        
        if not phone or not code:
            return Response(
                {"detail": "phone_number and otp_code are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        normalized_phone = phone.replace("+", "").replace(" ", "")
        stored_code = get_otp(normalized_phone)
        
        if stored_code is None or stored_code != code:
            return Response(
                {"detail": "Invalid OTP"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        delete_otp(normalized_phone)
        
        user, created = User.objects.get_or_create(
            phone_number=normalized_phone,
            defaults={"full_name": full_name or normalized_phone}
        )
        
        changed = False
        if full_name and not user.full_name:
            user.full_name = full_name
            changed = True
        if role in ("driver", "passenger"):
            user.is_driver = (role == "driver")
            changed = True
        
        if created or changed:
            user.save()
        
        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserProfileSerializer(user).data
        }, status=status.HTTP_200_OK)


# ===================== PROFILE =====================

class MyProfileView(generics.RetrieveUpdateAPIView):
    """
    GET /api/users/me/ - получить свой профиль
    PATCH /api/users/me/ - обновить профиль
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.request.method in ['PATCH', 'PUT']:
            return UserProfileUpdateSerializer
        return UserProfileSerializer
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Возвращаем полный профиль
        return Response(UserProfileSerializer(instance).data)


class UserPublicProfileView(generics.RetrieveAPIView):
    """
    GET /api/users/<id>/profile/ - публичный профиль пользователя
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserPublicSerializer
    queryset = User.objects.filter(is_active=True)
    lookup_field = 'id'


class UploadPhotoView(APIView):
    """Загрузка фото профиля"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        user = request.user
        photo = request.FILES.get('photo')
        
        if not photo:
            return Response(
                {"detail": "photo is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.photo = photo
        user.save(update_fields=['photo', 'updated_at'])
        
        return Response({
            "message": "Фото успешно загружено",
            "photo_url": user.photo.url if user.photo else None
        })


class UploadDriverDocumentsView(APIView):
    """Загрузка документов водителя"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        user = request.user
        if not user.is_driver:
            return Response(
                {"error": "Only drivers can upload documents."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = DriverDocumentUploadSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Documents uploaded. Await moderation."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SwitchRoleView(APIView):
    """Переключение роли водитель/пассажир"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        new_role = request.data.get('role')
        
        if new_role not in ('driver', 'passenger'):
            return Response(
                {"detail": "role must be 'driver' or 'passenger'"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_driver = (new_role == 'driver')
        user.save(update_fields=['is_driver', 'updated_at'])
        
        return Response({
            "message": f"Роль изменена на {'водителя' if user.is_driver else 'пассажира'}",
            "is_driver": user.is_driver
        })


# ===================== CARS =====================

class CarViewSet(viewsets.ModelViewSet):
    """
    CRUD для автомобилей водителя
    GET /api/users/cars/ - список своих авто
    POST /api/users/cars/ - добавить авто
    GET /api/users/cars/<id>/ - детали авто
    PATCH /api/users/cars/<id>/ - обновить авто
    DELETE /api/users/cars/<id>/ - удалить авто
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CarCreateUpdateSerializer
        return CarSerializer
    
    def get_queryset(self):
        return Car.objects.filter(owner=self.request.user)
    
    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_driver:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Только водители могут добавлять автомобили")
        serializer.save(owner=user)
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Деактивировать авто"""
        car = self.get_object()
        car.is_active = False
        car.save(update_fields=['is_active', 'updated_at'])
        return Response({"message": "Автомобиль деактивирован"})
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Активировать авто"""
        car = self.get_object()
        car.is_active = True
        car.save(update_fields=['is_active', 'updated_at'])
        return Response({"message": "Автомобиль активирован"})


class PublicCarDetailView(generics.RetrieveAPIView):
    """Публичная информация об автомобиле"""
    permission_classes = [IsAuthenticated]
    serializer_class = CarSerializer
    queryset = Car.objects.filter(is_active=True)


# ===================== DRIVERS LIST (FOR PASSENGERS) =====================

class DriversListView(generics.ListAPIView):
    """
    GET /api/users/drivers/ - список водителей с их авто (для пассажиров)
    Фильтры: ?seats_min=4&verified=true&city=Бишкек
    """
    permission_classes = [IsAuthenticated]
    serializer_class = DriverWithCarsSerializer
    
    def get_queryset(self):
        queryset = User.objects.filter(
            is_driver=True,
            is_active=True,
            cars__is_active=True  # Только водители с активными авто
        ).distinct().annotate(
            avg_rating=Avg('received_reviews__rating', filter=Q(received_reviews__author__is_driver=False)),
            total_trips=Count('driver_trips', filter=Q(driver_trips__status='completed'))
        ).order_by('-is_verified_driver', '-avg_rating', '-total_trips')
        
        # Фильтры
        verified = self.request.query_params.get('verified')
        if verified == 'true':
            queryset = queryset.filter(is_verified_driver=True)
        
        city = self.request.query_params.get('city')
        if city:
            queryset = queryset.filter(city__icontains=city)
        
        seats_min = self.request.query_params.get('seats_min')
        if seats_min:
            try:
                queryset = queryset.filter(cars__passenger_seats__gte=int(seats_min))
            except ValueError:
                pass
        
        return queryset


class DriverDetailView(generics.RetrieveAPIView):
    """
    GET /api/users/drivers/<id>/ - детальная информация о водителе
    """
    permission_classes = [IsAuthenticated]
    serializer_class = DriverWithCarsSerializer
    queryset = User.objects.filter(is_driver=True, is_active=True)
    lookup_field = 'id'


# ===================== VERIFICATION =====================

class VerificationRequestViewSet(viewsets.ModelViewSet):
    """
    POST /api/users/verification/ - создать заявку на верификацию
    GET /api/users/verification/ - мои заявки
    GET /api/users/verification/<id>/ - детали заявки
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return VerificationRequestCreateSerializer
        return VerificationRequestSerializer
    
    def get_queryset(self):
        return VerificationRequest.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """Статус верификации пользователя"""
        user = request.user
        
        pending_requests = VerificationRequest.objects.filter(
            user=user,
            status=VerificationRequest.Status.PENDING
        )
        
        return Response({
            "is_verified_driver": user.is_verified_driver,
            "is_verified_passenger": user.is_verified_passenger,
            "pending_driver_verification": pending_requests.filter(
                verification_type='driver'
            ).exists(),
            "pending_passenger_verification": pending_requests.filter(
                verification_type='passenger'
            ).exists()
        })


# ===================== REVIEWS =====================

class UserReviewsAPIView(generics.ListAPIView):
    """
    GET /api/users/<id>/reviews/ - отзывы о пользователе
    Водители видят отзывы о пассажирах, пассажиры - о водителях
    """
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user_id = self.kwargs['id']
        target_user = get_object_or_404(User, id=user_id)
        request_user = self.request.user
        
        # Водитель просматривает пассажира - видит отзывы от других водителей
        if request_user.is_driver and not target_user.is_driver:
            return Review.objects.filter(
                recipient=target_user,
                author__is_driver=True  # Отзывы от водителей
            ).select_related('author', 'trip').order_by('-created_at')
        
        # Пассажир просматривает водителя - видит отзывы от других пассажиров
        elif not request_user.is_driver and target_user.is_driver:
            return Review.objects.filter(
                recipient=target_user,
                author__is_driver=False  # Отзывы от пассажиров
            ).select_related('author', 'trip').order_by('-created_at')
        
        # В остальных случаях - все отзывы
        return Review.objects.filter(
            recipient=target_user
        ).select_related('author', 'trip').order_by('-created_at')


class MyReceivedReviewsView(generics.ListAPIView):
    """GET /api/users/me/reviews/received/ - отзывы обо мне"""
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Review.objects.filter(
            recipient=self.request.user
        ).select_related('author', 'trip').order_by('-created_at')


class MyWrittenReviewsView(generics.ListAPIView):
    """GET /api/users/me/reviews/written/ - мои отзывы"""
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Review.objects.filter(
            author=self.request.user
        ).select_related('recipient', 'trip').order_by('-created_at')


# ===================== TOKEN =====================

@api_view(['POST'])
def get_token_for_verified_user(request):
    phone = request.data.get("phone_number")
    
    try:
        user = User.objects.get(phone_number=phone)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)
    
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'user': UserProfileSerializer(user).data
    })