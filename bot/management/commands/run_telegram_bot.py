# bot/management/commands/run_telegram_bot.py
import os
import logging
from datetime import datetime

import re
import httpx
import asyncio

from django.core.management.base import BaseCommand
from django.conf import settings

from telegram import (
    Update,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    ReplyKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardRemove,
)
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    ConversationHandler,
    CallbackQueryHandler,
    ContextTypes,
    filters,
)
from telegram.error import BadRequest

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

SHOW_DEV_OTP = getattr(settings, "SHOW_DEV_OTP", getattr(settings, "DEBUG", False))

TELEGRAM_BOT_TOKEN = getattr(
    settings, "TELEGRAM_BOT_TOKEN", os.getenv("TELEGRAM_BOT_TOKEN")
)
API_BASE_URL = getattr(
    settings, "API_BASE_URL", os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
)
if not API_BASE_URL.rstrip("/").endswith("/api"):
    API_BASE_URL = API_BASE_URL.rstrip("/") + "/api"

STATE_WAIT_PHONE, STATE_WAIT_OTP = range(2)

PHONE_RE = re.compile(r"^\+?\d{9,15}$")  # E.164 лайтово


def _api(path: str) -> str:
    return f"{API_BASE_URL.rstrip('/')}/{path.lstrip('/')}"


def _human_timedelta(delta_sec: int) -> str:
    if delta_sec < 60:
        return f"{delta_sec} сек"
    m, s = divmod(delta_sec, 60)
    return f"{m} мин {s} сек"


async def api_post(path: str, json: dict, token: str | None = None) -> httpx.Response:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(_api(path), json=json, headers=headers)
        return r


async def api_get(path: str, token: str) -> httpx.Response:
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(_api(path), headers=headers)
        return r


async def get_current_plan_info(context: ContextTypes.DEFAULT_TYPE):
    access = context.user_data.get("access")
    if not access:
        return None
    r = await api_get("billing/current/", token=access)
    if r.status_code != 200:
        return None
    return r.json()  # {"plan": {...} or None, "expires_at": "..."}


# ---------- Reply-клавиатуры (внизу экрана) ----------


def guest_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        [[KeyboardButton("Я водитель"), KeyboardButton("Я пассажир")]],
        resize_keyboard=True,
    )


def driver_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        [
            [KeyboardButton("🚗 Доступные заказы"), KeyboardButton("📋 Мои заказы")],
            [KeyboardButton("📜 История заказов"), KeyboardButton("🧾 Подписка")],
            [KeyboardButton("🔄 Обновить профиль"), KeyboardButton("❓ Помощь")],
        ],
        resize_keyboard=True,
    )


def passenger_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        [
            [KeyboardButton("🔎 Найти поездку"), KeyboardButton("🧾 Мои заявки")],
            [KeyboardButton("🔄 Обновить профиль"), KeyboardButton("❓ Помощь")],
        ],
        resize_keyboard=True,
    )


# ---------- Inline-меню (под сообщением) ----------


def main_menu_kb(is_driver: bool | None = None) -> InlineKeyboardMarkup:
    """
    Inline-кнопки:
    - для неавторизованных: вход по номеру
    - для водителя/пассажира сейчас почти не используем как главное меню,
      но используем как вспомогательное (login_by_phone и пр.).
    """
    if is_driver is True:
        
        buttons = []
        
        # buttons = [
        #     [
        #         InlineKeyboardButton(
        #             "🚗 Доступные заказы", callback_data="drv_available"
        #         ),
        #         InlineKeyboardButton("📋 Мои заказы", callback_data="drv_my_active"),
        #     ],
        #     [
        #         InlineKeyboardButton(
        #             "📜 История заказов", callback_data="drv_history"
        #         ),
        #         InlineKeyboardButton("🧾 Подписка", callback_data="drv_sub"),
        #     ],
        #     [
        #         InlineKeyboardButton(
        #             "🔄 Обновить профиль", callback_data="refresh_profile"
        #         ),
        #         InlineKeyboardButton("❓ Помощь", callback_data="help"),
        #     ],
        # ]
    elif is_driver is False:
        buttons = [
            [
                InlineKeyboardButton("🔎 Найти поездку", callback_data="psg_search"),
                InlineKeyboardButton("🧾 Мои заявки", callback_data="psg_my"),
            ],
            [
                InlineKeyboardButton(
                    "🔄 Обновить профиль", callback_data="refresh_profile"
                ),
                InlineKeyboardButton("❓ Помощь", callback_data="help"),
            ],
        ]
    else:
        buttons = [
            [
                InlineKeyboardButton(
                    "📲 Войти по номеру", callback_data="login_by_phone"
                ),
                InlineKeyboardButton("❓ Помощь", callback_data="help"),
            ],
        ]
    return InlineKeyboardMarkup(buttons)


