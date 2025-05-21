from rest_framework import serializers
from .models import Trip
from users.models import User  # если нужно
from users.serializers import UserPublicSerializer  # если есть

class TripSerializer(serializers.ModelSerializer):
    driver = UserPublicSerializer(read_only=True)
    passenger = UserPublicSerializer(read_only=True)

    class Meta:
        model = Trip
        fields = '__all__'  # или явно перечисли
