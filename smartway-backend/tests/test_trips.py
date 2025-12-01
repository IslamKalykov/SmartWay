import pytest
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from users.models import User
from trips.models import Trip

@pytest.mark.django_db
def test_trip_create_validation():
    user = User.objects.create_user(phone_number="+996700000001", full_name="U")
    client = APIClient()
    # имитация JWT не делаем, просто логинимся как user (если у тебя только JWT - тогда мокни авторизацию)
    client.force_authenticate(user=user)

    payload = {
        "from_location": "A",
        "to_location": "B",
        "departure_time": (timezone.now() - timedelta(hours=1)).isoformat(),
        "passengers_count": 1,
    }
    res = client.post("/api/trips/", payload, format="json")
    assert res.status_code in (400, 422)
    assert "Дата/время" in str(res.data)

@pytest.mark.django_db
def test_trip_create_ok():
    user = User.objects.create_user(phone_number="+996700000002", full_name="U2")
    client = APIClient()
    client.force_authenticate(user=user)

    payload = {
        "from_location": "A",
        "to_location": "B",
        "departure_time": (timezone.now() + timedelta(hours=2)).isoformat(),
        "passengers_count": 2,
        "price": "100.00",
        "is_negotiable": False,
    }
    res = client.post("/api/trips/", payload, format="json")
    assert res.status_code in (200, 201)
    t = Trip.objects.get(id=res.data["id"]) if "id" in res.data else Trip.objects.first()
    assert t.passenger == user
    assert t.status == Trip.TripStatus.PENDING

@pytest.mark.django_db
def test_otp_throttle(settings):
    from users.throttling import OTPRateThrottle
    # Проверим конфиг
    assert "DEFAULT_THROTTLE_CLASSES" in settings.REST_FRAMEWORK
    assert OTPRateThrottle.__name__ in str(settings.REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"])