# ---------- Текст главного меню водителя ----------


async def driver_main_menu_text(context: ContextTypes.DEFAULT_TYPE) -> str:
    user_info = context.user_data.get("user") or {}
    public_id = user_info.get("public_id") or user_info.get("id")

    plan_info = await get_current_plan_info(context)
    lines = []
    lines.append("Главное меню водителя")
    if public_id:
        lines.append(f"ID: {public_id}")
    if plan_info and plan_info.get("plan"):
        p = plan_info["plan"]
        expires = plan_info.get("expires_at")
        line = f"Тариф: {p.get('name')} ({p.get('price')} сом)"
        if expires:
            line += f", до {expires.replace('T', ' ')[:16]}"
        lines.append(line)
    else:
        lines.append("Тариф: нет активной подписки")
    return "\n".join(lines)


# ---------- /start, /help, /ping, /logout ----------


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    uid = update.effective_user.id if update.effective_user else None
    logger.info("START by user_id=%s", uid)

    # если уже есть токен, подтянуть профиль
    if "profile" not in context.user_data and context.user_data.get("access"):
        await refresh_profile(context)

    profile = context.user_data.get("profile")
    is_driver = profile.get("is_driver") if isinstance(profile, dict) else None

    if is_driver is True:
        context.user_data["role"] = "driver"
        kb = driver_keyboard()
        text = await driver_main_menu_text(context)
    elif is_driver is False:
        context.user_data["role"] = "passenger"
        kb = passenger_keyboard()
        text = "Главное меню пассажира"
    else:
        context.user_data["role"] = None
        kb = guest_keyboard()
        text = "Выбери роль:"

    await update.effective_message.reply_text(text, reply_markup=kb)


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.effective_message.reply_text(
        "Команды:\n"
        "/start — главное меню\n"
        "/help — помощь\n"
        "/ping — проверить доступность\n"
        "/logout — выйти\n"
        "Через меню можно войти по номеру, искать/брать поездки и чекать подписку."
    )


