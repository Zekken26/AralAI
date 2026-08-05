from rest_framework.permissions import BasePermission

from apps.accounts.models import UserRole


class IsStudent(BasePermission):
    """Allow access only to accounts with the STUDENT role."""

    message = "Only students can perform this action."

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.role == UserRole.STUDENT)


class IsTeacher(BasePermission):
    """Allow access only to accounts with the TEACHER role."""

    message = "Only teachers can perform this action."

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.role == UserRole.TEACHER)
