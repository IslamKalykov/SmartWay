import logging
from django.utils import timezone

from users.telegram_utils import send_telegram_message


logger = logging.getLogger(__name__)


def _format_time(dt):
    try:
        return timezone.localtime(dt).strftime("%d.%m %H:%M")
    except Exception:
        return dt.strftime("%d.%m %H:%M")


def _route_label(from_loc, to_loc):
    return f"{from_loc} → {to_loc}"


def send_trip_taken_notification(trip):
    """Уведомить пассажира, что водитель взял его заказ"""
    passenger_chat = getattr(trip.passenger, "telegram_chat_id", None)
    driver = trip.driver

    if not passenger_chat or not driver:
        return

    text = (
        "Ваш заказ принят!\n"
        f"Маршрут: {_route_label(trip.from_location, trip.to_location)}\n"
        f"Время: {_format_time(trip.departure_time)}\n"
        f"Водитель: {driver.full_name or driver.phone_number}\n"
        f"Телефон: {driver.phone_number}"
    )
    send_telegram_message(passenger_chat, text)


def send_booking_created_notification(booking):
    """Уведомить водителя о новой заявке на его объявление"""
    announcement = booking.announcement
    driver_chat = getattr(announcement.driver, "telegram_chat_id", None)

    if not driver_chat:
        return

    text = (
        "Новая бронь на ваше объявление.\n"
        f"Маршрут: {_route_label(announcement.from_location, announcement.to_location)}\n"
        f"Дата и время: {_format_time(announcement.departure_time)}\n"
        f"Пассажир: {booking.passenger.full_name or booking.passenger.phone_number}\n"
        f"Мест: {booking.seats_count}\n"
        f"Телефон: {booking.contact_phone or booking.passenger.phone_number}"
    )
    send_telegram_message(driver_chat, text)


def send_trip_completed_notification(trip):
    """Уведомить участников о завершении поездки и напомнить оставить отзыв"""
    route = _route_label(trip.from_location, trip.to_location)
    time_label = _format_time(trip.departure_time)

    if getattr(trip.passenger, "telegram_chat_id", None):
        passenger_text = (
            "Поездка завершена.\n"
            f"{route} ({time_label})\n"
            "Пожалуйста, оцените водителя и поездку в приложении."
        )
        send_telegram_message(trip.passenger.telegram_chat_id, passenger_text)

    if trip.driver and getattr(trip.driver, "telegram_chat_id", None):
        driver_text = (
            "Поездка завершена.\n"
            f"{route} ({time_label})\n"
            "Не забудьте оценить пассажира."
        )
        send_telegram_message(trip.driver.telegram_chat_id, driver_text)


def send_booking_completed_notification(booking, *, notify_driver=True, notify_passenger=True):
    """Уведомить водителя и пассажира о завершении бронирования и просьбе оценить друг друга"""
    announcement = booking.announcement
    route = _route_label(announcement.from_location, announcement.to_location)
    time_label = _format_time(announcement.departure_time)

    if notify_passenger and getattr(booking.passenger, "telegram_chat_id", None):
        passenger_text = (
            "Поездка завершена.\n"
            f"{route} ({time_label})\n"
            "Пожалуйста, оцените водителя."
        )
        send_telegram_message(booking.passenger.telegram_chat_id, passenger_text)

    if notify_driver and getattr(announcement.driver, "telegram_chat_id", None):
        driver_text = (
            "Поездка завершена.\n"
            f"{route} ({time_label})\n"
            "Не забудьте оценить пассажира."
        )
        send_telegram_message(announcement.driver.telegram_chat_id, driver_text)