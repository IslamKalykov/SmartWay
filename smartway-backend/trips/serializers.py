# trips/serializers.py
from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from .models import Trip, DriverAnnouncement, Booking, Review
from users.models import Car

# trips/serializers.py (в начало файла, после импортов)
def _resolve_lang_from_request(request):
    """
    Надёжно получить 2-символьный код языка из request:
    1) ?lang=xy
    2) request.LANGUAGE_CODE (Django LocaleMiddleware)
    3) Accept-Language header (парсим первый предпочтительный язык)
    Иначе возвращаем 'ru' по-умолчанию.
    """
    if not request:
        return 'ru'

    # 1) query param
    lang = request.query_params.get('lang')
    if lang:
        return lang[:2]

    # 2) Django LocaleMiddleware
    language_code = getattr(request, 'LANGUAGE_CODE', None)
    if language_code:
        return language_code[:2]

    # 3) Accept-Language
    al = request.headers.get('Accept-Language') or request.META.get('HTTP_ACCEPT_LANGUAGE', '') or ''
    if al:
        # берем первую часть, убираем q/регион и т.п.
        first = al.split(',')[0].strip()
        first = first.split(';')[0].strip()
        first = first.split('-')[0].strip()
        if first:
            return first[:2]

    return 'ru'


# ===================== TRIP SERIALIZERS (Заказы пассажиров) =====================

