from rest_framework import generics, permissions
from .models import Trip
from .serializers import TripSerializer
from datetime import datetime
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from rest_framework import viewsets


class TripCreateAPIView(generics.CreateAPIView):
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        if not self.request.user.is_driver:  # только пассажиры могут создавать
            serializer.save(passenger=self.request.user)
        else:
            raise PermissionError("Водители не могут создавать поездки")

class TripListAPIView(generics.ListAPIView):
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Trip.objects.filter(
            is_active=True,
            status=Trip.TripStatus.PENDING,
            departure_time__gte=datetime.now()
    )


class TakeTripAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, trip_id):
        trip = get_object_or_404(Trip, id=trip_id)

        if request.user.is_driver:
            if trip.status != Trip.TripStatus.PENDING:
                return Response({"error": "Эта поездка уже занята."}, status=status.HTTP_400_BAD_REQUEST)

            trip.driver = request.user
            trip.status = Trip.TripStatus.TAKEN
            trip.save()

            return Response({"success": "Вы успешно взяли поездку."}, status=status.HTTP_200_OK)
        return Response({"error": "Только водители могут брать поездки."}, status=status.HTTP_403_FORBIDDEN)
    

class MyTripsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        trips = Trip.objects.filter(driver=user) | Trip.objects.filter(passenger=user)
        serializer = TripSerializer(trips, many=True)
        return Response(serializer.data)

class TakenTripsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        trips = Trip.objects.filter(driver=user)
        serializer = TripSerializer(trips, many=True)
        return Response(serializer.data)

class PublishedTripsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        trips = Trip.objects.filter(passenger=user)
        serializer = TripSerializer(trips, many=True)
        return Response(serializer.data)