from rest_framework import serializers
from django.utils import timezone
from .models import Trip, Review

class TripCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = (
            "from_location",
            "to_location",
            "departure_time",
            "passengers_count",
            "price",
            "is_negotiable",
            # "route_link",  # поля нет в модели, поэтому не используем
        )

    def validate_departure_time(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Дата/время должны быть в будущем.")
        return value

    def validate_passengers_count(self, value):
        if value <= 0:
            raise serializers.ValidationError("Мест должно быть > 0.")
        return value

    def validate_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Цена не может быть отрицательной.")
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        return Trip.objects.create(passenger=user, **validated_data)



class TripListSerializer(serializers.ModelSerializer):
    passenger_name = serializers.CharField(source="passenger.full_name", read_only=True)

    class Meta:
        model = Trip
        fields = ("id", "from_location", "to_location", "departure_time", "passengers_count", "price", "is_negotiable", "status", "passenger_name")


class TripSerializer(serializers.ModelSerializer):
    """Полный сериализатор для retrieve/деталей."""
    passenger_name = serializers.CharField(source="passenger.full_name", read_only=True)
    driver_name = serializers.CharField(source="driver.full_name", read_only=True)
    passenger_phone = serializers.CharField(source="passenger.phone_number", read_only=True)

    class Meta:
        model = Trip
        fields = (
            "id",
            "from_location",
            "to_location", 
            "departure_time",
            "passengers_count",
            "price", "is_negotiable",
            "status",
            "created_at", "updated_at",
            "passenger", "passenger_name", "passenger_phone",
            "driver", "driver_name",
        )
        read_only_fields = ("status", "created_at", "updated_at", "passenger", "driver")




class TripStatusUpdateSerializer(serializers.ModelSerializer):
    """Обновление статуса поездки (минималка, без сложных переходов)."""
    class Meta:
        model = Trip
        fields = ("status",)

    def validate_status(self, value):
        # Если хочешь строгие переходы — можно добавить FSM-логику тут.
        if value not in dict(Trip.TripStatus.choices):
            raise serializers.ValidationError("Некорректный статус.")
        return value
    

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ("id", "trip", "recipient", "rating", "text", "created_at")
        read_only_fields = ("created_at",)

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Рейтинг 1..5.")
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        trip = attrs.get("trip")
        if trip.status != Trip.TripStatus.COMPLETED:
            raise serializers.ValidationError("Оценку можно оставить только по завершённой поездке.")
        # запрещаем сам себе
        if attrs.get("recipient_id") == user.id:
            raise serializers.ValidationError("Нельзя ставить оценку самому себе.")
        return attrs

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)
