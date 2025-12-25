# trips/serializers.py
from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from .models import Trip, DriverAnnouncement, Booking, Review
from users.models import Car
from locations.models import Location


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


def _ensure_location_instance(value):
    """
    Поддерживаем совместимость: принимаем ID или строку и создаём Location при необходимости.
    """
    if isinstance(value, Location):
        return value
    if value is None:
        raise serializers.ValidationError("Укажите локацию")

    # Если передан ID
    if isinstance(value, int) or (isinstance(value, str) and str(value).isdigit()):
        try:
            return Location.objects.get(id=int(value))
        except Location.DoesNotExist:
            raise serializers.ValidationError("Локация не найдена")

    # Строковое название - создаём/используем code по названию
    if isinstance(value, str):
        code = value.lower().replace(" ", "-")[:50]
        location, _ = Location.objects.get_or_create(
            code=code,
            defaults={
                "name_ru": value,
                "name_en": value,
                "name_ky": value,
            },
        )
        return location

    raise serializers.ValidationError("Неверный формат локации")


def _ensure_location_id(value):
    return _ensure_location_instance(value).id


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

    def to_internal_value(self, data):
        data = data.copy()
        if 'from_location' in data:
            data['from_location'] = _ensure_location_id(data.get('from_location'))
        if 'to_location' in data:
            data['to_location'] = _ensure_location_id(data.get('to_location'))
        return super().to_internal_value(data)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        attrs["from_location"] = _ensure_location_instance(attrs.get("from_location"))
        attrs["to_location"] = _ensure_location_instance(attrs.get("to_location"))
        return attrs

    def create(self, validated_data):
        passenger = validated_data.pop("passenger", None) or self.context["request"].user
        # Убираем driver на всякий случай, чтобы не сохранить в заказе
        validated_data.pop("driver", None)

        if not validated_data.get("contact_phone"):
            validated_data["contact_phone"] = getattr(passenger, "phone_number", "")

        return Trip.objects.create(passenger=passenger, **validated_data)


