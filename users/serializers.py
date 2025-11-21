from rest_framework import serializers
from .models import User


class DriverDocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['photo', 'passport_photo', 'license_photo']
        
class UserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'full_name', 'phone_number')

class UserShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = User  # или get_user_model() если ты так используешь
        fields = ['id', 'phone_number']  # что хочешь выводить

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "phone_number", "full_name", "is_driver", "public_id")  # 🔹
