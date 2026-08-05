from rest_framework.permissions import BasePermission

from apps.classrooms.models import Classroom


class IsClassroomOwner(BasePermission):
    """Object-level: only the teacher who owns the classroom."""

    message = "Only the classroom owner can perform this action."

    def has_object_permission(self, request, view, obj) -> bool:
        if not isinstance(obj, Classroom):
            return False
        return request.user.is_authenticated and obj.teacher_id == request.user.id


class IsEnrolledStudent(BasePermission):
    """Object-level: only students with an ACTIVE enrollment."""

    message = "Only enrolled students can perform this action."

    def has_object_permission(self, request, view, obj) -> bool:
        from apps.classrooms.selectors import is_enrolled

        if not request.user.is_authenticated:
            return False
        return is_enrolled(request.user, obj)
