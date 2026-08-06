from decimal import Decimal

from django.db.models import Count, Max, Subquery, OuterRef
from django.db.models.functions import Coalesce

from apps.accounts.models import User
from apps.progress.models import (
    MasteryHistory,
    MasteryStatus,
    Recommendation,
    RecommendationStatus,
    TopicMastery,
)
from apps.quizzes.models import AttemptStatus, QuizAttempt


# --------------------------------------------------------------------------
# Student selectors
# --------------------------------------------------------------------------
def _active_recommendation_count():
    return Coalesce(
        Subquery(
            Recommendation.objects.filter(
                student=OuterRef("student_id"),
                topic=OuterRef("topic_id"),
                status=RecommendationStatus.ACTIVE,
            )
            .values("student_id")
            .annotate(count=Count("id"))
            .values("count")
        ),
        0,
    )


def student_mastery_list(user, *, subject_id: int | None = None):
    qs = TopicMastery.objects.filter(student=user).select_related("topic", "topic__subject")
    if subject_id is not None:
        qs = qs.filter(topic__subject_id=subject_id)
    return qs.annotate(active_recommendation_count=_active_recommendation_count()).order_by(
        "-mastery_score", "topic__title"
    )


def get_student_mastery(user, topic_id: int):
    return (
        TopicMastery.objects.filter(student=user, topic_id=topic_id)
        .select_related("topic", "topic__subject")
        .annotate(active_recommendation_count=_active_recommendation_count())
        .first()
    )


def student_topic_active_recommendations(user, topic_id: int):
    return (
        Recommendation.objects.filter(
            student=user,
            topic_id=topic_id,
            status=RecommendationStatus.ACTIVE,
        )
        .select_related("topic", "target_lesson", "target_quiz")
        .order_by("priority", "-updated_at")
    )


def student_mastery_history(user, topic_id: int):
    return (
        MasteryHistory.objects.filter(
            topic_mastery__student=user,
            topic_mastery__topic_id=topic_id,
        )
        .select_related("topic_mastery__topic", "quiz_attempt__quiz")
        .order_by("-created_at", "-id")
    )


def student_recommendations(user):
    return (
        Recommendation.objects.filter(student=user, status=RecommendationStatus.ACTIVE)
        .select_related("topic", "target_lesson", "target_quiz")
        .order_by("priority", "-updated_at")
    )


def student_recommendation_history(user):
    return (
        Recommendation.objects.filter(
            student=user,
            status__in=[RecommendationStatus.COMPLETED, RecommendationStatus.DISMISSED],
        )
        .select_related("topic", "target_lesson", "target_quiz")
        .order_by("-updated_at")
    )


def get_recommendation_for_student(user, pk: int):
    return (
        Recommendation.objects.filter(pk=pk, student=user)
        .select_related("topic", "target_lesson", "target_quiz")
        .first()
    )


def student_progress_summary_data(user) -> dict:
    masteries = list(
        TopicMastery.objects.filter(student=user).values_list("mastery_score", "status")
    )
    scores = [row[0] for row in masteries]
    recent_attempts = list(
        QuizAttempt.objects.filter(student=user, status=AttemptStatus.SUBMITTED)
        .order_by("-submitted_at", "-id")
        .values("id", "score", "passed", "submitted_at")[:5]
    )
    trend = [
        {
            "attempt": row["id"],
            "score": row["score"],
            "passed": row["passed"],
            "submitted_at": row["submitted_at"],
        }
        for row in recent_attempts
    ]
    trend_delta = None
    if len(trend) >= 2 and trend[0]["score"] is not None and trend[1]["score"] is not None:
        trend_delta = Decimal(trend[0]["score"]) - Decimal(trend[1]["score"])
    last_activity = (
        QuizAttempt.objects.filter(student=user, status=AttemptStatus.SUBMITTED).aggregate(
            last=Max("submitted_at")
        )["last"]
    )
    total_submitted = (
        QuizAttempt.objects.filter(student=user, status=AttemptStatus.SUBMITTED).count()
    )
    return {
        "overall_mastery_average": (
            Decimal(sum(scores)) / Decimal(len(scores)) if scores else None
        ),
        "topics_attempted": len(masteries),
        "topics_mastered": sum(1 for _, status in masteries if status == MasteryStatus.MASTERED),
        "topics_needing_support": sum(
            1 for _, status in masteries if status == MasteryStatus.NEEDS_SUPPORT
        ),
        "total_submitted_attempts": total_submitted,
        "recent_performance_trend": trend,
        "trend_delta": trend_delta,
        "last_activity_date": last_activity,
    }


