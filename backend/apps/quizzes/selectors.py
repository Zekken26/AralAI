from django.db.models import Avg, Count, Exists, OuterRef, Prefetch, Q
from django.utils import timezone

from apps.accounts.models import User, UserRole
from apps.classrooms.models import EnrollmentStatus
from apps.lessons.models import LessonStatus
from apps.quizzes.models import (
    AttemptStatus,
    Question,
    Quiz,
    QuizStatus,
    ReviewStatus,
)


def _approved_questions() -> "QuerySet[Question]":
    return Question.objects.filter(review_status=ReviewStatus.APPROVED)


def _has_approved_questions():
    return Exists(
        Question.objects.filter(
            quiz_id=OuterRef("pk"),
            review_status=ReviewStatus.APPROVED,
        )
    )


def quizzes_for_teacher(user: User, *, classroom_id=None, topic_id=None, status=None):
    """Quizzes authored by `user` (drafts, published and archived)."""
    qs = Quiz.objects.filter(author=user)
    if classroom_id is not None:
        qs = qs.filter(classroom_id=classroom_id)
    if topic_id is not None:
        qs = qs.filter(lesson__topic_id=topic_id)
    if status is not None:
        qs = qs.filter(status=status)
    return (
        qs.select_related("lesson", "classroom", "author")
        .prefetch_related("questions")
        .order_by("-updated_at")
    )


def quizzes_for_student(user: User, *, classroom_id=None, topic_id=None):
    """Published, currently available quizzes in classrooms where the student is actively enrolled."""
    now = timezone.now()
    qs = Quiz.objects.filter(
        status=QuizStatus.PUBLISHED,
        lesson__status=LessonStatus.PUBLISHED,
        classroom__is_active=True,
        classroom__enrollments__student=user,
        classroom__enrollments__status=EnrollmentStatus.ACTIVE,
    ).filter(
        Q(available_from__isnull=True) | Q(available_from__lte=now),
        Q(available_until__isnull=True) | Q(available_until__gte=now),
    )
    if classroom_id is not None:
        qs = qs.filter(classroom_id=classroom_id)
    if topic_id is not None:
        qs = qs.filter(lesson__topic_id=topic_id)
    return (
        qs.annotate(has_approved_questions=_has_approved_questions())
        .filter(has_approved_questions=True)
        .distinct()
        .select_related("lesson", "classroom", "author")
        .prefetch_related(
            Prefetch(
                "questions",
                queryset=_approved_questions().prefetch_related("choices"),
                to_attr="approved_questions",
            )
        )
        .order_by("-published_at")
    )


def get_quiz_for_teacher(user: User, quiz_id: int) -> Quiz | None:
    return (
        Quiz.objects.filter(pk=quiz_id, author=user)
        .select_related("lesson", "classroom", "author")
        .prefetch_related(
            Prefetch(
                "questions",
                queryset=Question.objects.filter(quiz_id=quiz_id).prefetch_related("choices"),
            )
        )
        .first()
    )


def get_quiz_for_student(user: User, quiz_id: int) -> Quiz | None:
    return quizzes_for_student(user).filter(pk=quiz_id).first()


def get_classroom_for_user(user: User, classroom_id: int):
    """Classroom lookup used to verify teacher ownership of results endpoints."""
    from apps.classrooms.models import Classroom

    return Classroom.objects.filter(pk=classroom_id).first()


def attempts_for_student(user: User):
    """Attempts belonging to `user`, newest first. Historical results stay visible."""
    from apps.quizzes.models import QuizAttempt

    return (
        QuizAttempt.objects.filter(student=user)
        .select_related("quiz__lesson", "quiz__classroom", "quiz__author")
        .order_by("-started_at")
    )


def get_attempt_for_student(user: User, attempt_id: int):
    from apps.quizzes.models import QuizAttempt

    return (
        QuizAttempt.objects.filter(pk=attempt_id, student=user)
        .select_related("quiz__lesson", "quiz__classroom", "quiz__author")
        .prefetch_related(
            Prefetch(
                "quiz__questions",
                queryset=_approved_questions().prefetch_related("choices"),
                to_attr="approved_questions",
            ),
            "answers",
        )
        .first()
    )


def attempts_for_quiz_owner(owner: User, quiz_id: int):
    """Attempts on a quiz the teacher owns, with student and answer details."""
    from apps.quizzes.models import QuizAttempt

    return (
        QuizAttempt.objects.filter(quiz_id=quiz_id, quiz__author=owner)
        .select_related("student", "quiz__lesson", "quiz__classroom")
        .prefetch_related(
            Prefetch(
                "quiz__questions",
                queryset=_approved_questions().prefetch_related("choices"),
                to_attr="approved_questions",
            ),
            "answers",
        )
        .order_by("-started_at")
    )


def get_attempt_for_teacher(teacher: User, attempt_id: int):
    """Attempt visible to the classroom owner (used for 404-safe access)."""
    from apps.quizzes.models import QuizAttempt

    return (
        QuizAttempt.objects.filter(
            pk=attempt_id,
            quiz__classroom__teacher=teacher,
        )
        .select_related("student", "quiz")
        .first()
    )


def quiz_results_summary_attempts(teacher: User, quiz_id: int):
    """Submitted attempts for a teacher-owned quiz."""
    return attempts_for_quiz_owner(teacher, quiz_id).filter(status=AttemptStatus.SUBMITTED)


def classroom_quiz_results(teacher: User, classroom_id: int):
    """Per-quiz aggregate performance for a classroom the teacher owns."""
    return (
        Quiz.objects.filter(classroom_id=classroom_id, classroom__teacher=teacher)
        .annotate(
            total_attempts=Count("attempts"),
            submitted_attempts=Count("attempts", filter=Q(attempts__status=AttemptStatus.SUBMITTED)),
            passed_attempts=Count("attempts", filter=Q(attempts__passed=True)),
            average_score=Avg("attempts__score", filter=Q(attempts__status=AttemptStatus.SUBMITTED)),
        )
        .select_related("lesson")
        .order_by("-updated_at")
    )


def classroom_teacher_stats(teacher: User, classroom_id: int):
    """Aggregate attempt stats for every quiz in an owned classroom (per-student rows)."""
    from apps.quizzes.models import QuizAttempt

    return (
        QuizAttempt.objects.filter(
            quiz__classroom_id=classroom_id,
            quiz__classroom__teacher=teacher,
            status=AttemptStatus.SUBMITTED,
        )
        .select_related("student", "quiz")
        .order_by("quiz_id", "student_id", "-submitted_at")
    )
