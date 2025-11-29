# trips/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    TripViewSet,
    AnnouncementViewSet,
    BookingViewSet,
    ReviewViewSet,
    UserReviewsListAPIView,
)

router = DefaultRouter()
router.register(r'trips', TripViewSet, basename='trips')
router.register(r'announcements', AnnouncementViewSet, basename='announcements')
router.register(r'bookings', BookingViewSet, basename='bookings')
router.register(r'reviews', ReviewViewSet, basename='reviews')

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # Legacy endpoints
    path('users/<int:user_id>/reviews/', UserReviewsListAPIView.as_view(), name='user-reviews'),
]