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

from .telegram_utils import send_otp_message
from .otp import generate_otp, save_otp, delete_otp, get_otp

User = get_user_model()

class SendOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        phone = request.data.get("phone_number")
        phone = request.data.get("phone_number")
        normalized_phone = phone.replace("+", "").replace(" ", "")

        if not phone:
            return Response({"detail": "phone_number required"}, status=status.HTTP_400_BAD_REQUEST)

        code = generate_otp()
        save_otp(normalized_phone, code)
        print(f"[OTP] saved: phone={normalized_phone}, code={code}")

        user = User.objects.filter(phone_number=normalized_phone).first()

        if user and getattr(user, "telegram_chat_id", None):
            print(f"[OTP] sending to telegram: chat_id={user.telegram_chat_id}, code={code}")
            send_otp_message(user.telegram_chat_id, code)
        else:
            print(f"[OTP] no telegram_chat_id for phone={normalized_phone}, code={code}")

        payload = {"ok": True, "detail": "OTP generated"}
        if settings.DEBUG:
            payload["otp_debug"] = code

        return Response(payload, status=status.HTTP_200_OK)


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


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        phone = request.data.get("phone_number", "").strip()
        code = request.data.get("otp_code", "").strip()
        full_name = request.data.get("full_name")  # 👈 опционально
        role = request.data.get("role")            # 👈 "driver" | "passenger" (опц.)

        if not phone or not code:
            return Response(
                {"detail": "phone_number and otp_code are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # такая же нормализация, как в send-otp / otp.py
        normalized_phone = phone.replace("+", "").replace(" ", "")

        stored_code = get_otp(normalized_phone)
        print(
            f"[OTP] verify: phone={phone}, normalized={normalized_phone}, stored={stored_code}, incoming={code}"
        )

        if stored_code is None or stored_code != code:
            return Response({"detail": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)

        delete_otp(normalized_phone)

        user, created = User.objects.get_or_create(
            phone_number=normalized_phone,
            defaults={"full_name": full_name or normalized_phone},
        )

        # если регистрация — прилетит role/full_name → обновим
        changed = False
        if full_name:
            user.full_name = full_name
            changed = True
        if role in ("driver", "passenger"):
            user.is_driver = role == "driver"
            changed = True

        if created or changed:
            user.save()

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
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
