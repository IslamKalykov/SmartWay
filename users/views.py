import random
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions

from .models import User

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser

from .serializers import DriverDocumentUploadSerializer

from trips.serializers import ReviewSerializer
from .throttling import OTPRateThrottle
from django.conf import settings

from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny


otp_storage = {}  # временный in-memory store


from .otp import generate_otp, save_otp

class SendOTPView(APIView):
    permission_classes = [permissions.AllowAny]  # как у тебя было

    def post(self, request):
        phone = request.data.get("phone_number")
        if not phone:
            return Response({"detail": "phone_number required"}, status=status.HTTP_400_BAD_REQUEST)

        code = generate_otp()
        save_otp(phone, code)

        # тут бы мы отправили SMS — но пока не делаем
        payload = {"ok": True, "detail": "OTP generated"}
        if settings.DEBUG:
            payload["otp_debug"] = code  # показываем код только в DEBUG

        return Response(payload, status=status.HTTP_200_OK)


from .otp import get_otp

class OTPDebugView(APIView):
    # В DEBUG разрешаем всем; в проде — делай IsAdminUser или вообще не подключай этот путь
    permission_classes = [permissions.AllowAny] if settings.DEBUG else [permissions.IsAdminUser]

    def get(self, request):
        phone = request.query_params.get("phone")
        if not phone:
            return Response({"detail": "phone query param required"}, status=status.HTTP_400_BAD_REQUEST)
        code = get_otp(phone)
        print(f"Phone: {phone}, Code: {code}")
        return Response({"phone": phone, "otp": code}, status=status.HTTP_200_OK)


User = get_user_model()

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        phone = request.data.get("phone_number")
        code = request.data.get("otp_code")

        # 1) проверить OTP (твоя логика/модель хранения/кэш и т.п.)
        # if not is_valid_otp(phone, code):  # замени на свою проверку
        #     return Response({"detail": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)

        # 2) получить/создать пользователя (если так задумано)
        user, _ = User.objects.get_or_create(phone_number=phone, defaults={"full_name": phone})

        # 3) выдать JWT
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                # опционально — вернуть базовую инфу профиля сразу:
                "user": {
                    "id": user.id,
                    "phone_number": user.phone_number,
                    "full_name": getattr(user, "full_name", ""),
                    "is_driver": getattr(user, "is_driver", False),
                },
            },
            status=status.HTTP_200_OK,
        )


@api_view(['POST'])
def get_token_for_verified_user(request):
    phone = request.data.get("phone_number")

    try:
        user = User.objects.get(phone_number=phone, is_verified=True)
    except User.DoesNotExist:
        return Response({"error": "User not found or not verified"}, status=404)

    refresh = RefreshToken.for_user(user)

    return Response({
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'user_id': user.id,
        'full_name': user.full_name,
        'is_driver': user.is_driver,
    })


class UploadDriverDocumentsView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        user = request.user
        if not user.is_driver:
            return Response({"error": "Only drivers can upload documents."}, status=400)

        serializer = DriverDocumentUploadSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Documents uploaded. Await moderation."})
        return Response(serializer.errors, status=400)
    

class UserReviewsAPIView(generics.ListAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user_id = self.kwargs['id']
        return Review.objects.filter(recipient__id=user_id).order_by('-created_at')