# --------------------------------------------------------------------------
# Teacher selectors (scoped to owned classrooms)
# --------------------------------------------------------------------------
def _classroom_topic_ids(classroom_id: int):
    from apps.lessons.models import Lesson

    return list(
        Lesson.objects.filter(classroom_id=classroom_id)
        .order_by("topic_id")
        .values_list("topic_id", flat=True)
        .distinct()
    )


def _classroom_mastery_rows(teacher, classroom_id: int):
    topic_ids = _classroom_topic_ids(classroom_id)
    return (
        TopicMastery.objects.filter(
            topic_id__in=topic_ids,
            student__enrollments__classroom_id=classroom_id,
            student__enrollments__classroom__teacher=teacher,
        )
        .select_related("student", "topic")
    )


def classroom_progress_data(teacher, classroom_id: int) -> dict | None:
    """Per-topic aggregate performance for a classroom the teacher owns."""
    if not teacher.classrooms.filter(pk=classroom_id).exists():
        return None
    rows = list(
        _classroom_mastery_rows(teacher, classroom_id).values(
            "topic_id",
            "topic__title",
            "topic__code",
            "mastery_score",
            "status",
        )
    )
    per_topic = {}
    for row in rows:
        bucket = per_topic.setdefault(
            row["topic_id"],
            {
                "topic": {
                    "id": row["topic_id"],
                    "title": row["topic__title"],
                    "code": row["topic__code"],
                },
                "needs_support": 0,
                "developing": 0,
                "proficient": 0,
                "mastered": 0,
                "scores": [],
            },
        )
        bucket[row["status"].lower()] += 1
        bucket["scores"].append(row["mastery_score"])

    completion_rows = list(
        QuizAttempt.objects.filter(
            quiz__classroom_id=classroom_id,
            status=AttemptStatus.SUBMITTED,
        )
        .values("quiz__lesson__topic_id")
        .annotate(submitted_attempts=Count("id"))
    )
    completion = {
        row["quiz__lesson__topic_id"]: row["submitted_attempts"] for row in completion_rows
    }

    averages = {
        topic_id: Decimal(sum(bucket["scores"])) / Decimal(len(bucket["scores"]))
        for topic_id, bucket in per_topic.items()
    }
    ranked = sorted(per_topic.items(), key=lambda kv: averages[kv[0]])
    weakest = [
        {
            "topic": {
                "id": topic_id,
                "title": bucket["topic"]["title"],
                "code": bucket["topic"]["code"],
            },
            "average_mastery": averages[topic_id],
        }
        for topic_id, bucket in ranked[:3]
    ]
    strongest = [
        {
            "topic": {
                "id": topic_id,
                "title": bucket["topic"]["title"],
                "code": bucket["topic"]["code"],
            },
            "average_mastery": averages[topic_id],
        }
        for topic_id, bucket in reversed(ranked[-3:])
    ]

    topic_distribution = []
    for topic_id, bucket in per_topic.items():
        bucket["submitted_attempts"] = completion.get(topic_id, 0)
        bucket["attempted_students"] = bucket["needs_support"] + bucket["developing"] + bucket["proficient"] + bucket["mastered"]
        bucket["average_mastery"] = averages[topic_id]
        bucket.pop("scores")
        topic_distribution.append(bucket)
    topic_distribution.sort(key=lambda item: item["topic"]["title"])

    all_scores = [row["mastery_score"] for row in rows]
    return {
        "classroom_id": classroom_id,
        "class_average_mastery": (
            Decimal(sum(all_scores)) / Decimal(len(all_scores)) if all_scores else None
        ),
        "attempted_topics": len(per_topic),
        "weakest_topics": weakest,
        "strongest_topics": strongest,
        "topic_distribution": topic_distribution,
    }


