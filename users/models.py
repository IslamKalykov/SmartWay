from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
import os
from uuid import uuid4

def user_directory_path(instance, filename):
    # Пример: users/user_12/photo_1a2b3c.jpg
    ext = filename.split('.')[-1]
    filename = f"{uuid4().hex}.{ext}"
    return f'users/user_{instance.id}/{filename}'

def user_passport_path(instance, filename):
    ext = filename.split('.')[-1]
    filename = f"passport_{uuid4().hex}.{ext}"
    return f'users/user_{instance.id}/{filename}'

def user_license_path(instance, filename):
    ext = filename.split('.')[-1]
    filename = f"license_{uuid4().hex}.{ext}"
    return f'users/user_{instance.id}/{filename}'


class UserManager(BaseUserManager):
    def create_user(self, phone_number, full_name=None, password=None):
        if not phone_number:
            raise ValueError("Users must have a phone number")
        user = self.model(phone_number=phone_number, full_name=full_name)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()  # для юзеров без пароля (OTP)
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
    phone_number = models.CharField(max_length=20, unique=True)
    full_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    is_driver = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    photo = models.ImageField(upload_to=user_directory_path, blank=True, null=True)
    passport_photo = models.ImageField(upload_to=user_passport_path, blank=True, null=True)
    license_photo = models.ImageField(upload_to=user_license_path, blank=True, null=True)

    is_approved = models.BooleanField(default=False)  # модерация
    
    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = ['full_name']


    objects = UserManager()

    def __str__(self):
        return f"{self.full_name} ({self.phone_number})"

    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser
