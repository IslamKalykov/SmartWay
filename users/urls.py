from django.urls import path
from .views import SendOTPView, VerifyOTPView, get_token_for_verified_user


urlpatterns = [
    path('send-otp/', SendOTPView.as_view()),
    path('verify-otp/', VerifyOTPView.as_view()),
    path('login/', get_token_for_verified_user),
]
