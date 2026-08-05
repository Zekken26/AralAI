from rest_framework.throttling import AnonRateThrottle


class AuthRegisterThrottle(AnonRateThrottle):
    scope = "auth_register"


class AuthLoginThrottle(AnonRateThrottle):
    scope = "auth_login"