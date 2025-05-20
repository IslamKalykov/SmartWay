from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, phone_number, full_name=None, password=None):
        if not phone_number:
            raise ValueError("Users must have a phone number")
        user = self.model(phone_number=phone_number, full_name=full_name)
        user.set_unusable_password()  # потому что логинимся по OTP
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, full_name="Admin", password=None):
        user = self.create_user(phone_number, full_name)
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user


class User(AbstractBaseUser):
    phone_number = models.CharField(max_length=20, unique=True)
    full_name = models.CharField(max_length=100)
    is_driver = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return f"{self.full_name} ({self.phone_number})"

    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser
