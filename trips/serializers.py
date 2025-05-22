from rest_framework import serializers
from .models import Trip, Review
from users.models import User  # если нужно
from users.serializers import UserPublicSerializer, UserShortSerializer

class TripSerializer(serializers.ModelSerializer):
    driver = UserPublicSerializer(read_only=True)
    passenger = UserPublicSerializer(read_only=True)

    class Meta:
        model = Trip
        fields = '__all__'  # или явно перечисли


class ReviewSerializer(serializers.ModelSerializer):
    author = UserShortSerializer(read_only=True)
    recipient = UserShortSerializer(read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'trip', 'author', 'recipient', 'rating', 'text', 'created_at']
        read_only_fields = ['id', 'author', 'recipient', 'created_at']
    
    def validate(self, attrs):
        trip = attrs.get('trip')
        author = self.context['request'].user
        if Review.objects.filter(trip=trip, author=author).exists():
            raise serializers.ValidationError("Вы уже оставляли отзыв на эту поездку.")
        return attrs
