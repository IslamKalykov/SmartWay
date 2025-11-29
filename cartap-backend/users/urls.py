from django.urls import path
from .views import OTPDebugView, SendOTPView, VerifyOTPView, get_token_for_verified_user, UploadDriverDocumentsView, UserReviewsAPIView
from trips.views import UserReviewsListAPIView



urlpatterns = [
    path('send-otp/', SendOTPView.as_view(), name="send-otp"),
    path('verify-otp/', VerifyOTPView.as_view()),
    path('login/', get_token_for_verified_user),
    path('upload-documents/', UploadDriverDocumentsView.as_view()),
    # path('<int:id>/reviews/', UserReviewsAPIView.as_view()),
    path('users/<int:user_id>/reviews/', UserReviewsListAPIView.as_view(), name='user-reviews'),
    path('otp-debug/', OTPDebugView.as_view(), name="otp-debug"),
]
