from django.db import models
from django.conf import settings

from django.core.exceptions import ValidationError
from django.utils import timezone

class Trip(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Открыта"
        TAKEN = "taken", "Взята"
        IN_PROGRESS = "in_progress", "В пути"
        COMPLETED = "completed", "Завершена"
        CANCELLED = "cancelled", "Отменена"
        EXPIRED = "expired", "Просрочена"

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

    from_location = models.CharField(max_length=255)
    to_location = models.CharField(max_length=255)

    departure_time = models.DateTimeField()
    passengers_count = models.PositiveIntegerField()

    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_negotiable = models.BooleanField(default=False)

    contact_phone = models.CharField(max_length=32, blank=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Review(models.Model):
    trip = models.ForeignKey("Trip", on_delete=models.CASCADE, related_name="reviews")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="written_reviews")
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_reviews")
    rating = models.PositiveSmallIntegerField()
    text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("trip", "author")

    def __str__(self):
        return f"Review from {self.author} to {self.recipient} ({self.rating})"
