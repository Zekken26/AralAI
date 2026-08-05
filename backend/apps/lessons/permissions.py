from rest_framework.permissions import BasePermission

from apps.lessons.models import Lesson


class IsLessonAuthor(BasePermission):
    """Object-level: only the lesson author."""

    message = "Only the lesson author can perform this action."

    def has_object_permission(self, request, view, obj) -> bool:
        if not isinstance(obj, Lesson):
            return False
        return request.user.is_authenticated and obj.author_id == request.user.id