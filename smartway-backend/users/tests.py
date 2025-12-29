from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
# Create your tests here.
from users.models import User
from users.otp import save_otp


class PinAuthenticationTests(APITestCase):
    def setUp(self):
        self.phone = "+12345678901"
        self.normalized_phone = self.phone.replace("+", "")
        self.verify_url = "/api/users/verify-otp/"
        self.pin_login_url = "/api/users/login-pin/"

    def _prepare_otp(self, code: str = "1234"):
        save_otp(self.phone, code)

    def test_verify_otp_requires_pin_for_new_user(self):
        self._prepare_otp("1111")

        response = self.client.post(
            self.verify_url,
            {"phone_number": self.phone, "otp_code": "1111"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)

    def test_verify_otp_sets_pin_for_new_user(self):
        self._prepare_otp("2222")

        response = self.client.post(
            self.verify_url,
            {
                "phone_number": self.phone,
                "otp_code": "2222",
                "full_name": "Test User",
                "role": "driver",
                "pin_code": "1234",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user = User.objects.get(phone_number=self.normalized_phone)
        self.assertTrue(user.has_pin)
        self.assertTrue(user.check_pin("1234"))
        self.assertTrue(response.data["user"]["has_pin"])
        self.assertTrue(user.is_driver)

    def test_login_with_pin(self):
        user = User.objects.create(
            phone_number=self.normalized_phone,
            full_name="Pin User",
        )
        user.set_pin("5678")
        user.save()

        response = self.client.post(
            self.pin_login_url,
            {"phone_number": self.phone, "pin_code": "5678"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

        response_bad_pin = self.client.post(
            self.pin_login_url,
            {"phone_number": self.phone, "pin_code": "1111"},
            format="json",
        )
        self.assertEqual(response_bad_pin.status_code, status.HTTP_400_BAD_REQUEST)