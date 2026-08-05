from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is not None and isinstance(exc, APIException):
        if isinstance(response.data, dict):
            if set(response.data.keys()) == {"detail"}:
                response.data["code"] = exc.get_codes()
            else:
                code = getattr(exc, "default_code", None)
                if code and "code" not in response.data:
                    response.data["code"] = code
    return response