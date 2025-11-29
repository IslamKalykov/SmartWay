from django.core.management.base import BaseCommand
from django.conf import settings

from telegram import Update, KeyboardButton, ReplyKeyboardMarkup
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
)

from users.models import User
from asgiref.sync import sync_to_async  # 🔥 вот это важно


BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id

    keyboard = [
        [KeyboardButton("Отправить номер телефона", request_contact=True)],
    ]
    reply_markup = ReplyKeyboardMarkup(
        keyboard,
        resize_keyboard=True,
        one_time_keyboard=True,
    )

    await context.bot.send_message(
        chat_id=chat_id,
        text=(
            "Привет! Отправь, пожалуйста, свой номер телефона, "
            "чтобы связать аккаунт CarTap с этим Telegram."
        ),
        reply_markup=reply_markup,
    )


# 🔹 синхронная функция для ORM
@sync_to_async
def link_chat_id_to_user(normalized_phone: str, chat_id: int) -> bool:
    """
    Возвращает True, если пользователь найден и обновлён, иначе False.
    """
    try:
        user = User.objects.get(phone_number=normalized_phone)
        user.telegram_chat_id = chat_id
        user.save(update_fields=["telegram_chat_id"])
        return True
    except User.DoesNotExist:
        return False


async def contact_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    contact = update.message.contact

    if not contact:
        return

    phone = contact.phone_number  # может быть +996...
    normalized_phone = phone.replace("+", "").replace(" ", "")

    # 🔥 ORM вызываем через sync_to_async-функцию
    linked = await link_chat_id_to_user(normalized_phone, chat_id)

    if linked:
        await context.bot.send_message(
            chat_id=chat_id,
            text=(
                f"Номер {normalized_phone} успешно связан с аккаунтом CarTap. "
                "Теперь вы сможете входить по коду."
            ),
        )
    else:
        await context.bot.send_message(
            chat_id=chat_id,
            text=(
                f"Пользователь с номером {normalized_phone} не найден. "
                "Сначала зарегистрируйтесь в CarTap."
            ),
        )


class Command(BaseCommand):
    help = "Run Telegram bot"

    def handle(self, *args, **options):
        application = ApplicationBuilder().token(BOT_TOKEN).build()

        application.add_handler(CommandHandler("start", start))
        application.add_handler(MessageHandler(filters.CONTACT, contact_handler))

        self.stdout.write(self.style.SUCCESS("Telegram bot is running..."))
        application.run_polling()
