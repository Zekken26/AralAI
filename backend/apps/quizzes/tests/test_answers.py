from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework import status

from apps.quizzes.models import AttemptStatus, StudentAnswer
from apps.quizzes.tests.conftest import create_attempt, make_published_quiz


@pytest.fixture
def active_attempt(auth_client, student_user, enrollment, published_quiz):
    client = auth_client(student_user)
    response = client.post(f"/api/v1/quizzes/{published_quiz.id}/attempts/")
    return response.json()["id"]


@pytest.mark.django_db
def test_student_can_save_multiple_choice_answer(
    auth_client, student_user, enrollment, published_quiz, mc_correct_choice, active_attempt
):
    client = auth_client(student_user)
    response = client.put(
        f"/api/v1/attempts/{active_attempt}/answers/{mc_correct_choice.question_id}/",
        {"selected_choice": mc_correct_choice.id},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["selected_choice"] == mc_correct_choice.id
    answer = StudentAnswer.objects.get(attempt_id=active_attempt)
    assert answer.is_correct is None
    assert answer.points_awarded is None


@pytest.mark.django_db
def test_choice_must_belong_to_question(
    auth_client, student_user, enrollment, published_quiz, mc_correct_choice, active_attempt
):
    from apps.quizzes.tests.conftest import make_mc_question

    foreign_question, _, foreign_correct = make_mc_question(published_quiz, published_quiz.lesson.topic)
    client = auth_client(student_user)
    response = client.put(
        f"/api/v1/attempts/{active_attempt}/answers/{mc_correct_choice.question_id}/",
        {"selected_choice": foreign_correct.id},
        format="json",
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert response.json().get("code") == "CHOICE_NOT_IN_QUESTION"


@pytest.mark.django_db
def test_student_can_save_numeric_answer(
    auth_client, student_user, enrollment, published_quiz, numeric_question, active_attempt
):
    client = auth_client(student_user)
    response = client.put(
        f"/api/v1/attempts/{active_attempt}/answers/{numeric_question.id}/",
        {"numeric_response": 4.12},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    answer = StudentAnswer.objects.get(attempt_id=active_attempt)
    assert float(answer.numeric_response) == 4.12


@pytest.mark.django_db
def test_invalid_answer_type_is_rejected(
    auth_client, student_user, enrollment, published_quiz, mc_correct_choice, active_attempt
):
    client = auth_client(student_user)
    response = client.put(
        f"/api/v1/attempts/{active_attempt}/answers/{mc_correct_choice.question_id}/",
        {"numeric_response": 3},
        format="json",
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert response.json().get("code") == "INVALID_ANSWER_FORMAT"


@pytest.mark.django_db
def test_answer_update_overwrites_previous(
    auth_client, student_user, enrollment, published_quiz, mc_correct_choice, mc_wrong_choice, active_attempt
):
    client = auth_client(student_user)
    url = f"/api/v1/attempts/{active_attempt}/answers/{mc_correct_choice.question_id}/"
    client.put(url, {"selected_choice": mc_wrong_choice.id}, format="json")
    client.put(url, {"selected_choice": mc_correct_choice.id}, format="json")
    answer = StudentAnswer.objects.get(attempt_id=active_attempt)
    assert answer.selected_choice_id == mc_correct_choice.id


@pytest.mark.django_db
def test_question_from_another_quiz_rejected(
    auth_client, student_user, enrollment, classroom, lesson, teacher_user, topic, active_attempt
):
    other_quiz, other_mc, _, _, _ = make_published_quiz(classroom, lesson, teacher_user, topic)
    client = auth_client(student_user)
    response = client.put(
        f"/api/v1/attempts/{active_attempt}/answers/{other_mc.id}/",
        {"selected_choice": other_mc.choices.first().id},
        format="json",
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert response.json().get("code") == "QUESTION_NOT_IN_QUIZ"


@pytest.mark.django_db
def test_another_students_attempt_cannot_be_modified(
    auth_client, second_student, published_quiz, mc_correct_choice, active_attempt
):
    client = auth_client(second_student)
    response = client.put(
        f"/api/v1/attempts/{active_attempt}/answers/{mc_correct_choice.question_id}/",
        {"selected_choice": mc_correct_choice.id},
        format="json",
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_submitted_attempt_cannot_be_changed(
    auth_client, student_user, enrollment, published_quiz, mc_correct_choice, started_attempt
):
    from apps.quizzes import services

    services.submit_quiz_attempt(attempt=started_attempt, student=student_user)
    client = auth_client(student_user)
    response = client.put(
        f"/api/v1/attempts/{started_attempt.id}/answers/{mc_correct_choice.question_id}/",
        {"selected_choice": mc_correct_choice.id},
        format="json",
    )
    assert response.status_code == status.HTTP_409_CONFLICT
    assert response.json().get("code") == "QUIZ_ATTEMPT_ALREADY_SUBMITTED"


@pytest.mark.django_db
def test_expired_attempt_cannot_be_changed(
    auth_client, student_user, published_quiz, mc_correct_choice, started_attempt
):
    started_attempt.expires_at = timezone.now() - timedelta(minutes=1)
    started_attempt.save()
    client = auth_client(student_user)
    response = client.put(
        f"/api/v1/attempts/{started_attempt.id}/answers/{mc_correct_choice.question_id}/",
        {"selected_choice": mc_correct_choice.id},
        format="json",
    )
    assert response.status_code == status.HTTP_409_CONFLICT
    assert response.json().get("code") == "QUIZ_ATTEMPT_EXPIRED"
    started_attempt.refresh_from_db()
    assert started_attempt.status == AttemptStatus.EXPIRED


@pytest.mark.django_db
def test_client_cannot_set_correctness_or_awarded_points(
    auth_client, student_user, enrollment, published_quiz, mc_correct_choice, active_attempt
):
    client = auth_client(student_user)
    response = client.put(
        f"/api/v1/attempts/{active_attempt}/answers/{mc_correct_choice.question_id}/",
        {
            "selected_choice": mc_correct_choice.id,
            "is_correct": False,
            "points_awarded": 0,
        },
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    answer = StudentAnswer.objects.get(attempt_id=active_attempt)
    assert answer.is_correct is None
    assert answer.points_awarded is None