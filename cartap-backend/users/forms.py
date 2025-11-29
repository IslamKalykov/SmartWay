from django import forms
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth import authenticate

class PhoneAuthenticationForm(AuthenticationForm):
    username = forms.CharField(label="Номер телефона")

    def clean(self):
        phone = self.cleaned_data.get('username')
        password = self.cleaned_data.get('password')

        if phone and password:
            self.user_cache = authenticate(self.request, phone_number=phone, password=password)
            if self.user_cache is None:
                raise forms.ValidationError("Неправильный номер телефона или пароль")
            else:
                self.confirm_login_allowed(self.user_cache)

        return self.cleaned_data
