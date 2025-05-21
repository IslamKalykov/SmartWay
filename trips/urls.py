from django.urls import path
from .views import TripCreateAPIView, TripListAPIView

urlpatterns = [
    path('create/', TripCreateAPIView.as_view(), name='trip-create'),
    path('list/', TripListAPIView.as_view(), name='trip-list'),
]
