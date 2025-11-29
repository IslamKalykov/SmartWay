from rest_framework import serializers
from .models import User, Car, VerificationRequest


class UserSerializer(serializers.ModelSerializer):
    """Базовый сериализатор пользователя"""
    class Meta:
        model = User
        fields = (
            "id", "phone_number", "full_name", "is_driver", "public_id",
            "photo", "is_verified_driver", "is_verified_passenger"
        )


class UserShortSerializer(serializers.ModelSerializer):
    """Краткий сериализатор для списков"""
    class Meta:
        model = User
        fields = ['id', 'phone_number', 'full_name']


class UserPublicSerializer(serializers.ModelSerializer):
    """Публичный профиль пользователя (для других пользователей)"""
    average_rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = (
            'id', 'full_name', 'photo', 'city', 'bio',
            'is_driver', 'is_verified_driver', 'is_verified_passenger',
            'trips_completed_as_driver', 'trips_completed_as_passenger',
            'average_rating', 'reviews_count', 'created_at'
        )
    
    def get_average_rating(self, obj):
        """Возвращает рейтинг в зависимости от роли просматривающего"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Водитель видит рейтинг пользователя как пассажира
            if request.user.is_driver:
                return obj.average_rating_as_passenger
            # Пассажир видит рейтинг пользователя как водителя
            else:
                return obj.average_rating_as_driver
        return None
    
    def get_reviews_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if request.user.is_driver:
                return obj.reviews_count_as_passenger
            else:
                return obj.reviews_count_as_driver
        return 0


class UserProfileSerializer(serializers.ModelSerializer):
    """Полный профиль для владельца аккаунта"""
    average_rating_as_driver = serializers.ReadOnlyField()
    average_rating_as_passenger = serializers.ReadOnlyField()
    reviews_count_as_driver = serializers.ReadOnlyField()
    reviews_count_as_passenger = serializers.ReadOnlyField()
    cars = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = (
            'id', 'phone_number', 'full_name', 'photo', 'bio', 'city', 'birth_date',
            'is_driver', 'is_verified_driver', 'is_verified_passenger',
            'is_approved', 'public_id',
            'trips_completed_as_driver', 'trips_completed_as_passenger',
            'average_rating_as_driver', 'average_rating_as_passenger',
            'reviews_count_as_driver', 'reviews_count_as_passenger',
            'cars', 'created_at', 'updated_at'
        )
        read_only_fields = (
            'id', 'phone_number', 'public_id', 'is_verified_driver', 
            'is_verified_passenger', 'is_approved',
            'trips_completed_as_driver', 'trips_completed_as_passenger',
            'created_at', 'updated_at'
        )
    
    def get_cars(self, obj):
        if obj.is_driver:
            cars = obj.cars.filter(is_active=True)
            return CarSerializer(cars, many=True).data
        return []


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления профиля"""
    class Meta:
        model = User
        fields = ('full_name', 'photo', 'bio', 'city', 'birth_date', 'is_driver')
    
    def validate_full_name(self, value):
        if value and len(value.strip()) < 2:
            raise serializers.ValidationError("Имя должно содержать минимум 2 символа")
        return value.strip() if value else value


class DriverDocumentUploadSerializer(serializers.ModelSerializer):
    """Загрузка документов водителя"""
    class Meta:
        model = User
        fields = ['photo', 'passport_photo', 'license_photo']


# ===================== CAR SERIALIZERS =====================

class CarSerializer(serializers.ModelSerializer):
    """Полный сериализатор автомобиля"""
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)
    owner_verified = serializers.BooleanField(source='owner.is_verified_driver', read_only=True)
    owner_rating = serializers.SerializerMethodField()
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = Car
        fields = (
            'id', 'owner', 'owner_name', 'owner_verified', 'owner_rating',
            'brand', 'model', 'year', 'color', 'car_type', 'full_name',
            'plate_number', 'passenger_seats', 'photo',
            'has_air_conditioning', 'has_wifi', 'has_child_seat',
            'allows_smoking', 'allows_pets', 'has_luggage_space',
            'is_active', 'is_verified', 'created_at'
        )
        read_only_fields = ('id', 'owner', 'is_verified', 'created_at')
    
    def get_owner_rating(self, obj):
        return obj.owner.average_rating_as_driver


