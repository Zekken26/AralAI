import logging
from datetime import datetime, timedelta
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Avg, Count, Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from apps.classrooms.models import EnrollmentStatus
from apps.curriculum.models import CurriculumTopic
from apps.lessons.models import Lesson, LessonStatus
from apps.progress.mastery import (
    CONSISTENCY_ATTEMPTS_WINDOW,
    DIFFICULTY_WEIGHTS,
    RECENT_ANSWERS_WINDOW,
    consistency_score,
    difficulty_performance,
    mastery_score,
    mastery_status,
    recent_accuracy,
)
from apps.progress.models import (
    MasteryHistory,
    MasteryStatus,
    Recommendation,
    RecommendationPriority,
    RecommendationStatus,
    RecommendationType,
    TopicMastery,
)
from apps.quizzes.models import (
    AttemptStatus,
    Question,
    QuizAttempt,
    ReviewStatus,
    StudentAnswer,
)

logger = logging.getLogger(__name__)

SPACED_REVIEW_DAYS = 7

TWO_PLACES = Decimal("0.01")


def _quantize(value: Decimal) -> Decimal:
    return Decimal(value).quantize(TWO_PLACES)


# --------------------------------------------------------------------------
# Mastery calculation
# --------------------------------------------------------------------------
def compute_topic_mastery(
    student,
    topic_id: int,
    *,
    exclude_attempt_id: int | None = None,
    up_to_attempt_id: int | None = None,
) -> dict | None:
    """Compute all mastery components for (student, topic) from submitted answers.

    Source of truth: StudentAnswer rows with a topic snapshot that belong to
    SUBMITTED attempts. Unanswered questions have no answer row and are
    therefore excluded. Returns None when no submitted answers exist.

    `up_to_attempt_id` restricts the input to attempts submitted no later than
    the given attempt (ties broken by attempt id). This lets a historical
    rebuild reconstruct the exact state before/after every attempt.
    """
    qs = (
        StudentAnswer.objects.filter(
            topic_id=topic_id,
            attempt__student=student,
            attempt__status=AttemptStatus.SUBMITTED,
        )
        .select_related("attempt")
        .order_by("answered_at", "id")
    )
    if exclude_attempt_id is not None:
        qs = qs.exclude(attempt_id=exclude_attempt_id)
    if up_to_attempt_id is not None:
        marker = QuizAttempt.objects.filter(pk=up_to_attempt_id).values(
            "submitted_at", "pk"
        )
        marker = marker.first()
        if marker is None or marker["submitted_at"] is None:
            qs = qs.none()
        else:
            qs = qs.filter(
                Q(attempt__submitted_at__lt=marker["submitted_at"])
                | Q(
                    attempt__submitted_at=marker["submitted_at"],
                    attempt_id__lte=marker["pk"],
                )
            )
    answers = list(qs)
    if not answers:
        return None

    recent = answers[-RECENT_ANSWERS_WINDOW:]
    answered_recent = len(recent)
    correct_recent = sum(1 for a in recent if a.is_correct)

    recent_questions = Question.objects.in_bulk({a.question_id for a in recent})
    weighted_correct = sum(
        DIFFICULTY_WEIGHTS.get(recent_questions[a.question_id].difficulty, Decimal("0"))
        for a in recent
        if a.is_correct
    )
    weighted_total = sum(
        DIFFICULTY_WEIGHTS.get(recent_questions[a.question_id].difficulty, Decimal("0"))
        for a in recent
    )

    per_attempt = {}
    for a in answers:
        row = per_attempt.setdefault(a.attempt_id, [0, 0])
        row[0] += 1 if a.is_correct else 0
        row[1] += 1
    attempt_dates = dict(
        QuizAttempt.objects.filter(pk__in=list(per_attempt)).values_list("pk", "submitted_at")
    )
    ordered_attempts = sorted(
        per_attempt.items(),
        key=lambda kv: (attempt_dates.get(kv[0]) or datetime.min, kv[0]),
    )
    recent_attempts = ordered_attempts[-CONSISTENCY_ATTEMPTS_WINDOW:]
    accuracies = [
        Decimal(row[0]) / Decimal(row[1]) * Decimal("100")
        for _, row in recent_attempts
        if row[1] > 0
    ]

    all_questions = Question.objects.in_bulk({a.question_id for a in answers})
    total_answered = len(answers)
    total_correct = sum(1 for a in answers if a.is_correct)
    total_earned = sum(a.points_awarded or Decimal("0") for a in answers)
    total_possible = sum(all_questions[a.question_id].points for a in answers)

    timestamps = [attempt_dates[a.attempt_id] for a in answers if attempt_dates.get(a.attempt_id)]

    recent_acc = recent_accuracy(correct_recent, answered_recent)
    diff_score = difficulty_performance(weighted_correct, weighted_total)
    consistency = consistency_score(accuracies)
    score = mastery_score(recent_acc, diff_score, consistency)

    return {
        "mastery_score": score,
        "status": mastery_status(score),
        "recent_accuracy": recent_acc,
        "difficulty_score": diff_score,
        "consistency_score": consistency,
        "independent_score": Decimal("100"),
        "total_questions_answered": total_answered,
        "total_correct_answers": total_correct,
        "total_points_earned": _quantize(total_earned),
        "total_points_possible": _quantize(total_possible),
        "first_attempted_at": min(timestamps) if timestamps else None,
        "last_attempted_at": max(timestamps) if timestamps else None,
    }


