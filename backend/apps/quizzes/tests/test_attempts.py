from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework import status

from apps.lessons.models import LessonStatus
from apps.quizzes.models import AttemptStatus, QuizStatus
from apps.quizzes.tests.conftest import create_attempt, make_published_quiz


@pytest.mark.django_db
def test_enrolled_student_can_start_published_quiz(
    auth_client, student_user, enrollment, published_quiz
):
    client = auth_client(student_user)
    response = client.post(f"/api/v1/quizzes/{published_quiz.id}/attempts/")
    assert response.status_code == status.HTTP_201_CREATED
    body = response.json()
    assert body["status"] == AttemptStatus.IN_PROGRESS
    assert body["attempt_number"] == 1


@pytest.mark.django_db
def test_unenrolled_student_cannot_start_quiz(
    auth_client, second_student, published_quiz
):
    client = auth_client(second_student)
    response = client.post(f"/api/v1/quizzes/{published_quiz.id}/attempts/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_inactive_enrollment_blocks_attempt(
    auth_client, student_user, enrollment, published_quiz
):
    from apps.classrooms.models import EnrollmentStatus

    enrollment.status = EnrollmentStatus.INACTIVE
    enrollment.save()
    client = auth_client(student_user)
    response = client.post(f"/api/v1/quizzes/{published_quiz.id}/attempts/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_teacher_cannot_start_student_attempt(
    auth_client, teacher_user, published_quiz
):
    client = auth_client(teacher_user)
    response = client.post(f"/api/v1/quizzes/{published_quiz.id}/attempts/")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_draft_quiz_cannot_be_started(auth_client, student_user, enrollment, quiz):
    client = auth_client(student_user)
    response = client.post(f"/api/v1/quizzes/{quiz.id}/attempts/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_archived_quiz_cannot_be_started(
    auth_client, student_user, enrollment, classroom, lesson, teacher_user, topic
):
    archived = make_published_quiz(classroom, lesson, teacher_user, topic, status=QuizStatus.ARCHIVED)[0]
    client = auth_client(student_user)
    response = client.post(f"/api/v1/quizzes/{archived.id}/attempts/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_future_quiz_cannot_be_started(
    auth_client, student_user, enrollment, classroom, lesson, teacher_user, topic
):
    future = timezone.now() + timedelta(hours=1)
    quiz = make_published_quiz(
        classroom, lesson, teacher_user, topic, available_from=future
    )[0]
    client = auth_client(student_user)
    response = client.post(f"/api/v1/quizzes/{quiz.id}/attempts/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_expired_availability_window_blocks_attempt(
    auth_client, student_user, enrollment, classroom, lesson, teacher_user, topic
):
    past = timezone.now() - timedelta(hours=1)
    quiz = make_published_quiz(
        classroom, lesson, teacher_user, topic, available_until=past
    )[0]
    client = auth_client(student_user)
    response = client.post(f"/api/v1/quizzes/{quiz.id}/attempts/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_attempt_limit_is_enforced(
    auth_client, student_user, enrollment, classroom, lesson, teacher_user, topic
):
    quiz = make_published_quiz(classroom, lesson, teacher_user, topic, attempt_limit=1)[0]
    client = auth_client(student_user)
    first = client.post(f"/api/v1/quizzes/{quiz.id}/attempts/")
    assert first.status_code == status.HTTP_201_CREATED
    client.post(f"/api/v1/attempts/{first.json()['id']}/submit/")

    second = client.post(f"/api/v1/quizzes/{quiz.id}/attempts/")
    assert second.status_code == status.HTTP_409_CONFLICT
    assert second.json().get("code") == "QUIZ_ATTEMPT_LIMIT_REACHED"


@pytest.mark.django_db
def test_duplicate_active_attempt_is_prevented(
    auth_client, student_user, enrollment, published_quiz
):
    client = auth_client(student_user)
    first = client.post(f"/api/v1/quizzes/{published_quiz.id}/attempts/")
    assert first.status_code == status.HTTP_201_CREATED
    second = client.post(f"/api/v1/quizzes/{published_quiz.id}/attempts/")
    assert second.status_code == status.HTTP_409_CONFLICT
    assert second.json().get("code") == "QUIZ_ATTEMPT_ALREADY_ACTIVE"


@pytest.mark.django_db
def test_attempt_number_increments_safely(
    auth_client, student_user, enrollment, classroom, lesson, teacher_user, topic
):
    quiz = make_published_quiz(classroom, lesson, teacher_user, topic, attempt_limit=2)[0]
    client = auth_client(student_user)
    first = client.post(f"/api/v1/quizzes/{quiz.id}/attempts/")
    assert first.json()["attempt_number"] == 1
    client.post(f"/api/v1/attempts/{first.json()['id']}/submit/")
    second = client.post(f"/api/v1/quizzes/{quiz.id}/attempts/")
    assert second.status_code == status.HTTP_201_CREATED
    assert second.json()["attempt_number"] == 2


@pytest.mark.django_db
def test_expires_at_is_calculated_from_time_limit(
    auth_client, student_user, enrollment, classroom, lesson, teacher_user, topic
):
    quiz = make_published_quiz(classroom, lesson, teacher_user, topic, time_limit_minutes=15)[0]
    client = auth_client(student_user)
    response = client.post(f"/api/v1/quizzes/{quiz.id}/attempts/")
    body = response.json()
    assert body["expires_at"] is not None
    attempt = quiz.attempts.get(pk=body["id"])
    delta = attempt.expires_at - attempt.started_at
    assert abs(delta.total_seconds() - 15 * 60) < 5


@pytest.mark.django_db
def test_started_attempt_is_visible_to_owner(
    auth_client, student_user, published_quiz, started_attempt
):
    client = auth_client(student_user)
    response = client.get(f"/api/v1/attempts/{started_attempt.id}/")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == AttemptStatus.IN_PROGRESS


@pytest.mark.django_db
def test_other_student_cannot_see_attempt(
    auth_client, second_student, published_quiz, started_attempt
):
    client = auth_client(second_student)
    response = client.get(f"/api/v1/attempts/{started_attempt.id}/")
    assert response.status_code == status.HTTP_404_NOT_FOUND