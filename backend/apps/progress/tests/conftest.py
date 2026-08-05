from decimal import Decimal

import pytest
from django.utils import timezone

from apps.classrooms.models import Classroom
from apps.curriculum.models import CurriculumTopic
from apps.lessons.models import Lesson, LessonStatus
from apps.quizzes.models import Quiz, QuizStatus
from apps.quizzes.tests.conftest import (
    create_attempt,
    make_lesson,
    make_mc_question,
    make_numeric_question,
    make_published_quiz,
    make_quiz,
)


@pytest.fixture
def classroom(teacher_user, db):
    return Classroom.objects.create(teacher=teacher_user, name="Grade 8 Math", join_code="CODE1234")


@pytest.fixture
def enrollment(classroom, student_user, db):
    from apps.classrooms.models import Enrollment, EnrollmentStatus

    return Enrollment.objects.create(
        classroom=classroom, student=student_user, status=EnrollmentStatus.ACTIVE
    )


@pytest.fixture
def second_enrollment(classroom, second_student, db):
    from apps.classrooms.models import Enrollment, EnrollmentStatus

    return Enrollment.objects.create(
        classroom=classroom, student=second_student, status=EnrollmentStatus.ACTIVE
    )


@pytest.fixture
def lesson(classroom, teacher_user, topic, db):
    return make_lesson(classroom, teacher_user, topic)


@pytest.fixture
def draft_lesson(classroom, teacher_user, topic, db):
    return make_lesson(classroom, teacher_user, topic, status=LessonStatus.DRAFT, title="Draft")


@pytest.fixture
def topic2(subject, db):
    return CurriculumTopic.objects.create(
        subject=subject,
        grade_level=8,
        code="M8AL-Ia-2",
        title="Inequalities",
        description="Linear inequalities in one variable.",
        sequence_order=2,
    )


@pytest.fixture
def second_lesson(classroom, teacher_user, topic2, db):
    return make_lesson(classroom, teacher_user, topic2, title="Second lesson")


@pytest.fixture
def published_quiz_data(classroom, lesson, teacher_user, topic, db):
    return make_published_quiz(classroom, lesson, teacher_user, topic)


@pytest.fixture
def published_quiz(published_quiz_data):
    return published_quiz_data[0]


@pytest.fixture
def mc_question(published_quiz_data):
    return published_quiz_data[1]


@pytest.fixture
def mc_wrong_choice(published_quiz_data):
    return published_quiz_data[2]


@pytest.fixture
def mc_correct_choice(published_quiz_data):
    return published_quiz_data[3]


@pytest.fixture
def numeric_question(published_quiz_data):
    return published_quiz_data[4]


@pytest.fixture
def published_quiz2_data(classroom, second_lesson, teacher_user, topic2, db):
    return make_published_quiz(classroom, second_lesson, teacher_user, topic2)


@pytest.fixture
def published_quiz2(published_quiz2_data):
    return published_quiz2_data[0]


def add_question(quiz, topic, *, points=5, difficulty=2):
    """Add an approved MC question to an existing quiz and return (question, wrong, right)."""
    return make_mc_question(quiz, topic, points=points)


def submit_via_api(client, quiz, answers):
    """Start + answer + submit an attempt through the API. Returns the submit response."""
    attempt_id = client.post(f"/api/v1/quizzes/{quiz.id}/attempts/").json()["id"]
    for question_id, payload in answers.items():
        response = client.put(
            f"/api/v1/attempts/{attempt_id}/answers/{question_id}/",
            payload,
            format="json",
        )
        assert response.status_code == 200
    return client.post(f"/api/v1/attempts/{attempt_id}/submit/")


def make_submitted_attempt(
    student,
    quiz,
    *,
    answers,
    attempt_number=1,
    status="SUBMITTED",
    submitted_at=None,
):
    """Directly construct a submitted attempt with fully controlled answers.

    `answers` is a list of (question, is_correct, points_awarded). The topic
    snapshot, per-answer timestamps and attempt scores are set explicitly so
    formula tests do not depend on the scoring pipeline.
    """
    from apps.quizzes.models import AttemptStatus, StudentAnswer

    attempt = create_attempt(
        quiz,
        student,
        attempt_number=attempt_number,
        status=AttemptStatus[status],
    )
    earned = 0
    maximum = 0
    for question, is_correct, points_awarded in answers:
        awarded = Decimal(points_awarded)
        StudentAnswer.objects.create(
            attempt=attempt,
            question=question,
            topic=question.topic,
            selected_choice=None,
            is_correct=is_correct,
            points_awarded=awarded,
        )
        earned += awarded if is_correct else Decimal("0")
        maximum += question.points
    attempt.earned_points = earned
    attempt.maximum_points = maximum
    attempt.score = Decimal(earned) / Decimal(maximum) * Decimal("100") if maximum else Decimal("0")
    attempt.passed = attempt.score >= quiz.passing_score if attempt.score is not None else None
    attempt.submitted_at = submitted_at or timezone.now()
    attempt.save(update_fields=["earned_points", "maximum_points", "score", "passed", "submitted_at"])
    return attempt


def recompute_mastery(student):
    """Recompute all mastery/history for a student's directly-constructed attempts."""
    from apps.progress.services import rebuild_student_mastery

    return rebuild_student_mastery(student_id=student.id)


class ProgressClient:
    """Small helper bundling the common API flows used by endpoint tests."""

    def __init__(self, api_client, user):
        self.api_client = api_client
        self.user = user
        api_client.force_authenticate(user=user)

    def post(self, url, **kwargs):
        return self.api_client.post(url, **kwargs)

    def put(self, url, data, **kwargs):
        return self.api_client.put(url, data, format="json", **kwargs)

    def get(self, url):
        return self.api_client.get(url)

    def submit(self, quiz, answers):
        return submit_via_api(self.api_client, quiz, answers)
