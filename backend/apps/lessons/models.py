from django.conf import settings
from django.db import models


class LessonStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    PUBLISHED = "PUBLISHED", "Published"
    ARCHIVED = "ARCHIVED", "Archived"


class Lesson(models.Model):
    topic = models.ForeignKey(
        "curriculum.CurriculumTopic",
        on_delete=models.PROTECT,
        related_name="lessons",
    )
    classroom = models.ForeignKey(
        "classrooms.Classroom",
        on_delete=models.CASCADE,
        related_name="lessons",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="lessons",
    )
    title = models.CharField(max_length=200, blank=True)
    summary = models.TextField(blank=True)
    learning_objectives = models.JSONField(default=list, blank=True)
    content = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=LessonStatus.choices,
        default=LessonStatus.DRAFT,
    )
    version = models.PositiveIntegerField(default=1)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["classroom", "status"]),
            models.Index(fields=["topic", "status"]),
            models.Index(fields=["author", "status"]),
        ]

    def __str__(self) -> str:
        return self.title or f"Lesson #{self.id}"