class CarCreateUpdateSerializer(serializers.ModelSerializer):
    """Создание/обновление автомобиля"""
    class Meta:
        model = Car
        fields = (
            'brand', 'model', 'year', 'color', 'car_type',
            'plate_number', 'passenger_seats', 'photo',
            'has_air_conditioning', 'has_wifi', 'has_child_seat',
            'allows_smoking', 'allows_pets', 'has_luggage_space',
            'is_active', 'registration_photo'
        )
    
    def validate_passenger_seats(self, value):
        if value < 1 or value > 50:
            raise serializers.ValidationError("Количество мест должно быть от 1 до 50")
        return value
    
    def validate_year(self, value):
        if value:
            import datetime
            current_year = datetime.datetime.now().year
            if value < 1950 or value > current_year + 1:
                raise serializers.ValidationError(f"Год выпуска должен быть между 1950 и {current_year + 1}")
        return value
    
    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class CarListSerializer(serializers.ModelSerializer):
    """Краткий сериализатор для списка авто"""
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)
    owner_photo = serializers.ImageField(source='owner.photo', read_only=True)
    owner_verified = serializers.BooleanField(source='owner.is_verified_driver', read_only=True)
    owner_rating = serializers.SerializerMethodField()
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = Car
        fields = (
            'id', 'owner', 'owner_name', 'owner_photo', 'owner_verified', 'owner_rating',
            'brand', 'model', 'year', 'full_name', 'photo',
            'passenger_seats', 'car_type', 'is_verified'
        )
    
    def get_owner_rating(self, obj):
        return obj.owner.average_rating_as_driver


# ===================== VERIFICATION SERIALIZERS =====================

class VerificationRequestSerializer(serializers.ModelSerializer):
    """Сериализатор заявки на верификацию"""
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    
    class Meta:
        model = VerificationRequest
        fields = (
            'id', 'user', 'user_name', 'verification_type', 'status',
            'document_1', 'document_2', 'document_3',
            'comment', 'admin_comment', 'created_at', 'reviewed_at'
        )
        read_only_fields = ('id', 'user', 'status', 'admin_comment', 'reviewed_at')


class VerificationRequestCreateSerializer(serializers.ModelSerializer):
    """Создание заявки на верификацию"""
    class Meta:
        model = VerificationRequest
        fields = ('verification_type', 'document_1', 'document_2', 'document_3', 'comment')
    
    def validate(self, data):
        user = self.context['request'].user
        verification_type = data.get('verification_type')
        
        # Проверяем, нет ли уже активной заявки
        existing = VerificationRequest.objects.filter(
            user=user,
            verification_type=verification_type,
            status=VerificationRequest.Status.PENDING
        ).exists()
        
        if existing:
            raise serializers.ValidationError(
                "У вас уже есть активная заявка на верификацию этого типа"
            )
        
        # Проверяем, не верифицирован ли уже
        if verification_type == 'driver' and user.is_verified_driver:
            raise serializers.ValidationError("Вы уже верифицированы как водитель")
        if verification_type == 'passenger' and user.is_verified_passenger:
            raise serializers.ValidationError("Вы уже верифицированы как пассажир")
        
        # Требуем хотя бы один документ
        if not any([data.get('document_1'), data.get('document_2'), data.get('document_3')]):
            raise serializers.ValidationError("Необходимо загрузить хотя бы один документ")
        
        return data
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


# ===================== DRIVER LIST SERIALIZER =====================

class DriverWithCarsSerializer(serializers.ModelSerializer):
    """Водитель со списком его автомобилей (для пассажиров)"""
    cars = CarListSerializer(many=True, read_only=True, source='active_cars')
    average_rating = serializers.ReadOnlyField(source='average_rating_as_driver')
    reviews_count = serializers.ReadOnlyField(source='reviews_count_as_driver')
    
    class Meta:
        model = User
        fields = (
            'id', 'full_name', 'photo', 'city', 'bio',
            'is_verified_driver', 'trips_completed_as_driver',
            'average_rating', 'reviews_count', 'cars'
        )
    
    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Фильтруем только активные авто
        ret['cars'] = CarListSerializer(
            instance.cars.filter(is_active=True),
            many=True
        ).data
        return ret