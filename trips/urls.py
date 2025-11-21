
from .views import (
    TripCreateAPIView,
    TripListAPIView,
    TakeTripAPIView,
    MyTripsAPIView,
    TakenTripsAPIView,
    PublishedTripsAPIView,
    ReviewCreateAPIView,
    UpdateTripStatusAPIView,
    TripViewSet,
    AvailableTripsForDriversView,
)

from rest_framework.routers import DefaultRouter
from django.urls import path, include

router = DefaultRouter()
router.register("", TripViewSet, basename="trips")

urlpatterns = [
    path("available/", AvailableTripsForDriversView.as_view(), name="trips-available"),
    path("", include(router.urls)),
]