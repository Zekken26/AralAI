from django.conf import settings
from django.db import models


class MasteryStatus(models.TextChoices):
    NEEDS_SUPPORT = "NEEDS_SUPPORT", "Needs Support"
    DEVELOPING = "DEVELOPING", "Developing"
    PROFICIENT = "PROFICIENT", "Proficient"
    MASTERED = "MASTERED", "Mastered"


class RecommendationType(models.TextChoices):
    REVIEW_LESSON = "REVIEW_LESSON", "Review Lesson"
    EASY_PRACTICE = "EASY_PRACTICE", "Easy Practice"
    GUIDED_PRACTICE = "GUIDED_PRACTICE", "Guided Practice"
    MIXED_PRACTICE = "MIXED_PRACTICE", "Mixed Practice"
    ADVANCE_TOPIC = "ADVANCE_TOPIC", "Advance Topic"
    SPACED_REVIEW = "SPACED_REVIEW", "Spaced Review"


class RecommendationStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    COMPLETED = "COMPLETED", "Completed"
    DISMISSED = "DISMISSED", "Dismissed"
    EXPIRED = "EXPIRED", "Expired"


class RecommendationPriority(models.TextChoices):
    HIGH = "HIGH", "High"
    MEDIUM = "MEDIUM", "Medium"
    LOW = "LOW", "Low"


class TopicMastery(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="topic_masteries",
    )
    topic = models.ForeignKey(
        "curriculum.CurriculumTopic",
        on_delete=models.PROTECT,
        related_name="topic_masteries",
    )
    mastery_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
    )
    total_questions_answered = models.PositiveIntegerField(default=0)
    total_correct_answers = models.PositiveIntegerField(default=0)
    total_points_earned = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_points_possible = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    recent_accuracy = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    difficulty_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    consistency_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    independent_score = models.DecimalField(max_digits=5, decimal_places=2, default=100)
    status = models.CharField(
        max_length=20,
        choices=MasteryStatus.choices,
        default=MasteryStatus.NEEDS_SUPPORT,
    )
    first_attempted_at = models.DateTimeField(null=True, blank=True)
    last_attempted_at = models.DateTimeField(null=True, blank=True)
    last_recalculated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-mastery_score", "topic__title"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "topic"],
                name="unique_student_topic_mastery",
            ),
            models.CheckConstraint(
                condition=models.Q(mastery_score__gte=0) & models.Q(mastery_score__lte=100),
                name="progress_mastery_score_between_0_and_100",
            ),
            models.CheckConstraint(
                condition=models.Q(total_questions_answered__gte=0),
                name="progress_total_questions_answered_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(total_correct_answers__gte=0),
                name="progress_total_correct_answers_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(total_points_earned__gte=0),
                name="progress_total_points_earned_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(total_points_possible__gte=0),
                name="progress_total_points_possible_non_negative",
            ),
        ]
        indexes = [
            models.Index(fields=["student", "status"]),
            models.Index(fields=["topic", "status"]),
        ]

    def __str__(self) -> str:
        return f"Mastery {self.mastery_score} for {self.student_id} on {self.topic_id}"


class MasteryHistory(models.Model):
    topic_mastery = models.ForeignKey(
        TopicMastery,
        on_delete=models.PROTECT,
        related_name="history",
    )
    quiz_attempt = models.ForeignKey(
        "quizzes.QuizAttempt",
        on_delete=models.PROTECT,
        related_name="mastery_histories",
    )
    previous_score = models.DecimalField(max_digits=5, decimal_places=2)
    new_score = models.DecimalField(max_digits=5, decimal_places=2)
    score_change = models.DecimalField(max_digits=6, decimal_places=2)
    reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["topic_mastery", "quiz_attempt"],
                name="unique_history_per_topic_mastery_and_attempt",
            )
        ]
        indexes = [
            models.Index(fields=["topic_mastery", "created_at"]),
            models.Index(fields=["quiz_attempt"]),
        ]

    def __str__(self) -> str:
        return f"{self.topic_mastery_id} after attempt {self.quiz_attempt_id}: {self.previous_score} -> {self.new_score}"


class Recommendation(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="recommendations",
    )
    topic = models.ForeignKey(
        "curriculum.CurriculumTopic",
        on_delete=models.PROTECT,
        related_name="recommendations",
    )
    recommendation_type = models.CharField(
        max_length=20,
        choices=RecommendationType.choices,
    )
    priority = models.CharField(
        max_length=10,
        choices=RecommendationPriority.choices,
        default=RecommendationPriority.MEDIUM,
    )
    title = models.CharField(max_length=200)
    reason = models.TextField()
    target_lesson = models.ForeignKey(
        "lessons.Lesson",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="recommendations",
    )
    target_quiz = models.ForeignKey(
        "quizzes.Quiz",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="recommendations",
    )
    status = models.CharField(
        max_length=20,
        choices=RecommendationStatus.choices,
        default=RecommendationStatus.ACTIVE,
    )
    generated_from_attempt = models.ForeignKey(
        "quizzes.QuizAttempt",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="recommendations",
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "topic", "recommendation_type"],
                condition=models.Q(status=RecommendationStatus.ACTIVE),
                name="unique_active_recommendation_per_student_topic_type",
            )
        ]
        indexes = [
            models.Index(fields=["student", "status"]),
            models.Index(fields=["student", "topic"]),
            models.Index(fields=["topic", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.recommendation_type} ({self.status}) for {self.student_id} on {self.topic_id}"
