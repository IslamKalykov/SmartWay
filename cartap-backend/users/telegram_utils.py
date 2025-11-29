# users/telegram_utils.py
import logging
import requests
from django.conf import settings
import os

logger = logging.getLogger(__name__)


TELEGRAM_BOT_TOKEN = getattr(
    settings, "TELEGRAM_BOT_TOKEN", os.getenv("TELEGRAM_BOT_TOKEN")
)
API_BASE_URL = getattr(
    settings, "API_BASE_URL", os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
)

TELEGRAM_SEND_MESSAGE_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"


def send_otp_message(chat_id: int, code: str) -> None:
    try:
        resp = requests.post(
            TELEGRAM_SEND_MESSAGE_URL,
            json={
                "chat_id": chat_id,
                "text": f"Ваш код для входа в CarTap: {code}",
            },
            timeout=5,
        )
        logger.info("Telegram response: %s %s", resp.status_code, resp.text)
    except Exception:
        logger.exception("Error sending OTP to Telegram")
