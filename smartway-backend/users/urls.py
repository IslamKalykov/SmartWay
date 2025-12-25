from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    SendOtpView, VerifyOtpView, get_token_for_verified_user,
    MyProfileView, UserPublicProfileView, UploadPhotoView,
    UploadDriverDocumentsView, SwitchRoleView,
    CarViewSet, PublicCarDetailView,
    DriversListView, DriverDetailView,
    VerificationRequestViewSet,
    UserReviewsAPIView, MyReceivedReviewsView, MyWrittenReviewsView, DebugAuthView,
)

router = DefaultRouter()
router.register(r'cars', CarViewSet, basename='cars')
router.register(r'verification', VerificationRequestViewSet, basename='verification')

urlpatterns = [
    # Auth
    path('send-otp/', SendOtpView.as_view(), name='send-otp'),
    path('verify-otp/', VerifyOtpView.as_view(), name='verify-otp'),
    path('token/', get_token_for_verified_user, name='get-token'),
    
    # Profile
    path('me/', MyProfileView.as_view(), name='my-profile'),
    path('me/photo/', UploadPhotoView.as_view(), name='upload-photo'),
    path('me/documents/', UploadDriverDocumentsView.as_view(), name='upload-documents'),
    path('me/switch-role/', SwitchRoleView.as_view(), name='switch-role'),
    path('me/reviews/received/', MyReceivedReviewsView.as_view(), name='my-received-reviews'),
    path('me/reviews/written/', MyWrittenReviewsView.as_view(), name='my-written-reviews'),
    path('<int:id>/', UserPublicProfileView.as_view(), name='user-profile-legacy'),
    
    # Public profiles
    path('<int:id>/profile/', UserPublicProfileView.as_view(), name='user-profile'),
    path('<int:id>/reviews/', UserReviewsAPIView.as_view(), name='user-reviews'),
    
    # Drivers list (for passengers)
    path('drivers/', DriversListView.as_view(), name='drivers-list'),
    path('drivers/<int:id>/', DriverDetailView.as_view(), name='driver-detail'),
    
    # Public car info
    path('public-car/<int:pk>/', PublicCarDetailView.as_view(), name='public-car'),
    path("api/debug-auth/", DebugAuthView.as_view()),

    
    # Router URLs (cars, verification)
    path('', include(router.urls)),
]