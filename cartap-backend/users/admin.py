from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django import forms
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from .models import User

class UserCreationForm(forms.ModelForm):
    password1 = forms.CharField(label='Пароль', widget=forms.PasswordInput)
    password2 = forms.CharField(label='Подтвердите пароль', widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ('phone_number', 'full_name')

    def clean_password2(self):
        p1 = self.cleaned_data.get('password1')
        p2 = self.cleaned_data.get('password2')
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError('Пароли не совпадают')
        return p2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data['password1'])
        if commit:
            user.save()
        return user

class UserChangeForm(forms.ModelForm):
    password = ReadOnlyPasswordHashField()

    class Meta:
        model = User
        fields = (
            'phone_number',
            'full_name',
            'password',
            'public_id',     # 🔹
            'is_active',
            'is_staff',
            'is_superuser',
            'is_approved',
            'is_driver',
        )

    def clean_password(self):
        return self.initial["password"]


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm

    list_display = (
        'phone_number',
        'full_name',
        'is_driver',
        'is_approved',
        'is_staff',
        'is_active',
        'telegram_chat_id'
    )
    list_display = ('phone_number', 'full_name', 'public_id', 'is_driver', 'is_approved', 'is_staff', 'is_active', 'telegram_chat_id')

    search_fields = ('phone_number', 'full_name')
    ordering = ('phone_number',)
    filter_horizontal = ('groups', 'user_permissions')

    fieldsets = (
    (None, {'fields': ('phone_number', 'full_name', 'password', 'public_id')}),
    ('Права и статус', {'fields': ('is_driver', 'is_approved', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions', 'telegram_chat_id',)}),
)
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('phone_number', 'full_name', 'password1', 'password2'),
        }),
    )
    
    def photo_preview(self, obj):
        if obj.photo:
            return f'<img src="{obj.photo.url}" width="150" />'
        return "No photo"
    photo_preview.allow_tags = True
    photo_preview.short_description = "Фото"

    def passport_preview(self, obj):
        if obj.passport_photo:
            return f'<img src="{obj.passport_photo.url}" width="150" />'
        return "No passport"
    passport_preview.allow_tags = True
    passport_preview.short_description = "Паспорт"

    def license_preview(self, obj):
        if obj.license_photo:
            return f'<img src="{obj.license_photo.url}" width="150" />'
        return "No license"
    license_preview.allow_tags = True
    license_preview.short_description = "Права"
