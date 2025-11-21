from rest_framework.throttling import SimpleRateThrottle

class OTPRateThrottle(SimpleRateThrottle):
    scope = "otp"
    def get_cache_key(self, request, view):
        phone = (request.data.get("phone_number") or "").strip()
        if not phone:
            # если нет телефона — троттлим по IP как аноним
            ident = self.get_ident(request)
        else:
            ident = phone
        return self.cache_format % {"scope": self.scope, "ident": ident}