@transaction.atomic
def recalculate_topic_mastery(student, topic_id: int, *, from_attempt: QuizAttempt | None = None):
    """Recompute mastery for (student, topic) from submitted answers.

    Returns (topic_mastery, previous_score, new_score) where previous_score is
    the score before `from_attempt` contributed (0 when the attempt was the
    first on the topic), or None when no submitted answers exist at all.
    """
    previous = None
    if from_attempt is not None:
        base = compute_topic_mastery(
            student,
            topic_id,
            exclude_attempt_id=from_attempt.id,
            up_to_attempt_id=from_attempt.id,
        )
        previous = base["mastery_score"] if base is not None else Decimal("0")
    computed = compute_topic_mastery(
        student, topic_id, up_to_attempt_id=from_attempt.id if from_attempt else None
    )
    if computed is None:
        return None
    if previous is None:
        existing = (
            TopicMastery.objects.filter(student=student, topic_id=topic_id)
            .values_list("mastery_score", flat=True)
            .first()
        )
        previous = existing if existing is not None else Decimal("0")
    computed["last_recalculated_at"] = timezone.now()
    mastery, _ = TopicMastery.objects.update_or_create(
        student=student,
        topic_id=topic_id,
        defaults=computed,
    )
    return mastery, previous, computed["mastery_score"]


def _history_reason(attempt: QuizAttempt, mastery: TopicMastery, previous, new) -> str:
    delta = new - previous
    sign = "+" if delta >= 0 else ""
    return (
        f"Attempt #{attempt.attempt_number} on '{attempt.quiz.title}' updated mastery for "
        f"{mastery.topic.title}: {previous} -> {new} ({sign}{delta}). "
        f"Recent accuracy {mastery.recent_accuracy}% over "
        f"{mastery.total_questions_answered} question(s) so far."
    )


def create_mastery_history(attempt: QuizAttempt, result):
    """Create one history entry per (topic_mastery, attempt). Idempotent."""
    mastery, previous, new = result
    return MasteryHistory.objects.get_or_create(
        topic_mastery=mastery,
        quiz_attempt=attempt,
        defaults={
            "previous_score": previous,
            "new_score": new,
            "score_change": _quantize(new - previous),
            "reason": _history_reason(attempt, mastery, previous, new),
        },
    )


def process_submitted_attempt(attempt_id: int) -> bool | None:
    """Recalculate mastery and refresh recommendations after a submitted attempt.

    Safe to call repeatedly: recomputation is derived from submitted answers
    (never incremental) and history entries are unique per attempt.
    """
    attempt = (
        QuizAttempt.objects.select_related("student", "quiz")
        .filter(pk=attempt_id, status=AttemptStatus.SUBMITTED)
        .first()
    )
    if attempt is None:
        return None
    topic_ids = list(
        attempt.answers.exclude(topic_id__isnull=True)
        .order_by("topic_id")
        .values_list("topic_id", flat=True)
        .distinct()
    )
    for topic_id in topic_ids:
        with transaction.atomic():
            result = recalculate_topic_mastery(attempt.student, topic_id, from_attempt=attempt)
            if result is not None:
                create_mastery_history(attempt, result)
        try:
            with transaction.atomic():
                generate_recommendations_for_topic(attempt.student, topic_id, from_attempt=attempt)
        except Exception:
            logger.exception(
                "Recommendation generation failed for attempt=%s topic=%s", attempt_id, topic_id
            )
    return True


