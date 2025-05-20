import random
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import User


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

        if otp_storage.get(phone) != otp:
            return Response({"error": "Invalid OTP"}, status=400)

        user, created = User.objects.get_or_create(phone_number=phone)
        user.is_verified = True
        user.save()

        return Response({
            "message": "OTP verified",
            "user_id": user.id,
            "is_new_user": created
        }, status=200)
