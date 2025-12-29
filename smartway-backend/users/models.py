from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from uuid import uuid4
from django.core.validators import RegexValidator
import random

phone_validator = RegexValidator(
    regex=r"^\+?\d{10,15}$",
    message="Телефон должен быть в международном формате, только цифры и опциональный '+'"
)


def user_directory_path(instance, filename):
    ext = filename.split(".")[-1]
    filename = f"{uuid4().hex}.{ext}"
    return f"users/user_{instance.id}/{filename}"


# --- Совместимость со старыми миграциями ---
def user_passport_path(instance, filename):
    return user_directory_path(instance, filename)


def user_license_path(instance, filename):
    return user_directory_path(instance, filename)
# --- конец блока совместимости ---


class UserManager(BaseUserManager):
    def _generate_public_id(self):
        while True:
            code = str(random.randint(10_000_000, 99_999_999))
            if not self.model.objects.filter(public_id=code).exists():
                return code

    def create_user(self, phone_number, full_name=None, password=None):
        if not phone_number:
            raise ValueError("Users must have a phone number")
        user = self.model(phone_number=phone_number, full_name=full_name or "")
        user.public_id = self._generate_public_id()
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, full_name="Admin", password=None):
        if not password:
            raise ValueError("Superuser must have a password.")
        user = self.create_user(phone_number, full_name, password)
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.save(using=self._db)
        return user


class User(AbstractBaseUser, PermissionsMixin):
    phone_number = models.CharField(max_length=20, unique=True, validators=[phone_validator])
    full_name = models.CharField(max_length=100, blank=True, default="")
    
    # Фото профиля
    photo = models.ImageField(upload_to=user_directory_path, blank=True, null=True)
    
    # Документы для верификации
    passport_photo = models.ImageField(upload_to=user_directory_path, blank=True, null=True)
    license_photo = models.ImageField(upload_to=user_directory_path, blank=True, null=True)
    
    # Дополнительная информация профиля
    bio = models.TextField(max_length=500, blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    birth_date = models.DateField(null=True, blank=True)
    
    # Системные поля
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=False)
    is_driver = models.BooleanField(default=False)
    
    # Верификация
    is_verified_driver = models.BooleanField(default=False)  # Подтверждённый водитель
    is_verified_passenger = models.BooleanField(default=False)  # Подтверждённый пассажир
    verification_requested_at = models.DateTimeField(null=True, blank=True)
    verification_comment = models.TextField(blank=True, default="")  # Комментарий модератора
    
    telegram_chat_id = models.BigIntegerField(null=True, blank=True)
    
    # Публичный ID
    public_id = models.CharField(max_length=16, unique=True, blank=True, null=True)
    pin_code = models.CharField(max_length=128, blank=True, default="")
    
    # Статистика
    trips_completed_as_driver = models.PositiveIntegerField(default=0)
    trips_completed_as_passenger = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "phone_number"
    REQUIRED_FIELDS = ["full_name"]

    objects = UserManager()

    def __str__(self):
        return f"{self.full_name} ({self.phone_number})".strip()

    def has_perm(self, perm, obj=None):
        return bool(self.is_superuser)

    def has_module_perms(self, app_label):
        return bool(self.is_superuser)
    
    @property
    def average_rating_as_driver(self):
        """Средний рейтинг как водителя"""
        from trips.models import Review
        reviews = Review.objects.filter(recipient=self, author__is_driver=False)
        if reviews.exists():
            return round(reviews.aggregate(models.Avg('rating'))['rating__avg'], 1)
        return None
    
    @property
    def average_rating_as_passenger(self):
        """Средний рейтинг как пассажира"""
        from trips.models import Review
        reviews = Review.objects.filter(recipient=self, author__is_driver=True)
        if reviews.exists():
            return round(reviews.aggregate(models.Avg('rating'))['rating__avg'], 1)
        return None
    
    @property
    def reviews_count_as_driver(self):
        from trips.models import Review
        return Review.objects.filter(recipient=self, author__is_driver=False).count()
    
    @property
    def reviews_count_as_passenger(self):
        from trips.models import Review
        return Review.objects.filter(recipient=self, author__is_driver=True).count()

    @property
    def has_pin(self) -> bool:
        return bool(self.pin_code)
    
    def set_pin(self, raw_pin: str) -> None:
        self.pin_code = make_password(raw_pin)
    
    def check_pin(self, raw_pin: str) -> bool:
        if not self.pin_code:
            return False
        return check_password(raw_pin, self.pin_code)


