# trips/models.py
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone


class Trip(models.Model):
    """Заказ от пассажира - пассажир создаёт, водитель забирает"""
    
    class Status(models.TextChoices):
        OPEN = "open", "Открыта"
        TAKEN = "taken", "Взята"
        IN_PROGRESS = "in_progress", "В пути"
        COMPLETED = "completed", "Завершена"
        CANCELLED = "cancelled", "Отменена"
        EXPIRED = "expired", "Просрочена"

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )

    passenger = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="passenger_trips",
    )
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="driver_trips",
    )
    
    car = models.ForeignKey(
        'users.Car',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="trips"
    )

    from_location = models.CharField(max_length=255)
    to_location = models.CharField(max_length=255)
    departure_time = models.DateTimeField()
    passengers_count = models.PositiveIntegerField(default=1)

    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_negotiable = models.BooleanField(default=False)
    contact_phone = models.CharField(max_length=32, blank=True)
    comment = models.TextField(blank=True, default="")
    
    # Предпочтения пассажира
    prefer_verified_driver = models.BooleanField(default=False)
    allow_smoking = models.BooleanField(default=False)
    has_luggage = models.BooleanField(default=False)
    with_child = models.BooleanField(default=False)
    with_pet = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Заказ пассажира"
        verbose_name_plural = "Заказы пассажиров"

    def __str__(self):
        return f"[Заказ] {self.from_location} → {self.to_location} ({self.departure_time.strftime('%d.%m %H:%M')})"


class DriverAnnouncement(models.Model):
    """Объявление от водителя - водитель создаёт, пассажиры обращаются"""
    
    class Status(models.TextChoices):
        ACTIVE = "active", "Активно"
        FULL = "full", "Мест нет"
        COMPLETED = "completed", "Завершено"
        CANCELLED = "cancelled", "Отменено"
        EXPIRED = "expired", "Просрочено"

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )

    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="announcements",
    )
    
    car = models.ForeignKey(
        'users.Car',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="announcements"
    )

    from_location = models.CharField(max_length=255)
    to_location = models.CharField(max_length=255)
    departure_time = models.DateTimeField()
    
    # Сколько мест доступно
    available_seats = models.PositiveIntegerField(default=4)
    booked_seats = models.PositiveIntegerField(default=0)
    
    price_per_seat = models.DecimalField(max_digits=10, decimal_places=2)
    is_negotiable = models.BooleanField(default=False)
    
    contact_phone = models.CharField(max_length=32, blank=True)
    comment = models.TextField(blank=True, default="")
    
    # Условия поездки
    allow_smoking = models.BooleanField(default=False)
    allow_pets = models.BooleanField(default=False)
    allow_children = models.BooleanField(default=True)
    has_air_conditioning = models.BooleanField(default=True)
    
    # Промежуточные точки (опционально)
    intermediate_stops = models.TextField(blank=True, default="", help_text="Промежуточные остановки через запятую")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Объявление водителя"
        verbose_name_plural = "Объявления водителей"

    def __str__(self):
        return f"[Объявление] {self.from_location} → {self.to_location} ({self.departure_time.strftime('%d.%m %H:%M')})"
    
    @property
    def free_seats(self):
        return self.available_seats - self.booked_seats
    
    def can_book(self, seats: int = 1) -> bool:
        return self.status == self.Status.ACTIVE and self.free_seats >= seats


class Booking(models.Model):
    """Бронирование места в объявлении водителя"""
    
    class Status(models.TextChoices):
        PENDING = "pending", "Ожидает подтверждения"
        CONFIRMED = "confirmed", "Подтверждено"
        REJECTED = "rejected", "Отклонено"
        CANCELLED = "cancelled", "Отменено"
        COMPLETED = "completed", "Завершено"

    announcement = models.ForeignKey(
        DriverAnnouncement,
        on_delete=models.CASCADE,
        related_name="bookings"
    )
    passenger = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookings"
    )
    
    seats_count = models.PositiveIntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    
    message = models.TextField(blank=True, default="")  # Сообщение от пассажира
    driver_comment = models.TextField(blank=True, default="")  # Ответ водителя
    
    contact_phone = models.CharField(max_length=32, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ('announcement', 'passenger')
        verbose_name = "Бронирование"
        verbose_name_plural = "Бронирования"

    def __str__(self):
        return f"Бронь {self.passenger} на {self.announcement}"


class Review(models.Model):
    """Отзыв о поездке"""
    
    # Может быть связан либо с Trip, либо с Booking
    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name="reviews",
        null=True, blank=True
    )
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name="reviews",
        null=True, blank=True
    )
    
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="written_reviews"
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_reviews"
    )
    
    rating = models.PositiveSmallIntegerField()  # 1-5
    text = models.TextField(blank=True, default="")
    
    was_on_time = models.BooleanField(null=True, blank=True)
    was_polite = models.BooleanField(null=True, blank=True)
    car_was_clean = models.BooleanField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Отзыв"
        verbose_name_plural = "Отзывы"

    def __str__(self):
        return f"Отзыв от {self.author} для {self.recipient} ({self.rating}★)"