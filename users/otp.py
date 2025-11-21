import random
from django.core.cache import cache

OTP_TTL = 15 * 60  # 15 минут, как и планировали

def generate_otp(length: int = 4) -> str:
    return "".join(random.choice("0123456789") for _ in range(length))

def save_otp(phone: str, code: str, ttl: int = OTP_TTL) -> None:
    cache.set(f"otp:{phone}", code, ttl)

def get_otp(phone: str) -> str | None:
    return cache.get(f"otp:{phone}")

def clear_otp(phone: str) -> None:
    cache.delete(f"otp:{phone}")