class TripListSerializer(serializers.ModelSerializer):
    """Краткий сериализатор для списка заказов"""
    passenger_name = serializers.CharField(source="passenger.full_name", read_only=True)
    passenger_phone = serializers.CharField(source="passenger.phone_number", read_only=True)
    passenger_verified = serializers.BooleanField(source="passenger.is_verified_passenger", read_only=True)
    driver_phone = serializers.CharField(source="driver.phone_number", read_only=True, allow_null=True)
    driver_name = serializers.CharField(source="driver.full_name", read_only=True, allow_null=True)
    driver_verified = serializers.BooleanField(source="driver.is_verified_driver", read_only=True, allow_null=True)
    has_review_from_me = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()

    from_location_display = serializers.SerializerMethodField()
    to_location_display = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = (
            "id", "from_location", "to_location", 
            "from_location_display", "to_location_display",
            "departure_time", "passengers_count", "price", "is_negotiable", "status",
            "contact_phone",
            "passenger", "driver",
            "passenger_name", "passenger_phone", "passenger_verified",
            "driver_name", "driver_phone", "driver_verified",
            "my_role", "has_review_from_me",
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

    def get_has_review_from_me(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return False
        return obj.reviews.filter(author=user).exists()

    def get_my_role(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return None
        if obj.passenger_id == user.id:
            return 'passenger'
        if obj.driver_id == user.id:
            return 'driver'
        return None
    
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

    def to_internal_value(self, data):
        data = data.copy()
        if 'from_location' in data:
            data['from_location'] = _ensure_location_id(data.get('from_location'))
        if 'to_location' in data:
            data['to_location'] = _ensure_location_id(data.get('to_location'))
        return super().to_internal_value(data)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        attrs["from_location"] = _ensure_location_instance(attrs.get("from_location"))
        attrs["to_location"] = _ensure_location_instance(attrs.get("to_location"))
        return attrs

    def create(self, validated_data):
        driver = validated_data.pop("driver", None) or self.context["request"].user
        if not validated_data.get("contact_phone"):
            validated_data["contact_phone"] = driver.phone_number
        return DriverAnnouncement.objects.create(driver=driver, **validated_data)


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

    def validate_seats_count(self, value):
        if value <= 0:
            raise serializers.ValidationError("Количество мест должно быть больше нуля.")
        return value

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

        # Проверяем, хватает ли свободных мест (с учётом уже подтверждённых и физической вместимости авто)
        if not announcement.can_book(seats):
            raise serializers.ValidationError(
                f"Невозможно создать бронирование: доступно {announcement.free_seats} мест."
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
    contact_telegram = serializers.SerializerMethodField()
    passenger_telegram = serializers.SerializerMethodField()
    seats_requested = serializers.IntegerField(source="seats_count", read_only=True)
    announcement_info = serializers.SerializerMethodField()
    announcement_from = serializers.SerializerMethodField()
    announcement_to = serializers.SerializerMethodField()
    driver_phone = serializers.SerializerMethodField()
    has_review_from_me = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            "id", "announcement", "announcement_info",
            "passenger", "passenger_name", "passenger_phone", "passenger_photo", "passenger_verified", "passenger_telegram", "contact_telegram",
            "seats_count", "seats_requested", "status", "message", "driver_comment", "contact_phone",
            "announcement_from", "announcement_to", "driver_phone",
            "has_review_from_me",
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
            "driver_phone": ann.contact_phone or ann.driver.phone_number,
        }
    
    def get_announcement_from(self, obj):
        lang = self._get_lang()
        return obj.announcement.from_location.get_name(lang)

    def get_announcement_to(self, obj):
        lang = self._get_lang()
        return obj.announcement.to_location.get_name(lang)

    def get_driver_phone(self, obj):
        return obj.announcement.contact_phone or obj.announcement.driver.phone_number
    
    def get_has_review_from_me(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return False
        
        # Проверяем: оставлял ли текущий пользователь отзыв по этому бронированию
        # (либо как пассажир, либо как водитель объявления)
        has_review = Review.objects.filter(author=user, booking=obj).exists()
        
        # Дополнительная проверка: если пользователь - водитель объявления,
        # проверим отзыв где recipient = пассажир этого бронирования
        if not has_review and obj.announcement.driver_id == user.id:
            has_review = Review.objects.filter(
                author=user,
                recipient_id=obj.passenger_id,
                booking__announcement_id=obj.announcement_id
            ).exists()
        
        return has_review

    def get_passenger_telegram(self, obj):
        return getattr(obj.passenger, "telegram_username", None) or getattr(obj.passenger, "telegram", None)

    def get_contact_telegram(self, obj):
        explicit_contact = getattr(obj, "contact_telegram", None)
        if explicit_contact:
            return explicit_contact
        return self.get_passenger_telegram(obj)

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
        user = self.context['request'].user
        recipient = None
        
        if not trip and not booking:
            raise serializers.ValidationError("Укажите trip или booking")
        
        if trip and booking:
            raise serializers.ValidationError("Укажите только trip или booking, не оба")
        
        if trip:
            # Отзыв по Trip (заказу пассажира, который взял водитель)
            if trip.status != Trip.Status.COMPLETED:
                raise serializers.ValidationError("Отзыв можно оставить после завершения поездки")

            if user != trip.passenger and user != trip.driver:
                raise serializers.ValidationError("Вы не участвовали в этой поездке")

            # Проверяем, не оставлял ли уже отзыв по этому trip
            if Review.objects.filter(author=user, trip=trip).exists():
                raise serializers.ValidationError("Вы уже оставили отзыв по этой поездке")

            # Определяем получателя отзыва
            if user == trip.passenger:
                recipient = trip.driver
            else:
                recipient = trip.passenger
                
            if not recipient:
                raise serializers.ValidationError("Не найден получатель отзыва (водитель/пассажир)")
        else:
            # Отзыв по Booking (бронированию на объявление водителя)
            announcement = booking.announcement
            driver = announcement.driver
            
            # Разрешаем отзыв если:
            # 1. Booking завершён (completed)
            # 2. ИЛИ Announcement завершён (completed) и booking подтверждён (confirmed)
            booking_completed = booking.status == Booking.Status.COMPLETED
            announcement_completed = announcement.status == DriverAnnouncement.Status.COMPLETED
            booking_confirmed = booking.status == Booking.Status.CONFIRMED
            
            if not (booking_completed or (announcement_completed and booking_confirmed)):
                raise serializers.ValidationError("Отзыв можно оставить только по завершённой поездке")

            if user != booking.passenger and user != driver:
                raise serializers.ValidationError("Вы не участвовали в этом бронировании")

            # Проверяем, не оставлял ли уже отзыв по этому booking
            if Review.objects.filter(author=user, booking=booking).exists():
                raise serializers.ValidationError("Вы уже оставили отзыв по этому бронированию")

            # Определяем получателя отзыва
            if user == booking.passenger:
                recipient = driver
            else:
                recipient = booking.passenger
        
        if not recipient:
            raise serializers.ValidationError("Не найден получатель отзыва")
            
        data['recipient'] = recipient
        return data
    
    def create(self, validated_data):
        user = self.context['request'].user
        recipient = validated_data.pop('recipient')
        
        # Явно извлекаем booking и trip чтобы убедиться что они сохраняются
        booking = validated_data.get('booking')
        trip = validated_data.get('trip')
        
        review = Review.objects.create(
            author=user,
            recipient=recipient,
            booking=booking,
            trip=trip,
            rating=validated_data.get('rating'),
            text=validated_data.get('text', ''),
            was_on_time=validated_data.get('was_on_time', False),
            was_polite=validated_data.get('was_polite', False),
            car_was_clean=validated_data.get('car_was_clean', False),
        )
        return review


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
        return obj.free_seats