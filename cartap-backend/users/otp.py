# users/otp.py
import random
from typing import Optional

_otp_storage: dict[str, str] = {}


def _normalize_phone(phone: str) -> str:
    return phone.replace("+", "").replace(" ", "")


def generate_otp(length: int = 4) -> str:
    return ''.join(str(random.randint(0, 9)) for _ in range(length))


def save_otp(phone: str, code: str) -> None:
    phone_key = _normalize_phone(phone)
    _otp_storage[phone_key] = code
    print(f"[OTP] saved: phone={phone_key}, code={code}")


# 👇 ДОБАВЬТЕ ЭТУ СТРОКУ
store_otp = save_otp


def get_otp(phone: str) -> Optional[str]:
    phone_key = _normalize_phone(phone)
    return _otp_storage.get(phone_key)


def delete_otp(phone: str) -> None:
    phone_key = _normalize_phone(phone)
    _otp_storage.pop(phone_key, None)