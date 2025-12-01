from django.core.management.base import BaseCommand
from django.conf import settings

from telegram import Update, KeyboardButton, ReplyKeyboardMarkup, ReplyKeyboardRemove
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
)

from users.models import User
from asgiref.sync import sync_to_async


BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /start - приветствие и запрос номера телефона"""
    chat_id = update.effective_chat.id
    user_name = update.effective_user.first_name or "друг"

    keyboard = [
        [KeyboardButton("📱 Отправить номер телефона", request_contact=True)],
    ]
    reply_markup = ReplyKeyboardMarkup(
        keyboard,
        resize_keyboard=True,
        one_time_keyboard=True,
    )

    await context.bot.send_message(
        chat_id=chat_id,
        text=(
            f"👋 Привет, {user_name}!\n\n"
            "Я бот сервиса SmartWay — платформы для межгородских поездок.\n\n"
            "📲 Отправь свой номер телефона, чтобы:\n"
            "• Создать аккаунт в SmartWay\n"
            "• Получать коды подтверждения для входа\n"
            "• Получать уведомления о поездках\n\n"
            "👇 Нажми кнопку ниже:"
        ),
        reply_markup=reply_markup,
    )


@sync_to_async
def get_or_create_user_with_chat_id(normalized_phone: str, chat_id: int, telegram_name: str = None):
    """
    Находит или создаёт пользователя и привязывает telegram_chat_id.
    Возвращает (user, created, was_linked).
    """
    user, created = User.objects.get_or_create(
        phone_number=normalized_phone,
        defaults={
            "full_name": telegram_name or "",
        }
    )
    
    # Проверяем, был ли уже привязан chat_id
    was_already_linked = user.telegram_chat_id == chat_id
    
    # Обновляем chat_id в любом случае
    if user.telegram_chat_id != chat_id:
        user.telegram_chat_id = chat_id
        user.save(update_fields=["telegram_chat_id"])
    
    return user, created, was_already_linked


async def contact_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик получения контакта пользователя"""
    chat_id = update.effective_chat.id
    contact = update.message.contact

    if not contact:
        await context.bot.send_message(
            chat_id=chat_id,
            text="❌ Не удалось получить номер телефона. Попробуйте ещё раз.",
        )
        return

    phone = contact.phone_number
    normalized_phone = phone.replace("+", "").replace(" ", "")
    
    # Получаем имя из Telegram
    telegram_user = update.effective_user
    telegram_name = " ".join(filter(None, [
        telegram_user.first_name,
        telegram_user.last_name
    ])) if telegram_user else None

    # Создаём или находим пользователя
    user, created, was_already_linked = await get_or_create_user_with_chat_id(
        normalized_phone, 
        chat_id,
        telegram_name
    )

    # Убираем клавиатуру
    remove_keyboard = ReplyKeyboardRemove()

    if created:
        # Новый пользователь создан
        await context.bot.send_message(
            chat_id=chat_id,
            text=(
                f"✅ Отлично! Аккаунт создан.\n\n"
                f"📱 Ваш номер: +{normalized_phone}\n\n"
                f"Теперь вы можете:\n"
                f"1️⃣ Перейти на сайт SmartWay\n"
                f"2️⃣ Нажать «Войти» или «Регистрация»\n"
                f"3️⃣ Ввести свой номер телефона\n"
                f"4️⃣ Получить код подтверждения прямо сюда, в Telegram!\n\n"
                f"🔗 Сайт: smartway.kg"
            ),
            reply_markup=remove_keyboard,
        )
    elif was_already_linked:
        # Пользователь уже был привязан к этому же chat_id
        await context.bot.send_message(
            chat_id=chat_id,
            text=(
                f"👍 Ваш номер +{normalized_phone} уже привязан к этому Telegram.\n\n"
                f"Вы можете входить на сайт SmartWay и получать коды подтверждения сюда.\n\n"
                f"🔗 Сайт: smartway.kg"
            ),
            reply_markup=remove_keyboard,
        )
    else:
        # Пользователь существовал, но привязали к новому chat_id
        await context.bot.send_message(
            chat_id=chat_id,
            text=(
                f"✅ Номер +{normalized_phone} успешно привязан к этому Telegram!\n\n"
                f"Теперь коды подтверждения будут приходить сюда.\n\n"
                f"🔗 Сайт: smartway.kg"
            ),
            reply_markup=remove_keyboard,
        )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /help"""
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=(
            "🚗 *SmartWay Bot*\n\n"
            "Этот бот помогает вам использовать сервис SmartWay.\n\n"
            "*Команды:*\n"
            "/start — Начать и привязать номер телефона\n"
            "/help — Показать эту справку\n"
            "/status — Проверить статус привязки\n\n"
            "*Как это работает:*\n"
            "1. Отправьте свой номер телефона боту\n"
            "2. Зайдите на сайт smartway.kg\n"
            "3. При входе/регистрации код придёт сюда\n\n"
            "По вопросам: @smartway_support"
        ),
        parse_mode="Markdown",
    )


@sync_to_async
def get_user_by_chat_id(chat_id: int):
    """Получить пользователя по chat_id"""
    return User.objects.filter(telegram_chat_id=chat_id).first()


async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /status - проверка статуса привязки"""
    chat_id = update.effective_chat.id
    
    user = await get_user_by_chat_id(chat_id)
    
    if user:
        verified_status = ""
        if getattr(user, 'is_verified_driver', False):
            verified_status = "✅ Верифицированный водитель"
        elif getattr(user, 'is_verified_passenger', False):
            verified_status = "✅ Верифицированный пассажир"
        
        role = "🚗 Водитель" if getattr(user, 'is_driver', False) else "👤 Пассажир"
        
        await context.bot.send_message(
            chat_id=chat_id,
            text=(
                f"📊 *Статус вашего аккаунта*\n\n"
                f"📱 Телефон: +{user.phone_number}\n"
                f"👤 Имя: {user.full_name or 'Не указано'}\n"
                f"🎭 Роль: {role}\n"
                f"{verified_status}\n\n"
                f"✅ Telegram привязан — коды будут приходить сюда."
            ),
            parse_mode="Markdown",
        )
    else:
        keyboard = [
            [KeyboardButton("📱 Отправить номер телефона", request_contact=True)],
        ]
        reply_markup = ReplyKeyboardMarkup(
            keyboard,
            resize_keyboard=True,
            one_time_keyboard=True,
        )
        
        await context.bot.send_message(
            chat_id=chat_id,
            text=(
                "❌ Ваш Telegram пока не привязан к аккаунту SmartWay.\n\n"
                "Отправьте свой номер телефона, чтобы создать аккаунт:"
            ),
            reply_markup=reply_markup,
        )


async def unknown_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик неизвестных сообщений"""
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=(
            "🤔 Не понимаю эту команду.\n\n"
            "Используйте /start чтобы привязать номер телефона,\n"
            "или /help для справки."
        ),
    )


class Command(BaseCommand):
    help = "Run Telegram bot for SmartWay"

    def handle(self, *args, **options):
        if not BOT_TOKEN:
            self.stderr.write(
                self.style.ERROR("TELEGRAM_BOT_TOKEN не задан в настройках!")
            )
            return
        
        application = ApplicationBuilder().token(BOT_TOKEN).build()

        # Команды
        application.add_handler(CommandHandler("start", start))
        application.add_handler(CommandHandler("help", help_command))
        application.add_handler(CommandHandler("status", status_command))
        
        # Обработчик контакта (номера телефона)
        application.add_handler(MessageHandler(filters.CONTACT, contact_handler))
        
        # Обработчик неизвестных сообщений
        application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, unknown_message))

        self.stdout.write(self.style.SUCCESS("🤖 SmartWay Telegram bot is running..."))
        self.stdout.write("Press Ctrl+C to stop.")
        
        application.run_polling()