def rebuild_student_mastery(*, student_id: int | None = None) -> int:
    """Idempotent full rebuild of mastery, history and recommendations from
    submitted attempts. Returns the number of topic/attempt pairs processed."""
    attempts = QuizAttempt.objects.filter(status=AttemptStatus.SUBMITTED).select_related(
        "student", "quiz"
    ).order_by("submitted_at", "id")
    if student_id is not None:
        attempts = attempts.filter(student_id=student_id)
    processed = 0
    for attempt in attempts:
        topic_ids = list(
            attempt.answers.exclude(topic_id__isnull=True)
            .order_by("topic_id")
            .values_list("topic_id", flat=True)
            .distinct()
        )
        for topic_id in topic_ids:
            with transaction.atomic():
                result = recalculate_topic_mastery(attempt.student, topic_id, from_attempt=attempt)
                if result is not None:
                    create_mastery_history(attempt, result)
                    processed += 1
            try:
                with transaction.atomic():
                    generate_recommendations_for_topic(attempt.student, topic_id, from_attempt=attempt)
            except Exception:
                logger.exception(
                    "Recommendation generation failed during rebuild for attempt=%s topic=%s",
                    attempt.id,
                    topic_id,
                )
    return processed


# --------------------------------------------------------------------------
# Recommendation generation
# --------------------------------------------------------------------------
def _accessible_lessons(student, topic_id: int):
    return (
        Lesson.objects.filter(
            topic_id=topic_id,
            status=LessonStatus.PUBLISHED,
            classroom__is_active=True,
            classroom__enrollments__student=student,
            classroom__enrollments__status=EnrollmentStatus.ACTIVE,
        )
        .order_by("-published_at", "-updated_at")
        .select_related("classroom")
    )


def _accessible_quizzes(student, topic_id: int):
    from apps.quizzes.selectors import quizzes_for_student

    return quizzes_for_student(student).filter(lesson__topic_id=topic_id)


def _easiest_quiz(queryset):
    return (
        queryset.annotate(
            avg_difficulty=Avg(
                "questions__difficulty",
                filter=Q(questions__review_status=ReviewStatus.APPROVED),
            )
        )
        .order_by("avg_difficulty", "id")
        .first()
    )


def _next_topic(topic: CurriculumTopic) -> CurriculumTopic | None:
    return (
        CurriculumTopic.objects.filter(
            subject_id=topic.subject_id,
            grade_level=topic.grade_level,
            sequence_order__gt=topic.sequence_order,
        )
        .order_by("sequence_order", "id")
        .first()
    )


def _recent_window_stats(student, topic_id: int) -> tuple[int, int]:
    correct = 0
    answers = list(
        StudentAnswer.objects.filter(
            topic_id=topic_id,
            attempt__student=student,
            attempt__status=AttemptStatus.SUBMITTED,
        )
        .order_by("answered_at", "id")
        .values_list("is_correct", flat=True)
    )[-RECENT_ANSWERS_WINDOW:]
    return sum(1 for value in answers if value), len(answers)


def _per_attempt_accuracies(student, topic_id: int, *, limit: int = 2) -> list:
    """Per-attempt topic accuracies, newest last."""
    attempts = list(
        QuizAttempt.objects.filter(
            student=student,
            status=AttemptStatus.SUBMITTED,
            answers__topic_id=topic_id,
        )
        .distinct()
        .order_by("-submitted_at", "-id")[:limit]
    )
    attempts.reverse()
    accuracies = []
    for attempt in attempts:
        rows = list(
            StudentAnswer.objects.filter(attempt=attempt, topic_id=topic_id).values_list(
                "is_correct", flat=True
            )
        )
        if rows:
            accuracies.append(sum(1 for value in rows if value) / len(rows) * 100)
    return accuracies


