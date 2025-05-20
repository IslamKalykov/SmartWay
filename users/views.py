import random
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import User

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes


otp_storage = {}  # временный in-memory store


class SendOTPView(APIView):
    def post(self, request):
        phone = request.data.get("phone_number")
        if not phone:
            return Response({"error": "Phone number required"}, status=400)

        otp = random.randint(1000, 9999)
        otp_storage[phone] = str(otp)
        print(f"📲 OTP for {phone}: {otp}")  # имитация SMS

        return Response({"message": "OTP sent (check terminal)"}, status=200)


class VerifyOTPView(APIView):
    def post(self, request):
        phone = request.data.get("phone_number")
        otp = request.data.get("otp")
        full_name = request.data.get("full_name")
        is_driver = request.data.get("is_driver", False)

        if otp_storage.get(phone) != otp:
            return Response({"error": "Invalid OTP"}, status=400)

        user, created = User.objects.get_or_create(phone_number=phone)

        # обновляем данные, даже если пользователь уже есть
        user.full_name = full_name if full_name else user.full_name
        user.is_driver = is_driver
        user.is_verified = True
        user.save()

        return Response({
            "message": "OTP verified and profile updated",
            "user_id": user.id,
            "is_driver": user.is_driver,
            "full_name": user.full_name
        }, status=200)


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