class Car(models.Model):
    """Модель автомобиля водителя"""
    
    class CarType(models.TextChoices):
        SEDAN = "sedan", "Седан"
        SUV = "suv", "Внедорожник"
        MINIVAN = "minivan", "Минивэн"
        HATCHBACK = "hatchback", "Хэтчбек"
        WAGON = "wagon", "Универсал"
        OTHER = "other", "Другое"
    
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="cars"
    )
    
    # Основная информация
    brand = models.CharField(max_length=50)  # Марка (Toyota, Honda, etc.)
    model = models.CharField(max_length=50)  # Модель (Camry, Civic, etc.)
    year = models.PositiveIntegerField(null=True, blank=True)  # Год выпуска
    color = models.CharField(max_length=30, blank=True, default="")
    car_type = models.CharField(
        max_length=20,
        choices=CarType.choices,
        default=CarType.SEDAN
    )
    
    # Госномер
    plate_number = models.CharField(max_length=20)
    
    # Вместимость
    passenger_seats = models.PositiveIntegerField(default=4)  # Пассажирских мест
    
    # Фото автомобиля
    photo = models.ImageField(upload_to='cars/', blank=True, null=True)
    
    # Дополнительные удобства
    has_air_conditioning = models.BooleanField(default=True)
    has_wifi = models.BooleanField(default=False)
    has_child_seat = models.BooleanField(default=False)
    allows_smoking = models.BooleanField(default=False)
    allows_pets = models.BooleanField(default=False)
    has_luggage_space = models.BooleanField(default=True)
    
    # Статус
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)  # Проверен модератором
    
    # Документы авто
    registration_photo = models.ImageField(upload_to='cars/documents/', blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Автомобиль"
        verbose_name_plural = "Автомобили"
    
    def __str__(self):
        return f"{self.brand} {self.model} ({self.plate_number})"
    
    @property
    def full_name(self):
        year_str = f" {self.year}" if self.year else ""
        return f"{self.brand} {self.model}{year_str}"


class VerificationRequest(models.Model):
    """Заявки на верификацию пользователей"""
    
    class Status(models.TextChoices):
        PENDING = "pending", "На рассмотрении"
        APPROVED = "approved", "Одобрено"
        REJECTED = "rejected", "Отклонено"
    
    class VerificationType(models.TextChoices):
        DRIVER = "driver", "Верификация водителя"
        PASSENGER = "passenger", "Верификация пассажира"
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="verification_requests"
    )
    
    verification_type = models.CharField(
        max_length=20,
        choices=VerificationType.choices
    )
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    # Документы, приложенные к заявке
    document_1 = models.ImageField(upload_to='verification/', blank=True, null=True)
    document_2 = models.ImageField(upload_to='verification/', blank=True, null=True)
    document_3 = models.ImageField(upload_to='verification/', blank=True, null=True)
    
    comment = models.TextField(blank=True, default="")  # Комментарий пользователя
    admin_comment = models.TextField(blank=True, default="")  # Комментарий модератора
    
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="reviewed_verifications"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Заявка на верификацию"
        verbose_name_plural = "Заявки на верификацию"
        ordering = ["-created_at"]
    
    def __str__(self):
        return f"Верификация {self.get_verification_type_display()} - {self.user.full_name}"