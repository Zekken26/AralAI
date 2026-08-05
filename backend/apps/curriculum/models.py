from django.db import models


class Subject(models.Model):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class CurriculumTopic(models.Model):
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="topics",
    )
    grade_level = models.PositiveSmallIntegerField()
    code = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    sequence_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sequence_order", "title"]
        indexes = [models.Index(fields=["subject", "grade_level"])]

    def __str__(self) -> str:
        return f"{self.title} ({self.code})"
