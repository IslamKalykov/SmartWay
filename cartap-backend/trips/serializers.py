# trips/serializers.py
from rest_framework import serializers
from django.utils import timezone
from .models import Trip, DriverAnnouncement, Booking, Review
from users.models import Car


# ===================== TRIP SERIALIZERS (Заказы пассажиров) =====================

class TripCreateSerializer(serializers.ModelSerializer):
    """Создание заказа пассажиром"""
    class Meta:
        model = Trip
        fields = (
            "from_location", "to_location", "departure_time",
            "passengers_count", "price", "is_negotiable",
            "contact_phone", "comment",
            "prefer_verified_driver", "allow_smoking",
            "has_luggage", "with_child", "with_pet",
        )

    def validate_departure_time(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Дата/время должны быть в будущем.")
        return value

    def validate_passengers_count(self, value):
        if value <= 0 or value > 50:
            raise serializers.ValidationError("Количество пассажиров от 1 до 50.")
        return value

    def create(self, validated_data):
        return Trip.objects.create(**validated_data)
        # user = self.context["request"].user
        # if not validated_data.get('contact_phone'):
        #     validated_data['contact_phone'] = user.phone_number
        # return Trip.objects.create(passenger=user, **validated_data)


class TripListSerializer(serializers.ModelSerializer):
    """Краткий сериализатор для списка заказов"""
    passenger_name = serializers.CharField(source="passenger.full_name", read_only=True)
    passenger_verified = serializers.BooleanField(source="passenger.is_verified_passenger", read_only=True)
    driver_name = serializers.CharField(source="driver.full_name", read_only=True, allow_null=True)
    driver_verified = serializers.BooleanField(source="driver.is_verified_driver", read_only=True, allow_null=True)

    class Meta:
        model = Trip
        fields = (
            "id", "from_location", "to_location", "departure_time",
            "passengers_count", "price", "is_negotiable", "status",
            "passenger_name", "passenger_verified",
            "driver_name", "driver_verified",
            "created_at"
        )


class TripDetailSerializer(serializers.ModelSerializer):
    """Полный сериализатор заказа"""
    passenger_name = serializers.CharField(source="passenger.full_name", read_only=True)
    passenger_phone = serializers.CharField(source="passenger.phone_number", read_only=True)
    passenger_photo = serializers.ImageField(source="passenger.photo", read_only=True)
    passenger_verified = serializers.BooleanField(source="passenger.is_verified_passenger", read_only=True)
    
    driver_name = serializers.CharField(source="driver.full_name", read_only=True, allow_null=True)
    driver_phone = serializers.CharField(source="driver.phone_number", read_only=True, allow_null=True)
    driver_photo = serializers.ImageField(source="driver.photo", read_only=True, allow_null=True)
    driver_verified = serializers.BooleanField(source="driver.is_verified_driver", read_only=True, allow_null=True)
    
    car_info = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = (
            "id", "from_location", "to_location", "departure_time",
            "passengers_count", "price", "is_negotiable",
            "status", "contact_phone", "comment",
            "prefer_verified_driver", "allow_smoking",
            "has_luggage", "with_child", "with_pet",
            "created_at", "updated_at",
            "passenger", "passenger_name", "passenger_phone", "passenger_photo", "passenger_verified",
            "driver", "driver_name", "driver_phone", "driver_photo", "driver_verified",
            "car", "car_info",
        )
        read_only_fields = ("status", "created_at", "updated_at", "passenger", "driver")
    
    def get_car_info(self, obj):
        if obj.car:
            return {
                "id": obj.car.id,
                "brand": obj.car.brand,
                "model": obj.car.model,
                "color": obj.car.color,
                "plate_number": obj.car.plate_number,
                "passenger_seats": obj.car.passenger_seats,
            }
        return None


# ===================== ANNOUNCEMENT SERIALIZERS (Объявления водителей) =====================

class AnnouncementCreateSerializer(serializers.ModelSerializer):
    """Создание объявления водителем"""
    class Meta:
        model = DriverAnnouncement
        fields = (
            "from_location", "to_location", "departure_time",
            "available_seats", "price_per_seat", "is_negotiable",
            "contact_phone", "comment", "car",
            "allow_smoking", "allow_pets", "allow_children",
            "has_air_conditioning", "intermediate_stops",
        )

    def validate_departure_time(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Дата/время должны быть в будущем.")
        return value

    def validate_available_seats(self, value):
        if value <= 0 or value > 50:
            raise serializers.ValidationError("Количество мест от 1 до 50.")
        return value
    
    def validate_car(self, value):
        if value and value.owner != self.context['request'].user:
            raise serializers.ValidationError("Это не ваш автомобиль.")
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        if not validated_data.get('contact_phone'):
            validated_data['contact_phone'] = user.phone_number
        return DriverAnnouncement.objects.create(driver=user, **validated_data)


class AnnouncementListSerializer(serializers.ModelSerializer):
    """Краткий сериализатор для списка объявлений"""
    driver_name = serializers.CharField(source="driver.full_name", read_only=True)
    driver_photo = serializers.ImageField(source="driver.photo", read_only=True)
    driver_verified = serializers.BooleanField(source="driver.is_verified_driver", read_only=True)
    driver_rating = serializers.SerializerMethodField()
    free_seats = serializers.ReadOnlyField()
    car_info = serializers.SerializerMethodField()

    class Meta:
        model = DriverAnnouncement
        fields = (
            "id", "from_location", "to_location", "departure_time",
            "available_seats", "booked_seats", "free_seats",
            "price_per_seat", "is_negotiable", "status",
            "driver", "driver_name", "driver_photo", "driver_verified", "driver_rating",
            "car_info", "created_at"
        )
    
    def get_driver_rating(self, obj):
        return getattr(obj.driver, 'average_rating_as_driver', None)
    
    def get_car_info(self, obj):
        if obj.car:
            return {
                "id": obj.car.id,
                "brand": obj.car.brand,
                "model": obj.car.model,
                "full_name": f"{obj.car.brand} {obj.car.model}",
                "color": obj.car.color,
            }
        return None


class AnnouncementDetailSerializer(serializers.ModelSerializer):
    """Полный сериализатор объявления"""
    driver_name = serializers.CharField(source="driver.full_name", read_only=True)
    driver_phone = serializers.CharField(source="driver.phone_number", read_only=True)
    driver_photo = serializers.ImageField(source="driver.photo", read_only=True)
    driver_verified = serializers.BooleanField(source="driver.is_verified_driver", read_only=True)
    driver_rating = serializers.SerializerMethodField()
    driver_trips_count = serializers.SerializerMethodField()
    free_seats = serializers.ReadOnlyField()
    car_info = serializers.SerializerMethodField()
    my_booking = serializers.SerializerMethodField()

    class Meta:
        model = DriverAnnouncement
        fields = (
            "id", "from_location", "to_location", "departure_time",
            "available_seats", "booked_seats", "free_seats",
            "price_per_seat", "is_negotiable", "status",
            "contact_phone", "comment",
            "allow_smoking", "allow_pets", "allow_children",
            "has_air_conditioning", "intermediate_stops",
            "driver", "driver_name", "driver_phone", "driver_photo", 
            "driver_verified", "driver_rating", "driver_trips_count",
            "car", "car_info", "my_booking",
            "created_at", "updated_at"
        )
        read_only_fields = ("status", "booked_seats", "created_at", "updated_at", "driver")
    
    def get_driver_rating(self, obj):
        return getattr(obj.driver, 'average_rating_as_driver', None)
    
    def get_driver_trips_count(self, obj):
        return getattr(obj.driver, 'trips_completed_as_driver', 0)
    
    def get_car_info(self, obj):
        if obj.car:
            return {
                "id": obj.car.id,
                "brand": obj.car.brand,
                "model": obj.car.model,
                "year": obj.car.year,
                "color": obj.car.color,
                "plate_number": obj.car.plate_number,
                "passenger_seats": obj.car.passenger_seats,
                "photo": obj.car.photo.url if obj.car.photo else None,
                "is_verified": obj.car.is_verified,
            }
        return None
    
    def get_my_booking(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            booking = obj.bookings.filter(passenger=request.user).first()
            if booking:
                return BookingSerializer(booking).data
        return None


# ===================== BOOKING SERIALIZERS =====================

class BookingCreateSerializer(serializers.ModelSerializer):
    """Создание бронирования пассажиром"""
    class Meta:
        model = Booking
        fields = ("announcement", "seats_count", "message", "contact_phone")
    
    def validate(self, data):
        announcement = data['announcement']
        seats = data.get('seats_count', 1)
        user = self.context['request'].user
        
        if announcement.driver == user:
            raise serializers.ValidationError("Нельзя бронировать своё объявление.")
        
        if not announcement.can_book(seats):
            raise serializers.ValidationError(
                f"Недостаточно мест. Доступно: {announcement.free_seats}"
            )
        
        if Booking.objects.filter(announcement=announcement, passenger=user).exists():
            raise serializers.ValidationError("Вы уже забронировали это объявление.")
        
        return data
    
    def create(self, validated_data):
        user = self.context['request'].user
        if not validated_data.get('contact_phone'):
            validated_data['contact_phone'] = user.phone_number
        return Booking.objects.create(passenger=user, **validated_data)


class BookingSerializer(serializers.ModelSerializer):
    """Сериализатор бронирования"""
    passenger_name = serializers.CharField(source="passenger.full_name", read_only=True)
    passenger_phone = serializers.CharField(source="passenger.phone_number", read_only=True)
    passenger_photo = serializers.ImageField(source="passenger.photo", read_only=True)
    passenger_verified = serializers.BooleanField(source="passenger.is_verified_passenger", read_only=True)
    announcement_info = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            "id", "announcement", "announcement_info",
            "passenger", "passenger_name", "passenger_phone", "passenger_photo", "passenger_verified",
            "seats_count", "status", "message", "driver_comment", "contact_phone",
            "created_at", "updated_at"
        )
        read_only_fields = ("status", "driver_comment", "created_at", "updated_at", "passenger")
    
    def get_announcement_info(self, obj):
        ann = obj.announcement
        return {
            "id": ann.id,
            "from_location": ann.from_location,
            "to_location": ann.to_location,
            "departure_time": ann.departure_time,
            "price_per_seat": str(ann.price_per_seat),
            "driver_name": ann.driver.full_name,
        }


# ===================== REVIEW SERIALIZERS =====================

class ReviewSerializer(serializers.ModelSerializer):
    """Сериализатор отзыва"""
    author_name = serializers.CharField(source="author.full_name", read_only=True)
    author_photo = serializers.ImageField(source="author.photo", read_only=True)
    recipient_name = serializers.CharField(source="recipient.full_name", read_only=True)

    class Meta:
        model = Review
        fields = (
            "id", "trip", "booking",
            "author", "author_name", "author_photo",
            "recipient", "recipient_name",
            "rating", "text",
            "was_on_time", "was_polite", "car_was_clean",
            "created_at"
        )
        read_only_fields = ("author", "recipient", "created_at")


class ReviewCreateSerializer(serializers.ModelSerializer):
    """Создание отзыва"""
    class Meta:
        model = Review
        fields = ("trip", "booking", "rating", "text", "was_on_time", "was_polite", "car_was_clean")
    
    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Рейтинг от 1 до 5")
        return value
    
    def validate(self, data):
        trip = data.get('trip')
        booking = data.get('booking')
        
        if not trip and not booking:
            raise serializers.ValidationError("Укажите trip или booking")
        
        if trip and booking:
            raise serializers.ValidationError("Укажите только trip или booking, не оба")
        
        return data
    
    def create(self, validated_data):
        user = self.context['request'].user
        trip = validated_data.get('trip')
        booking = validated_data.get('booking')
        
        # Определяем получателя
        if trip:
            if user == trip.passenger:
                recipient = trip.driver
            else:
                recipient = trip.passenger
        else:  # booking
            if user == booking.passenger:
                recipient = booking.announcement.driver
            else:
                recipient = booking.passenger
        
        if not recipient:
            raise serializers.ValidationError("Не найден получатель отзыва")
        
        return Review.objects.create(author=user, recipient=recipient, **validated_data)