from django.urls import path
from .views import (
    TripCreateAPIView,
    TripListAPIView,
    TakeTripAPIView,
    MyTripsAPIView,
    TakenTripsAPIView,
    PublishedTripsAPIView,
    ReviewCreateAPIView,
)

urlpatterns = [
    path('create/', TripCreateAPIView.as_view(), name='trip-create'),
    path('list/', TripListAPIView.as_view(), name='trip-list'),
    path('take/<int:trip_id>/', TakeTripAPIView.as_view(), name='trip-take'),

    # ➕ новые маршруты
    path('my/', MyTripsAPIView.as_view(), name='trip-my'),
    path('taken/', TakenTripsAPIView.as_view(), name='trip-taken'),
    path('published/', PublishedTripsAPIView.as_view(), name='trip-published'),
    
    # Отзывы
    path('review/create/', ReviewCreateAPIView.as_view(), name='review-create'),
]
