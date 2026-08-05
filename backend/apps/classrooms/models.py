import secrets
import string

from django.conf import settings
from django.db import models


class Classroom(models.Model):
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="classrooms",
    )
    name = models.CharField(max_length=200)
    section = models.CharField(max_length=100, blank=True)
    school_year = models.CharField(max_length=50, blank=True)
    join_code = models.CharField(max_length=16, unique=True, db_index=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["teacher", "is_active"])]

    def __str__(self) -> str:
        return f"{self.name} ({self.join_code})"

    @staticmethod
    def generate_join_code() -> str:
        alphabet = string.ascii_uppercase + string.digits
        return "".join(secrets.choice(alphabet) for _ in range(8))


class EnrollmentStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"


class Enrollment(models.Model):
    classroom = models.ForeignKey(
        Classroom,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    status = models.CharField(
        max_length=20,
        choices=EnrollmentStatus.choices,
        default=EnrollmentStatus.ACTIVE,
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["classroom", "student"],
                name="unique_classroom_student_enrollment",
            )
        ]
        indexes = [models.Index(fields=["classroom", "status"])]

    def __str__(self) -> str:
        return f"{self.student_id} in {self.classroom_id}"
