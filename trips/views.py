from rest_framework import generics, permissions
from .models import Trip
from .serializers import TripSerializer
from datetime import datetime

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
            departure_time__gte=datetime.now()
        ).order_by('departure_time')