def classroom_students_needing_support_data(teacher, classroom_id: int) -> list | None:
    if not teacher.classrooms.filter(pk=classroom_id).exists():
        return None
    rows = list(
        _classroom_mastery_rows(teacher, classroom_id)
        .filter(status=MasteryStatus.NEEDS_SUPPORT)
        .values("student_id", "student__first_name", "student__last_name", "topic_id", "topic__title", "topic__code", "mastery_score")
        .order_by("student_id", "mastery_score")
    )
    students = {}
    for row in rows:
        student = students.setdefault(
            row["student_id"],
            {
                "student": {
                    "id": row["student_id"],
                    "first_name": row["student__first_name"],
                    "last_name": row["student__last_name"],
                },
                "topics": [],
            },
        )
        student["topics"].append(
            {
                "topic": {
                    "id": row["topic_id"],
                    "title": row["topic__title"],
                    "code": row["topic__code"],
                },
                "mastery_score": row["mastery_score"],
                "status": MasteryStatus.NEEDS_SUPPORT,
            }
        )
    return list(students.values())


def classroom_topic_progress_data(teacher, classroom_id: int, topic_id: int) -> dict | None:
    if not teacher.classrooms.filter(pk=classroom_id).exists():
        return None
    rows = list(
        _classroom_mastery_rows(teacher, classroom_id)
        .filter(topic_id=topic_id)
        .values(
            "topic__title",
            "topic__code",
            "mastery_score",
            "status",
            "student_id",
            "student__first_name",
            "student__last_name",
        )
    )
    if not rows:
        return {
            "topic": {"id": topic_id, "title": None, "code": None},
            "average_mastery": None,
            "attempted_students": 0,
            "distribution": {
                "needs_support": 0,
                "developing": 0,
                "proficient": 0,
                "mastered": 0,
            },
            "students": [],
        }
    scores = [row["mastery_score"] for row in rows]
    distribution = {
        "needs_support": 0,
        "developing": 0,
        "proficient": 0,
        "mastered": 0,
    }
    for row in rows:
        distribution[row["status"].lower()] += 1
    return {
        "topic": {
            "id": topic_id,
            "title": rows[0]["topic__title"],
            "code": rows[0]["topic__code"],
        },
        "average_mastery": Decimal(sum(scores)) / Decimal(len(scores)),
        "attempted_students": len(rows),
        "distribution": distribution,
        "students": [
            {
                "student": {
                    "id": row["student_id"],
                    "first_name": row["student__first_name"],
                    "last_name": row["student__last_name"],
                },
                "mastery_score": row["mastery_score"],
                "status": row["status"],
            }
            for row in rows
        ],
    }


def teacher_student_progress_data(teacher, classroom_id: int, student_id: int) -> dict | None:
    """One student's mastery over the topics taught in an owned classroom."""
    from apps.classrooms.models import Enrollment

    if not teacher.classrooms.filter(pk=classroom_id).exists():
        return None
    if not Enrollment.objects.filter(
        classroom_id=classroom_id, classroom__teacher=teacher, student_id=student_id
    ).exists():
        return None
    topic_ids = _classroom_topic_ids(classroom_id)
    rows = list(
        TopicMastery.objects.filter(student_id=student_id, topic_id__in=topic_ids)
        .select_related("topic")
        .values("topic_id", "topic__title", "topic__code", "mastery_score", "status")
        .order_by("-mastery_score", "topic__title")
    )
    profile = (
        User.objects.filter(pk=student_id)
        .values("first_name", "last_name")
        .first() or {"first_name": None, "last_name": None}
    )
    scores = [row["mastery_score"] for row in rows]
    return {
        "student": {
            "id": student_id,
            "first_name": profile["first_name"],
            "last_name": profile["last_name"],
        },
        "topics_attempted": len(rows),
        "topics_mastered": sum(1 for row in rows if row["status"] == MasteryStatus.MASTERED),
        "topics_needing_support": sum(
            1 for row in rows if row["status"] == MasteryStatus.NEEDS_SUPPORT
        ),
        "overall_mastery_average": (
            Decimal(sum(scores)) / Decimal(len(scores)) if scores else None
        ),
        "topics": [
            {
                "topic": {
                    "id": row["topic_id"],
                    "title": row["topic__title"],
                    "code": row["topic__code"],
                },
                "mastery_score": row["mastery_score"],
                "status": row["status"],
            }
            for row in rows
        ],
    }
