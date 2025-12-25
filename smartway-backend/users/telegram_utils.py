# users/telegram_utils.py
import logging
try:
    import requests
except ImportError:  # pragma: no cover - безопасно логируем отсутствие зависимости
    requests = None
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


def send_telegram_message(chat_id: int, text: str) -> None:
    """
    Универсальная отправка сообщения в Telegram.
    Безопасно логируем ошибки, чтобы не ломать основной поток.
    """
    if not TELEGRAM_BOT_TOKEN or requests is None:
        logger.warning("TELEGRAM_BOT_TOKEN is not configured, skipping message")
        return

    if not chat_id:
        return

    try:
        resp = requests.post(
            TELEGRAM_SEND_MESSAGE_URL,
            json={
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML",
            },
            timeout=5,
        )
        if resp.status_code != 200:
            logger.warning("Telegram send failed: %s %s", resp.status_code, resp.text)
    except Exception:
        logger.exception("Error sending Telegram message")


def send_otp_message(chat_id: int, code: str) -> None:
    if requests is None:
        logger.warning("requests is not available, cannot send OTP via Telegram")
        return
    try:
        resp = requests.post(
            TELEGRAM_SEND_MESSAGE_URL,
            json={
                "chat_id": chat_id,
                "text": f"Ваш код для входа в SmartWay: {code}",
            },
            timeout=5,
        )
        logger.info("Telegram response: %s %s", resp.status_code, resp.text)
    except Exception:
        logger.exception("Error sending OTP to Telegram")