def _due_for_spaced_review(mastery: TopicMastery, now=None) -> bool:
    now = now or timezone.now()
    if mastery.last_attempted_at is None:
        return False
    return (now - mastery.last_attempted_at) >= timedelta(days=SPACED_REVIEW_DAYS)


def _desired_recommendations(mastery: TopicMastery) -> dict:
    """Deterministic rules: mastery status -> recommendation types."""
    student, topic = mastery.student, mastery.topic
    score = mastery.mastery_score
    status = mastery.status
    lessons = _accessible_lessons(student, topic.id)
    quizzes = _accessible_quizzes(student, topic.id)
    lesson = lessons.first()
    desired = {}

    if status == MasteryStatus.NEEDS_SUPPORT:
        correct, answered = _recent_window_stats(student, topic.id)
        desired[RecommendationType.REVIEW_LESSON] = {
            "priority": RecommendationPriority.HIGH,
            "title": f"Review the lesson on {topic.title}",
            "reason": (
                f"Your mastery in {topic.title} is {score} (NEEDS_SUPPORT). You answered "
                f"{correct} of {answered} recent questions correctly "
                f"({mastery.recent_accuracy}% recent accuracy). Review the lesson before "
                f"trying easier practice."
            ),
            "lesson": lesson,
            "quiz": None,
        }
        easiest = _easiest_quiz(quizzes)
        if easiest is not None:
            desired[RecommendationType.EASY_PRACTICE] = {
                "priority": RecommendationPriority.HIGH,
                "title": f"Easy practice on {topic.title}",
                "reason": (
                    f"Build confidence in {topic.title} with easier questions: your mastery "
                    f"is {score} (NEEDS_SUPPORT) and your recent accuracy is "
                    f"{mastery.recent_accuracy}%."
                ),
                "lesson": None,
                "quiz": easiest,
            }
    elif status == MasteryStatus.DEVELOPING:
        guided = _easiest_quiz(quizzes)
        if guided is not None:
            desired[RecommendationType.GUIDED_PRACTICE] = {
                "priority": RecommendationPriority.MEDIUM,
                "title": f"Guided practice on {topic.title}",
                "reason": (
                    f"You are developing in {topic.title} (mastery {score}, recent accuracy "
                    f"{mastery.recent_accuracy}%). Work through guided practice to close gaps."
                ),
                "lesson": None,
                "quiz": guided,
            }
        accuracies = _per_attempt_accuracies(student, topic.id)
        if len(accuracies) >= 2 and accuracies[-1] < accuracies[-2] and lesson is not None:
            desired[RecommendationType.REVIEW_LESSON] = {
                "priority": RecommendationPriority.MEDIUM,
                "title": f"Re-review the lesson on {topic.title}",
                "reason": (
                    f"Your recent accuracy on {topic.title} is declining "
                    f"({accuracies[-2]:.1f}% -> {accuracies[-1]:.1f}%). Review the lesson "
                    f"to reinforce the fundamentals."
                ),
                "lesson": lesson,
                "quiz": None,
            }
    elif status == MasteryStatus.PROFICIENT:
        mixed = quizzes.first()
        if mixed is not None:
            desired[RecommendationType.MIXED_PRACTICE] = {
                "priority": RecommendationPriority.LOW,
                "title": f"Mixed practice on {topic.title}",
                "reason": (
                    f"You are proficient in {topic.title} (mastery {score}, recent accuracy "
                    f"{mastery.recent_accuracy}%). Mixed practice keeps you sharp."
                ),
                "lesson": None,
                "quiz": mixed,
            }
        if _due_for_spaced_review(mastery):
            days = (timezone.now() - mastery.last_attempted_at).days
            desired[RecommendationType.SPACED_REVIEW] = {
                "priority": RecommendationPriority.LOW,
                "title": f"Spaced review: {topic.title}",
                "reason": (
                    f"You last practiced {topic.title} {days} day(s) ago with a mastery of "
                    f"{score} (PROFICIENT). A quick review keeps it fresh."
                ),
                "lesson": None,
                "quiz": None,
            }
    elif status == MasteryStatus.MASTERED:
        next_topic = _next_topic(topic)
        if next_topic is not None:
            desired[RecommendationType.ADVANCE_TOPIC] = {
                "priority": RecommendationPriority.LOW,
                "title": f"Move ahead to {next_topic.title}",
                "reason": (
                    f"You have mastered {topic.title} with a mastery score of {score} "
                    f"(MASTERED). Move on to {next_topic.title} ({next_topic.code})."
                ),
                "lesson": None,
                "quiz": None,
            }
        if _due_for_spaced_review(mastery):
            days = (timezone.now() - mastery.last_attempted_at).days
            desired[RecommendationType.SPACED_REVIEW] = {
                "priority": RecommendationPriority.LOW,
                "title": f"Spaced review: {topic.title}",
                "reason": (
                    f"You mastered {topic.title} ({score}%) {days} day(s) ago. Schedule a "
                    f"light review to retain it."
                ),
                "lesson": None,
                "quiz": None,
            }
    return desired


