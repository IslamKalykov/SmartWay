from django.db import models
from django.conf import settings

class Trip(models.Model):
    passenger = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trips'
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

    def __str__(self):
        return f"{self.passenger.full_name} — {self.from_location} → {self.to_location}"
