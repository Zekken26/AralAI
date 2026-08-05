from django.conf import settings
from django.db import models


class QuizStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    PUBLISHED = "PUBLISHED", "Published"
    ARCHIVED = "ARCHIVED", "Archived"


class QuestionType(models.TextChoices):
    MULTIPLE_CHOICE = "MULTIPLE_CHOICE", "Multiple Choice"
    NUMERIC = "NUMERIC", "Numeric"


class ReviewStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"


class AttemptStatus(models.TextChoices):
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    SUBMITTED = "SUBMITTED", "Submitted"
    EXPIRED = "EXPIRED", "Expired"


class Quiz(models.Model):
    lesson = models.ForeignKey(
        "lessons.Lesson",
        on_delete=models.PROTECT,
        related_name="quizzes",
    )
    classroom = models.ForeignKey(
        "classrooms.Classroom",
        on_delete=models.CASCADE,
        related_name="quizzes",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="quizzes",
    )
    title = models.CharField(max_length=200)
    instructions = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=QuizStatus.choices,
        default=QuizStatus.DRAFT,
    )
    attempt_limit = models.PositiveIntegerField(null=True, blank=True)
    time_limit_minutes = models.PositiveIntegerField(null=True, blank=True)
    available_from = models.DateTimeField(null=True, blank=True)
    available_until = models.DateTimeField(null=True, blank=True)
    passing_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
    )
    randomize_questions = models.BooleanField(default=False)
    show_results_immediately = models.BooleanField(default=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["classroom", "status"]),
            models.Index(fields=["lesson", "status"]),
            models.Index(fields=["author", "status"]),
        ]

    def __str__(self) -> str:
        return self.title


class Question(models.Model):
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="questions",
    )
    topic = models.ForeignKey(
        "curriculum.CurriculumTopic",
        on_delete=models.PROTECT,
        related_name="questions",
    )
    question_type = models.CharField(
        max_length=20,
        choices=QuestionType.choices,
    )
    prompt = models.TextField()
    explanation = models.TextField(blank=True)
    difficulty = models.PositiveSmallIntegerField(default=1)
    points = models.DecimalField(max_digits=6, decimal_places=2)
    numeric_answer = models.DecimalField(
        max_digits=20,
        decimal_places=10,
        null=True,
        blank=True,
    )
    numeric_tolerance = models.DecimalField(
        max_digits=20,
        decimal_places=10,
        null=True,
        blank=True,
    )
    is_ai_generated = models.BooleanField(default=False)
    review_status = models.CharField(
        max_length=20,
        choices=ReviewStatus.choices,
        default=ReviewStatus.DRAFT,
    )
    sequence_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sequence_order", "id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(difficulty__gte=1) & models.Q(difficulty__lte=5),
                name="quiz_question_difficulty_between_1_and_5",
            ),
            models.CheckConstraint(
                condition=models.Q(points__gt=0),
                name="quiz_question_points_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(numeric_tolerance__isnull=True)
                | models.Q(numeric_tolerance__gte=0),
                name="quiz_question_numeric_tolerance_non_negative",
            ),
        ]
        indexes = [
            models.Index(fields=["quiz", "review_status"]),
            models.Index(fields=["quiz", "sequence_order"]),
            models.Index(fields=["topic", "review_status"]),
        ]

    def __str__(self) -> str:
        return self.prompt[:80]


class Choice(models.Model):
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="choices",
    )
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    sequence_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sequence_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["question"],
                condition=models.Q(is_correct=True),
                name="unique_correct_choice_per_question",
            )
        ]
        indexes = [models.Index(fields=["question", "sequence_order"])]

    def __str__(self) -> str:
        return self.text[:80]


class QuizAttempt(models.Model):
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.PROTECT,
        related_name="attempts",
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="quiz_attempts",
    )
    attempt_number = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20,
        choices=AttemptStatus.choices,
        default=AttemptStatus.IN_PROGRESS,
    )
    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    earned_points = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    maximum_points = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    passed = models.BooleanField(null=True, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-started_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["quiz", "student", "attempt_number"],
                name="unique_attempt_number_per_quiz_student",
            ),
            models.UniqueConstraint(
                fields=["quiz", "student"],
                condition=models.Q(status=AttemptStatus.IN_PROGRESS),
                name="unique_active_attempt_per_quiz_student",
            ),
            models.CheckConstraint(
                condition=models.Q(score__isnull=True)
                | (models.Q(score__gte=0) & models.Q(score__lte=100)),
                name="quiz_attempt_score_between_0_and_100",
            ),
        ]
        indexes = [
            models.Index(fields=["quiz", "student"]),
            models.Index(fields=["student", "status"]),
            models.Index(fields=["quiz", "status"]),
        ]

    def __str__(self) -> str:
        return f"Attempt #{self.attempt_number} on {self.quiz_id} by {self.student_id}"


class StudentAnswer(models.Model):
    attempt = models.ForeignKey(
        QuizAttempt,
        on_delete=models.CASCADE,
        related_name="answers",
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.PROTECT,
        related_name="student_answers",
    )
    selected_choice = models.ForeignKey(
        Choice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="student_answers",
    )
    numeric_response = models.DecimalField(
        max_digits=20,
        decimal_places=10,
        null=True,
        blank=True,
    )
    is_correct = models.BooleanField(null=True, blank=True)
    points_awarded = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    answered_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["question__sequence_order", "question_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["attempt", "question"],
                name="unique_answer_per_attempt_question",
            ),
            models.CheckConstraint(
                condition=~models.Q(
                    selected_choice__isnull=False,
                    numeric_response__isnull=False,
                ),
                name="quiz_answer_single_response_format",
            ),
        ]
        indexes = [
            models.Index(fields=["attempt", "question"]),
            models.Index(fields=["question"]),
        ]

    def __str__(self) -> str:
        return f"Answer by attempt {self.attempt_id} for question {self.question_id}"