class TripCreateSerializer(serializers.ModelSerializer):
    """Создание заказа пассажиром"""
    class Meta:
        model = Trip
        fields = (
            "from_location", "to_location", "departure_time",
            "passengers_count", "price", "is_negotiable",
            "contact_phone", "comment",
            "prefer_verified_driver", "allow_smoking", "allow_pets",
            "allow_big_luggage", "baggage_help", "with_child", "extra_rules",
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
        user = self.context["request"].user
        # Убираем passenger если он случайно попал в validated_data
        validated_data.pop('passenger', None)
        if not validated_data.get('contact_phone'):
            validated_data['contact_phone'] = user.phone_number
        return Trip.objects.create(passenger=user, **validated_data)


class TripListSerializer(serializers.ModelSerializer):
    """Краткий сериализатор для списка заказов"""
    passenger_name = serializers.CharField(source="passenger.full_name", read_only=True)
    passenger_phone = serializers.CharField(source="passenger.phone_number", read_only=True)
    passenger_verified = serializers.BooleanField(source="passenger.is_verified_passenger", read_only=True)
    driver_name = serializers.CharField(source="driver.full_name", read_only=True, allow_null=True)
    driver_verified = serializers.BooleanField(source="driver.is_verified_driver", read_only=True, allow_null=True)
    
    from_location_display = serializers.SerializerMethodField()
    to_location_display = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = (
            "id", "from_location", "to_location", 
            "from_location_display", "to_location_display",
            "departure_time", "passengers_count", "price", "is_negotiable", "status",
            "contact_phone",  # ← ДОБАВИЛИ
            "passenger_name", "passenger_phone", "passenger_verified",  # ← passenger_phone
            "driver_name", "driver_verified",
            "allow_smoking", "allow_pets", "allow_big_luggage",
            "with_child", "baggage_help",
            "created_at"
        )
    
    def get_from_location_display(self, obj):
        lang = self._get_lang()
        return obj.from_location.get_name(lang)
    
    def get_to_location_display(self, obj):
        lang = self._get_lang()
        return obj.to_location.get_name(lang)
    
    def _get_lang(self):
        return _resolve_lang_from_request(self.context.get('request'))



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
    from_location_display = serializers.SerializerMethodField()
    to_location_display = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = (
            "id", "from_location", "to_location", 
            "from_location_display", "to_location_display",
            "departure_time", "passengers_count", "price", "is_negotiable",
            "status", "contact_phone", "comment",
            "prefer_verified_driver", "allow_smoking", "allow_pets",
            "allow_big_luggage", "baggage_help", "with_child", "extra_rules",
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
    
    def get_from_location_display(self, obj):
        lang = self._get_lang()
        return obj.from_location.get_name(lang)
    
    def get_to_location_display(self, obj):
        lang = self._get_lang()
        return obj.to_location.get_name(lang)
    
    def _get_lang(self):
        return _resolve_lang_from_request(self.context.get('request'))



# ===================== ANNOUNCEMENT SERIALIZERS (Объявления водителей) =====================

class AnnouncementCreateSerializer(serializers.ModelSerializer):
    """Создание объявления водителем"""
    class Meta:
        model = DriverAnnouncement
        fields = (
            "from_location", "to_location", "departure_time",
            "available_seats", "price_per_seat", "is_negotiable",
            "contact_phone", "comment", "car",
            "allow_smoking", "allow_pets", "allow_big_luggage",
            "baggage_help", "allow_children", "has_air_conditioning",
            "extra_rules", "intermediate_stops",
        )

    def validate_departure_time(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Дата/время должны быть в будущем.")
        return value

    def validate_available_seats(self, value):
        if value <= 0 or value > 50:
            raise serializers.ValidationError("Количество мест от 1 до 50.")
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        if not validated_data.get('contact_phone'):
            validated_data['contact_phone'] = user.phone_number
        return DriverAnnouncement.objects.create(driver=user, **validated_data)


class AnnouncementCreateSerializer(serializers.ModelSerializer):
    """Создание объявления водителем"""
    class Meta:
        model = DriverAnnouncement
        fields = (
            "from_location", "to_location", "departure_time",
            "available_seats", "price_per_seat", "is_negotiable",
            "contact_phone", "comment", "car",
            "allow_smoking", "allow_pets", "allow_big_luggage",
            "baggage_help", "allow_children", "has_air_conditioning",
            "extra_rules", "intermediate_stops",
        )

    def validate_departure_time(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Дата/время должны быть в будущем.")
        return value

    def validate_available_seats(self, value):
        if value <= 0 or value > 50:
            raise serializers.ValidationError("Количество мест от 1 до 50.")
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        # Убираем driver если попал в validated_data
        validated_data.pop('driver', None)
        if not validated_data.get('contact_phone'):
            validated_data['contact_phone'] = user.phone_number
        return DriverAnnouncement.objects.create(driver=user, **validated_data)


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
    from_location_display = serializers.SerializerMethodField()
    to_location_display = serializers.SerializerMethodField()

    class Meta:
        model = DriverAnnouncement
        fields = (
            "id", "from_location", "to_location",
            "from_location_display", "to_location_display",
            "departure_time",
            "available_seats", "booked_seats", "free_seats",
            "price_per_seat", "is_negotiable", "status",
            "contact_phone", "comment",
            "allow_smoking", "allow_pets", "allow_big_luggage",
            "baggage_help", "allow_children", "has_air_conditioning",
            "extra_rules", "intermediate_stops",
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
                return BookingSerializer(booking, context=self.context).data
        return None
    
    def get_from_location_display(self, obj):
        lang = self._get_lang()
        return obj.from_location.get_name(lang)
    
    def get_to_location_display(self, obj):
        lang = self._get_lang()
        return obj.to_location.get_name(lang)
    
    def _get_lang(self):
        return _resolve_lang_from_request(self.context.get('request'))


# ===================== BOOKING SERIALIZERS =====================

class BookingCreateSerializer(serializers.ModelSerializer):
    """Создание бронирования пассажиром"""
    class Meta:
        model = Booking
        fields = ("announcement", "seats_count", "message", "contact_phone")

    def validate(self, data):
        announcement = data["announcement"]
        seats = data.get("seats_count", 1)
        user = self.context["request"].user

        # Нельзя бронировать своё объявление
        if announcement.driver == user:
            raise serializers.ValidationError("Нельзя бронировать своё объявление.")

        # Проверяем, нет ли уже НЕОБРАБОТАННОГО запроса на это объявление
        existing_pending = Booking.objects.filter(
            announcement=announcement,
            passenger=user,
            status="pending",
        ).exists()

        if existing_pending:
            raise serializers.ValidationError(
                "У вас уже есть запрос на это объявление. Дождитесь решения водителя."
            )

        # Проверяем, хватает ли свободных мест (с учётом уже подтверждённых)
        if not announcement.can_book(seats):
            raise serializers.ValidationError(
                f"Недостаточно мест. Доступно: {announcement.free_seats}"
            )

        return data

    def create(self, validated_data):
        user = self.context["request"].user
        if not validated_data.get("contact_phone"):
            validated_data["contact_phone"] = user.phone_number
        # ВСЕГДА создаём новую запись
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
        lang = self._get_lang()
        return {
            "id": ann.id,
            "from_location": ann.from_location.get_name(lang),
            "to_location": ann.to_location.get_name(lang),
            "departure_time": ann.departure_time,
            "price_per_seat": str(ann.price_per_seat),
            "driver_name": ann.driver.full_name,
        }
    
    def _get_lang(self):
        return _resolve_lang_from_request(self.context.get('request'))


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
        
        if trip:
            if user == trip.passenger:
                recipient = trip.driver
            else:
                recipient = trip.passenger
        else:
            if user == booking.passenger:
                recipient = booking.announcement.driver
            else:
                recipient = booking.passenger
        
        if not recipient:
            raise serializers.ValidationError("Не найден получатель отзыва")
        
        return Review.objects.create(author=user, recipient=recipient, **validated_data)
    
class AnnouncementListSerializer(serializers.ModelSerializer):
    """Список объявлений водителей"""
    from_location_display = serializers.SerializerMethodField()
    to_location_display = serializers.SerializerMethodField()
    driver_name = serializers.CharField(source="driver.full_name", read_only=True)
    driver_phone = serializers.CharField(source="driver.phone_number", read_only=True)
    driver_photo = serializers.ImageField(source="driver.photo", read_only=True)
    driver_verified = serializers.BooleanField(source="driver.is_verified_driver", read_only=True)
    driver_rating = serializers.FloatField(source="driver.average_rating", read_only=True)
    car_info = serializers.SerializerMethodField()
    free_seats = serializers.SerializerMethodField()

    class Meta:
        model = DriverAnnouncement
        fields = (
            "id", "from_location", "to_location",
            "from_location_display", "to_location_display",
            "departure_time", "available_seats", "booked_seats", "free_seats",
            "price_per_seat", "is_negotiable", "status",
            "driver", "driver_name", "driver_phone", "driver_photo",
            "driver_verified", "driver_rating",
            "car", "car_info",
            "allow_smoking", "allow_pets", "allow_big_luggage",
            "baggage_help", "allow_children", "has_air_conditioning",
            "comment", "created_at",
        )

    def _get_lang(self):
        return _resolve_lang_from_request(self.context.get('request'))

    def get_from_location_display(self, obj):
        lang = self._get_lang()
        return obj.from_location.get_name(lang)

    def get_to_location_display(self, obj):
        lang = self._get_lang()
        return obj.to_location.get_name(lang)

    def get_car_info(self, obj):
        if obj.car:
            return {
                "id": obj.car.id,
                "brand": obj.car.brand,
                "model": obj.car.model,
                "color": obj.car.color,
                "plate_number": obj.car.plate_number,
                "year": obj.car.year,
                "passenger_seats": obj.car.passenger_seats,
            }
        return None

    def get_free_seats(self, obj):
        return obj.available_seats - obj.booked_seats