@transaction.atomic
def generate_recommendations_for_topic(
    student, topic_id: int, *, from_attempt: QuizAttempt | None = None
) -> None:
    """Refresh active recommendations for (student, topic).

    Rules: at most one ACTIVE recommendation per (student, topic, type) — the
    partial unique constraint enforces this at the database level. Desired
    types are upserted; active types no longer desired are marked EXPIRED.
    COMPLETED and DISMISSED recommendations are never touched.
    """
    mastery = (
        TopicMastery.objects.select_related("topic", "student")
        .filter(student=student, topic_id=topic_id)
        .first()
    )
    if mastery is None:
        return
    desired = _desired_recommendations(mastery)
    existing = {
        rec.recommendation_type: rec
        for rec in Recommendation.objects.select_for_update().filter(
            student=student,
            topic_id=topic_id,
            status=RecommendationStatus.ACTIVE,
        )
    }
    for rec_type, spec in desired.items():
        target_lesson = spec.get("lesson")
        target_quiz = spec.get("quiz")
        if rec_type in existing:
            rec = existing.pop(rec_type)
            rec.priority = spec["priority"]
            rec.title = spec["title"]
            rec.reason = spec["reason"]
            rec.target_lesson = target_lesson
            rec.target_quiz = target_quiz
            rec.generated_from_attempt = from_attempt
            rec.save()
        else:
            try:
                Recommendation.objects.create(
                    student=student,
                    topic=mastery.topic,
                    recommendation_type=rec_type,
                    priority=spec["priority"],
                    title=spec["title"],
                    reason=spec["reason"],
                    target_lesson=target_lesson,
                    target_quiz=target_quiz,
                    generated_from_attempt=from_attempt,
                )
            except IntegrityError:
                logger.warning(
                    "Active recommendation already exists for student=%s topic=%s type=%s",
                    student.id,
                    topic_id,
                    rec_type,
                )
    for rec in existing.values():
        rec.status = RecommendationStatus.EXPIRED
        rec.save(update_fields=["status", "updated_at"])


def generate_recommendations_for_student(student) -> int:
    """Refresh recommendations for every topic the student has submitted answers for."""
    topic_ids = list(
        StudentAnswer.objects.filter(
            attempt__student=student,
            attempt__status=AttemptStatus.SUBMITTED,
        )
        .exclude(topic_id__isnull=True)
        .order_by("topic_id")
        .values_list("topic_id", flat=True)
        .distinct()
    )
    for topic_id in topic_ids:
        with transaction.atomic():
            generate_recommendations_for_topic(student, topic_id)
    return len(topic_ids)


# --------------------------------------------------------------------------
# Recommendation lifecycle
# --------------------------------------------------------------------------
def complete_recommendation(*, recommendation: Recommendation, student) -> Recommendation:
    if recommendation.student_id != student.id:
        raise PermissionDenied("This recommendation belongs to another student.")
    if recommendation.status == RecommendationStatus.ACTIVE:
        recommendation.status = RecommendationStatus.COMPLETED
        recommendation.completed_at = timezone.now()
        recommendation.save(update_fields=["status", "completed_at", "updated_at"])
    return recommendation


def dismiss_recommendation(*, recommendation: Recommendation, student) -> Recommendation:
    if recommendation.student_id != student.id:
        raise PermissionDenied("This recommendation belongs to another student.")
    if recommendation.status == RecommendationStatus.ACTIVE:
        recommendation.status = RecommendationStatus.DISMISSED
        recommendation.save(update_fields=["status", "updated_at"])
    return recommendation
