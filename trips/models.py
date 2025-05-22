from django.db import models
from django.conf import settings

    
    
class Trip(models.Model):
    
    class TripStatus(models.TextChoices):
        PENDING = "pending", "Ожидает"
        TAKEN = "taken", "Взята"
        COMPLETED = "completed", "Завершена"
        CANCELED = "canceled", "Отменена"
    
    passenger = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trips'
    )
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='taken_trips',
        null=True,
        blank=True
    )
    from_location = models.CharField(max_length=255)
    to_location = models.CharField(max_length=255)
    departure_time = models.DateTimeField()
    passengers_count = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_negotiable = models.BooleanField(default=False)
    route_link = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
    max_length=20,
    choices=TripStatus.choices,
    default=TripStatus.PENDING
)

    def __str__(self):
        return f"{self.passenger.full_name} — {self.from_location} → {self.to_location}"


class Review(models.Model):
    trip = models.ForeignKey("Trip", on_delete=models.CASCADE, related_name="reviews")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="written_reviews")
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_reviews")
    rating = models.PositiveSmallIntegerField()  # от 1 до 5
    text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('trip', 'author')  # Один отзыв от пользователя на поездку

    def __str__(self):
        return f"Review from {self.author} to {self.recipient} ({self.rating})"
