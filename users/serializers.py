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

