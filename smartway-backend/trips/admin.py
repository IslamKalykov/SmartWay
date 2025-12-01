# trips/admin.py
from django.contrib import admin
from .models import Trip, DriverAnnouncement, Booking, Review


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'from_location', 'to_location', 'departure_time',
        'status', 'passenger', 'driver', 'price', 'created_at'
    )
    list_filter = ('status', 'is_negotiable', 'created_at')
    search_fields = ('from_location', 'to_location', 'passenger__full_name', 'driver__full_name')
    raw_id_fields = ('passenger', 'driver', 'car')
    date_hierarchy = 'departure_time'


@admin.register(DriverAnnouncement)
class DriverAnnouncementAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'from_location', 'to_location', 'departure_time',
        'status', 'driver', 'available_seats', 'booked_seats', 'price_per_seat', 'created_at'
    )
    list_filter = ('status', 'is_negotiable', 'created_at')
    search_fields = ('from_location', 'to_location', 'driver__full_name')
    raw_id_fields = ('driver', 'car')
    date_hierarchy = 'departure_time'


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'announcement', 'passenger', 'seats_count', 'status', 'created_at'
    )
    list_filter = ('status', 'created_at')
    search_fields = ('passenger__full_name', 'announcement__from_location')
    raw_id_fields = ('announcement', 'passenger')


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'recipient', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
    search_fields = ('author__full_name', 'recipient__full_name', 'text')
    raw_id_fields = ('trip', 'booking', 'author', 'recipient')