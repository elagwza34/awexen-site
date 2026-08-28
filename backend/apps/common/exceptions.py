from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None

    request = context.get("request")
    details = response.data
    response.data = {
        "error": {
            "code": getattr(exc, "default_code", "request_error"),
            "message": "تعذّر تنفيذ الطلب.",
            "details": details,
            "request_id": getattr(request, "request_id", None),
        }
    }
    return response
