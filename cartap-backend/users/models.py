from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from uuid import uuid4
from django.core.validators import RegexValidator
import random

phone_validator = RegexValidator(
    regex=r"^\+?\d{10,15}$",
    message="Телефон должен быть в международном формате, только цифры и опциональный '+'"
)


# --- Совместимость со старыми миграциями ---
def user_passport_path(instance, filename):
    # Исторически использовалось для фото паспорта
    return user_directory_path(instance, filename)

def user_license_path(instance, filename):
    # Исторически использовалось для водительского
    return user_directory_path(instance, filename)
# --- конец блока совместимости ---


def user_directory_path(instance, filename):
    ext = filename.split(".")[-1]
    filename = f"{uuid4().hex}.{ext}"
    return f"users/user_{instance.id}/{filename}"


class UserManager(BaseUserManager):
    def _generate_public_id(self):
        while True:
            code = str(random.randint(10_000_000, 99_999_999))  # например, 8 цифр
            if not self.model.objects.filter(public_id=code).exists():
                return code

    def create_user(self, phone_number, full_name=None, password=None):
        if not phone_number:
            raise ValueError("Users must have a phone number")
        user = self.model(phone_number=phone_number, full_name=full_name or "")
        user.public_id = self._generate_public_id()   # 🔹
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, full_name="Admin", password=None):
        if not password:
            raise ValueError("Superuser must have a password.")
        user = self.create_user(phone_number, full_name, password)
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.save(using=self._db)
        return user

class User(AbstractBaseUser, PermissionsMixin):
    phone_number = models.CharField(max_length=20, unique=True, validators=[phone_validator])
    full_name = models.CharField(max_length=100, blank=True, default="")
    photo = models.ImageField(upload_to=user_directory_path, blank=True, null=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=False)
    is_driver = models.BooleanField(default=False)
    telegram_chat_id = models.BigIntegerField(null=True, blank=True)

    # 🔹 новый публичный ID для пользователя (например, 8 цифр)
    public_id = models.CharField(max_length=16, unique=True, blank=True, null=True)

    USERNAME_FIELD = "phone_number"
    REQUIRED_FIELDS = ["full_name"]

    objects = UserManager()


    def __str__(self):
        return f"{self.full_name} ({self.phone_number})".strip()

    def has_perm(self, perm, obj=None):
        return bool(self.is_superuser)

    def has_module_perms(self, app_label):
        return bool(self.is_superuser)