async def cmd_ping(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(_api("health/"))
        if r.status_code < 500:
            await update.effective_message.reply_text("pong ✅")
        else:
            await update.effective_message.reply_text(
                f"API отвечает с ошибкой {r.status_code}"
            )
    except Exception as e:
        logger.exception("Ping error: %s", e)
        await update.effective_message.reply_text("API недоступно ❌")


async def cmd_logout(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data.clear()
    context.user_data["role"] = None
    await update.effective_message.reply_text(
        "Готово, вышел.\nВыбери роль:",
        reply_markup=guest_keyboard(),
    )


# ---------- Обёртка для Reply-кнопок -> on_menu_click ----------

async def on_menu_click_fake(
    data: str, update: Update, context: ContextTypes.DEFAULT_TYPE
):
    """
    Обёртка, чтобы вызывать on_menu_click по текстовым (reply) кнопкам.
    Вместо редактирования старого сообщения — отправляем новое.
    """

    orig_msg = update.message  # реальное Message от пользователя

    class FakeMessage:
        def __init__(self, msg):
            self._msg = msg

        async def edit_text(self, *args, **kwargs):
            # В on_menu_click везде используется edit_text -> здесь просто шлём новое сообщение
            return await self._msg.reply_text(*args, **kwargs)

        async def reply_text(self, *args, **kwargs):
            # На всякий случай, если где-то вызовут reply_text
            return await self._msg.reply_text(*args, **kwargs)

    class FakeQuery:
        def __init__(self, message, data: str):
            self.message = message  # наш FakeMessage
            self.data = data

        async def answer(self):
            # заглушка, чтобы on_menu_click не падал на query.answer()
            return

    fake_message = FakeMessage(orig_msg)
    fake_query = FakeQuery(fake_message, data)
    fake_update = Update(update.update_id, callback_query=fake_query)

    return await on_menu_click(fake_update, context)




# ---------- Обработчик callback-кнопок (inline) ----------


async def on_menu_click(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data

    if data == "back_to_menu":
        try:
            text = await driver_main_menu_text(context)
            await query.message.edit_text(text, reply_markup=main_menu_kb(True))
        except BadRequest as e:
            if "message is not modified" not in str(e).lower():
                raise
        return ConversationHandler.END

    if data.startswith("buy_plan:"):
        access = context.user_data.get("access")
        if not access:
            try:
                await query.message.edit_text(
                    "Сначала войди по номеру 📲",
                    reply_markup=main_menu_kb(),
                )
            except BadRequest as e:
                if "message is not modified" not in str(e).lower():
                    raise
            return ConversationHandler.END

        plan_id = int(data.split(":", 1)[1])
        plans = context.user_data.get("billing_plans") or []
        plan = next((p for p in plans if p.get("id") == plan_id), None)

        user_info = context.user_data.get("user") or {}
        public_id = user_info.get("public_id") or user_info.get("id")

        plan_name = plan.get("name") if plan else f"Тариф #{plan_id}"
        plan_price = plan.get("price") if plan else "?"

        text = (
            f"Заявка на подписку: {plan_name} ({plan_price} сом)\n\n"
            f"Твой ID: {public_id}\n\n"
            "👉 Чтобы активировать подписку:\n"
            "1️⃣ Закинь сумму на mBank: +996550131888 — Нур-Ислам Таалайбек уулу\n"
            "2️⃣ Отправь скриншот платежа с этим ID администратору по этому номеру +996550131888.\n\n"
            "После проверки подписка будет активирована. Примерно 5–10 мин."
        )

        await query.message.edit_text(text, reply_markup=main_menu_kb(True))
        return ConversationHandler.END

    if data == "drv_my_active":
        access = context.user_data.get("access")
        if not access:
            try:
                await query.message.edit_text(
                    "Сначала войди по номеру 📲", reply_markup=main_menu_kb()
                )
            except BadRequest as e:
                if "message is not modified" not in str(e).lower():
                    raise
            return ConversationHandler.END

        r = await api_get("trips/my-active/", token=access)
        if r.status_code != 200:
            await query.message.edit_text(
                "Не удалось получить список твоих заказов.",
                reply_markup=main_menu_kb(True),
            )
            return ConversationHandler.END

        trips = r.json()
        if isinstance(trips, dict):
            trips = trips.get("results", [])

        if not trips:
            text = "У тебя сейчас нет активных заказов."
        else:
            lines = ["📋 Твои активные заказы:"]
            for t in trips:
                dep = t.get("departure_time", "").replace("T", " ")[:16]
                lines.append(
                    f"#{t.get('id')} • {t.get('from_location')} → {t.get('to_location')} • {dep}"
                )
            text = "\n".join(lines)

        await query.message.edit_text(text, reply_markup=main_menu_kb(True))
        return ConversationHandler.END

    if data == "drv_history":
        access = context.user_data.get("access")
        if not access:
            try:
                await query.message.edit_text(
                    "Сначала войди по номеру 📲", reply_markup=main_menu_kb()
                )
            except BadRequest as e:
                if "message is not modified" not in str(e).lower():
                    raise
            return ConversationHandler.END

        r = await api_get("trips/my-history/", token=access)
        if r.status_code != 200:
            await query.message.edit_text(
                "Не удалось получить историю заказов.",
                reply_markup=main_menu_kb(True),
            )
            return ConversationHandler.END

        trips = r.json()
        if isinstance(trips, dict):
            trips = trips.get("results", [])

        if not trips:
            text = "История заказов пока пуста."
        else:
            lines = ["📜 История заказов:"]
            for t in trips[:20]:
                dep = t.get("departure_time", "").replace("T", " ")[:16]
                lines.append(
                    f"#{t.get('id')} • {t.get('from_location')} → {t.get('to_location')} • {dep} • {t.get('status')}"
                )
            text = "\n".join(lines)

        await query.message.edit_text(text, reply_markup=main_menu_kb(True))
        return ConversationHandler.END

    if data == "drv_sub":
        access = context.user_data.get("access")
        if not access:
            try:
                await query.message.edit_text(
                    "Сначала войди по номеру 📲", reply_markup=main_menu_kb()
                )
            except BadRequest as e:
                if "message is not modified" not in str(e).lower():
                    raise
            return ConversationHandler.END

        current = await get_current_plan_info(context)
        current_plan_id = None
        if current and current.get("plan"):
            current_plan_id = current["plan"]["id"]
            current_expires = current.get("expires_at")
        else:
            current_expires = None

        try:
            r = await api_get("billing/plans/", token=access)
        except Exception as e:
            logger.exception("billing/plans exception: %s", e)
            try:
                await query.message.edit_text(
                    "Не удалось загрузить тарифы. Попробуй позже.",
                    reply_markup=main_menu_kb(True),
                )
            except BadRequest as e2:
                if "message is not modified" not in str(e2).lower():
                    raise
            return ConversationHandler.END

        if r.status_code != 200:
            logger.warning("billing/plans failed %s %s", r.status_code, r.text)
            try:
                await query.message.edit_text(
                    "Не удалось загрузить тарифы. Попробуй позже.",
                    reply_markup=main_menu_kb(True),
                )
            except BadRequest as e:
                if "message is not modified" not in str(e).lower():
                    raise
            return ConversationHandler.END

        data_json = r.json()
        plans = data_json.get("results", data_json)
        context.user_data["billing_plans"] = plans

        user_info = context.user_data.get("user") or {}
        public_id = user_info.get("public_id") or user_info.get("id")

        if not plans:
            text = f"Твой ID: {public_id}\n\nПока нет доступных тарифов."
            kb = main_menu_kb(True)
        else:
            lines = ["🧾 Подписка"]
            if public_id:
                lines.append(f"ID: {public_id}")
            if current_plan_id:
                lines.append("Текущий тариф выделен ⭐")
                if current_expires:
                    lines.append(
                        f"Активен до: {current_expires.replace('T',' ')[:16]}"
                    )

            buttons = []
            for p in plans:
                pid = p.get("id")
                is_current = pid == current_plan_id
                prefix = "⭐ " if is_current else ""
                title = f"{prefix}#{pid} • {p.get('name')}"
                line = (
                    f"{title}\n"
                    f"  Цена: {p.get('price')} • Дней: {p.get('duration_days')}\n"
                    f"  Приоритет: {p.get('priority_level')} • Задержка: {p.get('view_delay_seconds')} сек."
                )
                lines.append(line)
                buttons.append(
                    [
                        InlineKeyboardButton(
                            text=f"Купить {p.get('name')}",
                            callback_data=f"buy_plan:{pid}",
                        )
                    ]
                )

            buttons.append(
                [InlineKeyboardButton("🏠 В меню", callback_data="back_to_menu")]
            )

            text = "\n\n".join(lines)
            kb = InlineKeyboardMarkup(buttons)

        await query.message.edit_text(text, reply_markup=kb)
        return ConversationHandler.END

    if data.startswith("take_trip:"):
        access = context.user_data.get("access")
        if not access:
            try:
                await query.message.edit_text(
                    "Сначала войди по номеру 📲", reply_markup=main_menu_kb()
                )
            except BadRequest as e:
                if "message is not modified" not in str(e).lower():
                    raise
            return ConversationHandler.END

        try:
            trip_id = int(data.split(":", 1)[1])
        except (ValueError, IndexError):
            try:
                await query.message.edit_text(
                    "Некорректный заказ.", reply_markup=main_menu_kb(True)
                )
            except BadRequest as e:
                if "message is not modified" not in str(e).lower():
                    raise
            return ConversationHandler.END

        try:
            r = await api_post(f"trips/{trip_id}/take/", json={}, token=access)
        except Exception as e:
            logger.exception("trips/take exception: %s", e)
            try:
                await query.message.edit_text(
                    "Не удалось взять заказ. Попробуй позже.",
                    reply_markup=main_menu_kb(True),
                )
            except BadRequest as e2:
                if "message is not modified" not in str(e2).lower():
                    raise
            return ConversationHandler.END

        if r.status_code != 200:
            logger.warning("take_trip failed %s %s", r.status_code, r.text)
            msg = "Не удалось взять этот заказ."
            try:
                data_json = r.json()
                detail = data_json.get("detail")
                if detail:
                    msg += f"\n{detail}"
            except Exception:
                pass

            try:
                await query.message.edit_text(
                    msg, reply_markup=main_menu_kb(True)
                )
            except BadRequest as e:
                if "message is not modified" not in str(e).lower():
                    raise
            return ConversationHandler.END

        trip = r.json()
        dep = trip.get("departure_time", "").replace("T", " ")[:16]
        text = (
            "Заказ закреплён за тобой ✅\n\n"
            f"#{trip.get('id')} • {trip.get('from_location')} → {trip.get('to_location')}\n"
            f"Время: {dep}\n"
            f"Мест: {trip.get('passengers_count')} • Цена: {trip.get('price')}"
        )

        try:
            await query.message.edit_text(text, reply_markup=main_menu_kb(True))
        except BadRequest as e:
            if "message is not modified" not in str(e).lower():
                raise
        return ConversationHandler.END

    if data == "login_by_phone":
        await query.message.reply_text(
            "Отправь номер в формате E.164, например: +996700000001",
            reply_markup=ReplyKeyboardRemove(),
        )
        return STATE_WAIT_PHONE

    if data == "help":
        return await cmd_help(update, context)

    if data == "refresh_profile":
        access = context.user_data.get("access")
        if not access:
            await query.message.edit_text(
                "Ты ещё не вошёл. Жми «Войти по номеру».",
                reply_markup=main_menu_kb(),
            )
            return ConversationHandler.END
        ok = await refresh_profile(context)
        if ok:
            profile = context.user_data.get("profile", {})
            await query.message.edit_text(
                f"Профиль обновлён.\n"
                f"Роль: {'Водитель' if profile.get('is_driver') else 'Пассажир'}",
                reply_markup=main_menu_kb(profile.get("is_driver")),
            )
        else:
            await query.message.edit_text(
                "Не удалось обновить профиль.", reply_markup=main_menu_kb()
            )
        return ConversationHandler.END

    if data == "drv_available":
        access = context.user_data.get("access")
        if not access:
            try:
                await query.message.edit_text(
                    "Сначала войди по номеру 📲", reply_markup=main_menu_kb()
                )
            except BadRequest as e:
                if "message is not modified" not in str(e).lower():
                    raise
            return ConversationHandler.END

        try:
            r = await api_get("trips/available/", token=access)
        except Exception as e:
            logger.exception("trips/available exception: %s", e)
            try:
                await query.message.edit_text(
                    "Сервер недоступен. Попробуй позже.",
                    reply_markup=main_menu_kb(True),
                )
            except BadRequest as e2:
                if "message is not modified" not in str(e2).lower():
                    raise
            return ConversationHandler.END

        if r.status_code != 200:
            logger.warning("trips/available failed %s %s", r.status_code, r.text)
            try:
                await query.message.edit_text(
                    "Не удалось получить список заказов.",
                    reply_markup=main_menu_kb(True),
                )
            except BadRequest as e:
                if "message is not modified" not in str(e).lower():
                    raise
            return ConversationHandler.END

        data_json = r.json()
        trips = data_json.get("results", []) if isinstance(data_json, dict) else data_json

        if not trips:
            text = "Сейчас нет доступных заказов.\n\nПопробуй обновить чуть позже."
            kb = main_menu_kb(True)
        else:
            lines = ["🚗 Доступные заказы:"]
            buttons = []
            for t in trips[:10]:
                dep = t.get("departure_time")
                dt_str = dep.replace("T", " ")[:16] if dep else ""
                trip_id = t.get("id")
                phone = t.get("passenger_phone") or "—"
                line = (
                    f"#{trip_id} • {t.get('from_location')} → {t.get('to_location')}\n"
                    f"  Время: {dt_str}\n"
                    f"  Мест: {t.get('passengers_count')} • Цена: {t.get('price')}\n"
                    f"  Телефон пассажира: {phone}"
                )
                lines.append(line)
                buttons.append(
                    [
                        InlineKeyboardButton(
                            text=f"Взять #{trip_id}",
                            callback_data=f"take_trip:{trip_id}",
                        )
                    ]
                )
            buttons.append(
                [InlineKeyboardButton("🏠 В меню", callback_data="back_to_menu")]
            )
            text = "\n\n".join(lines)
            kb = InlineKeyboardMarkup(buttons)

        try:
            await query.message.edit_text(text, reply_markup=kb)
        except BadRequest as e:
            if "message is not modified" not in str(e).lower():
                raise
        return ConversationHandler.END

    if data == "psg_search":
        await query.message.edit_text(
            "Скоро добавим поиск поездок 🔎", reply_markup=main_menu_kb(False)
        )
        return ConversationHandler.END

    if data == "psg_my":
        await query.message.edit_text(
            "Скоро покажу твои заявки 🧾", reply_markup=main_menu_kb(False)
        )
        return ConversationHandler.END

    await query.message.edit_text("Главное меню", reply_markup=main_menu_kb())
    return ConversationHandler.END


# ---------- FSM: телефон + OTP ----------


async def fsm_get_phone(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (update.message.text or "").strip()
    if not PHONE_RE.match(text):
        await update.message.reply_text(
            "Номер не похож на валидный. Пример: +996700000001\nОтправь ещё раз."
        )
        return STATE_WAIT_PHONE

    context.user_data["login_phone"] = text
    try:
        r = await api_post("send-otp/", json={"phone_number": text})
        if r.status_code == 200:
            msg = "Код отправлен. Введи OTP:"
            if SHOW_DEV_OTP:
                try:
                    async with httpx.AsyncClient(timeout=10) as client:
                        dbg = await client.get(
                            _api("otp-debug/"), params={"phone": text}
                        )
                    if dbg.status_code == 200:
                        otp = (dbg.json() or {}).get("otp")
                        if otp:
                            msg += f"\n\nOTP (dev): {otp}"
                except Exception:
                    pass
            await update.message.reply_text(msg)
            context.user_data["otp_sent_at"] = datetime.utcnow()
            return STATE_WAIT_OTP

        elif r.status_code == 429:
            retry_after = int(r.headers.get("Retry-After", "60"))
            await update.message.reply_text(
                f"Слишком часто. Попробуй через {_human_timedelta(retry_after)}."
            )
            return ConversationHandler.END

        else:
            logger.warning("send-otp failed %s %s", r.status_code, r.text)
            await update.message.reply_text("Не удалось отправить OTP. Попробуй позже.")
            return ConversationHandler.END
    except Exception as e:
        logger.exception("send-otp exception: %s", e)
        await update.message.reply_text("Сервер недоступен. Попробуй чуть позже.")
        return ConversationHandler.END


async def fsm_get_otp(update: Update, context: ContextTypes.DEFAULT_TYPE):
    code = (update.message.text or "").strip()
    phone = context.user_data.get("login_phone")
    if not phone:
        await update.message.reply_text(
            "Сессия входа потеряна. Нажми «Войти по номеру»."
        )
        return ConversationHandler.END

    try:
        r = await api_post(
            "verify-otp/", json={"phone_number": phone, "otp_code": code}
        )
        if r.status_code == 200:
            data = {}
            try:
                data = r.json()
            except Exception:
                data = {}

            access = (
                data.get("access")
                or data.get("token")
                or (data.get("auth") or {}).get("access")
                or (data.get("data") or {}).get("access")
            )
            if not access:
                await update.message.reply_text("Ответ без токена. Свяжись с поддержкой.")
                return ConversationHandler.END

            context.user_data["access"] = access

            ok = await refresh_profile(context)
            if not ok and isinstance(data.get("user"), dict):
                context.user_data["profile"] = data["user"]
                context.user_data["profile_cached_at"] = datetime.utcnow()
                ok = True

            profile = context.user_data.get("profile") or {}
            is_driver = profile.get("is_driver")

            if is_driver:
                context.user_data["role"] = "driver"
                text = await driver_main_menu_text(context)
                kb = driver_keyboard()
            else:
                context.user_data["role"] = "passenger"
                text = "Успешно! Ты в системе.\nГлавное меню пассажира."
                kb = passenger_keyboard()

            await update.message.reply_text(text, reply_markup=kb)
            return ConversationHandler.END

        elif r.status_code == 400:
            await update.message.reply_text("Неверный код. Попробуй ещё раз:")
            return STATE_WAIT_OTP

        else:
            logger.warning("verify-otp failed %s %s", r.status_code, r.text)
            await update.message.reply_text("Не удалось подтвердить OTP.")
            return ConversationHandler.END

    except Exception as e:
        logger.exception("verify-otp exception: %s", e)
        await update.message.reply_text("Сервер недоступен. Попробуй позже.")
        return ConversationHandler.END


async def refresh_profile(context: ContextTypes.DEFAULT_TYPE) -> bool:
    access = context.user_data.get("access")
    if not access:
        return False
    try:
        r = await api_get("me/", token=access)
        if r.status_code == 200:
            context.user_data["profile"] = r.json()
            context.user_data["profile_cached_at"] = datetime.utcnow()
            return True
        logger.warning("/me/ failed %s %s", r.status_code, r.text)
        return False
    except Exception as e:
        logger.exception("/me/ exception: %s", e)
        return False


# ---------- Обработчик текстовых сообщений (reply-клавиатура) ----------


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (update.message.text or "").strip()

    if text == "Я водитель":
        context.user_data["role"] = "driver"
        await update.message.reply_text(
            "Режим: водитель.\nЧтобы войти, нажми «Войти по номеру» ниже.",
            reply_markup=driver_keyboard(),
        )
        await update.message.reply_text(
            "Для начала войди по номеру:", reply_markup=main_menu_kb(None)
        )
        return

    if text == "Я пассажир":
        context.user_data["role"] = "passenger"
        await update.message.reply_text(
            "Режим: пассажир.\nЧтобы войти, нажми «Войти по номеру» ниже.",
            reply_markup=passenger_keyboard(),
        )
        await update.message.reply_text(
            "Для начала войди по номеру:", reply_markup=main_menu_kb(None)
        )
        return

    if text == "🚗 Доступные заказы":
        return await on_menu_click_fake("drv_available", update, context)

    if text == "📋 Мои заказы":
        return await on_menu_click_fake("drv_my_active", update, context)

    if text == "📜 История заказов":
        return await on_menu_click_fake("drv_history", update, context)

    if text == "🧾 Подписка":
        return await on_menu_click_fake("drv_sub", update, context)

    if text == "🔎 Найти поездку":
        return await on_menu_click_fake("psg_search", update, context)

    if text == "🧾 Мои заявки":
        return await on_menu_click_fake("psg_my", update, context)

    if text == "🔄 Обновить профиль":
        return await on_menu_click_fake("refresh_profile", update, context)

    if text == "❓ Помощь":
        return await cmd_help(update, context)

    await update.message.reply_text("Не понял команду. Нажми кнопки снизу 👇")


# ---------- Django management command ----------


class Command(BaseCommand):
    help = "Run Telegram bot polling"

    def handle(self, *args, **options):
        if not TELEGRAM_BOT_TOKEN:
            self.stderr.write("TELEGRAM_BOT_TOKEN not set")
            return

        logger.info(
            "Starting bot polling... API_BASE_URL=%s TELEGRAM_BOT_TOKEN=%s",
            API_BASE_URL,
            TELEGRAM_BOT_TOKEN[:10] + "..." if TELEGRAM_BOT_TOKEN else "None",
        )

        app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

        app.add_handler(CommandHandler("start", cmd_start))
        app.add_handler(CommandHandler("help", cmd_help))
        app.add_handler(CommandHandler("ping", cmd_ping))
        app.add_handler(CommandHandler("logout", cmd_logout))

        conv = ConversationHandler(
            entry_points=[CallbackQueryHandler(on_menu_click)],
            states={
                STATE_WAIT_PHONE: [
                    MessageHandler(filters.TEXT & ~filters.COMMAND, fsm_get_phone)
                ],
                STATE_WAIT_OTP: [
                    MessageHandler(filters.TEXT & ~filters.COMMAND, fsm_get_otp)
                ],
            },
            fallbacks=[CommandHandler("start", cmd_start)],
            per_user=True,
            per_chat=True,
        )
        app.add_handler(conv)

        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

        app.run_polling(allowed_updates=None, drop_pending_updates=False)
