from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework import status

from apps.quizzes.models import AttemptStatus, QuizAttempt, StudentAnswer
from apps.quizzes.tests.conftest import create_attempt
from apps.quizzes import services


@pytest.fixture
def start(auth_client, student_user, enrollment, published_quiz):
    """Start an attempt through the API and return (client, attempt_id)."""

    def _start():
        client = auth_client(student_user)
        return client, client.post(f"/api/v1/quizzes/{published_quiz.id}/attempts/").json()["id"]

    return _start


UP = "/api/v1/attempts/{attempt_id}/answers/{question_id}/"


@pytest.mark.django_db
def test_correct_multiple_choice_receives_full_points(
    auth_client, student_user, enrollment, published_quiz_data, start
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client, attempt_id = start()
    client.put(
        UP.format(attempt_id=attempt_id, question_id=mc.id),
        {"selected_choice": right.id},
        format="json",
    )
    response = client.post(f"/api/v1/attempts/{attempt_id}/submit/")
    body = response.json()
    assert body["status"] == AttemptStatus.SUBMITTED
    result = {item["question"]: item for item in body["questions"]}
    assert result[mc.id]["is_correct"] is True
    assert float(result[mc.id]["points_awarded"]) == float(mc.points)
    assert float(body["earned_points"]) == float(mc.points)
    assert float(body["maximum_points"]) == float(mc.points) + float(numeric.points)


@pytest.mark.django_db
def test_incorrect_multiple_choice_receives_zero(
    auth_client, student_user, enrollment, published_quiz_data, start
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client, attempt_id = start()
    client.put(
        UP.format(attempt_id=attempt_id, question_id=mc.id),
        {"selected_choice": wrong.id},
        format="json",
    )
    body = client.post(f"/api/v1/attempts/{attempt_id}/submit/").json()
    result = {item["question"]: item for item in body["questions"]}
    assert result[mc.id]["is_correct"] is False
    assert float(result[mc.id]["points_awarded"]) == 0


@pytest.mark.django_db
def test_numeric_exact_answer_is_correct(
    auth_client, student_user, enrollment, published_quiz_data, start
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client, attempt_id = start()
    client.put(
        UP.format(attempt_id=attempt_id, question_id=numeric.id),
        {"numeric_response": 4},
        format="json",
    )
    body = client.post(f"/api/v1/attempts/{attempt_id}/submit/").json()
    result = {item["question"]: item for item in body["questions"]}
    assert result[numeric.id]["is_correct"] is True
    assert float(result[numeric.id]["points_awarded"]) == float(numeric.points)


@pytest.mark.django_db
def test_numeric_answer_within_tolerance_is_correct(
    auth_client, student_user, enrollment, published_quiz_data, start
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    numeric.numeric_tolerance = 0.5
    numeric.save()
    client, attempt_id = start()
    client.put(
        UP.format(attempt_id=attempt_id, question_id=numeric.id),
        {"numeric_response": 4.4},
        format="json",
    )
    body = client.post(f"/api/v1/attempts/{attempt_id}/submit/").json()
    result = {item["question"]: item for item in body["questions"]}
    assert result[numeric.id]["is_correct"] is True


@pytest.mark.django_db
def test_numeric_answer_outside_tolerance_is_incorrect(
    auth_client, student_user, enrollment, published_quiz_data, start
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client, attempt_id = start()
    client.put(
        UP.format(attempt_id=attempt_id, question_id=numeric.id),
        {"numeric_response": 4.05},
        format="json",
    )
    body = client.post(f"/api/v1/attempts/{attempt_id}/submit/").json()
    result = {item["question"]: item for item in body["questions"]}
    assert result[numeric.id]["is_correct"] is False
    assert float(result[numeric.id]["points_awarded"]) == 0


@pytest.mark.django_db
def test_unanswered_question_receives_zero(
    auth_client, student_user, enrollment, published_quiz_data, start
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client, attempt_id = start()
    body = client.post(f"/api/v1/attempts/{attempt_id}/submit/").json()
    assert float(body["earned_points"]) == 0
    assert float(body["maximum_points"]) == float(mc.points) + float(numeric.points)
    assert float(body["score"]) == 0


@pytest.mark.django_db
def test_total_score_calculated_correctly(
    auth_client, student_user, enrollment, published_quiz_data, start
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client, attempt_id = start()
    client.put(
        UP.format(attempt_id=attempt_id, question_id=mc.id),
        {"selected_choice": right.id},
        format="json",
    )
    client.put(
        UP.format(attempt_id=attempt_id, question_id=numeric.id),
        {"numeric_response": 4},
        format="json",
    )
    body = client.post(f"/api/v1/attempts/{attempt_id}/submit/").json()
    assert float(body["score"]) == 100
    assert body["passed"] is True


@pytest.mark.django_db
def test_passed_is_false_below_passing_score(
    auth_client, student_user, enrollment, classroom, lesson, teacher_user, topic
):
    from apps.quizzes.tests.conftest import make_published_quiz

    quiz, mc, wrong, right, numeric = make_published_quiz(
        classroom, lesson, teacher_user, topic, passing_score=80
    )
    client = auth_client(student_user)
    attempt_id = client.post(f"/api/v1/quizzes/{quiz.id}/attempts/").json()["id"]
    client.put(
        UP.format(attempt_id=attempt_id, question_id=mc.id),
        {"selected_choice": right.id},
        format="json",
    )
    body = client.post(f"/api/v1/attempts/{attempt_id}/submit/").json()
    assert body["passed"] is False


@pytest.mark.django_db
def test_submit_is_idempotently_protected(
    auth_client, student_user, enrollment, published_quiz, started_attempt
):
    client = auth_client(student_user)
    first = client.post(f"/api/v1/attempts/{started_attempt.id}/submit/")
    assert first.status_code == status.HTTP_200_OK
    second = client.post(f"/api/v1/attempts/{started_attempt.id}/submit/")
    assert second.status_code == status.HTTP_409_CONFLICT
    assert second.json().get("code") == "QUIZ_ATTEMPT_ALREADY_SUBMITTED"


@pytest.mark.django_db
def test_expired_attempt_marked_expired_and_cannot_submit(
    auth_client, student_user, enrollment, published_quiz, started_attempt
):
    started_attempt.expires_at = timezone.now() - timedelta(minutes=1)
    started_attempt.save()
    client = auth_client(student_user)
    response = client.post(f"/api/v1/attempts/{started_attempt.id}/submit/")
    assert response.status_code == status.HTTP_409_CONFLICT
    assert response.json().get("code") == "QUIZ_ATTEMPT_EXPIRED"
    started_attempt.refresh_from_db()
    assert started_attempt.status == AttemptStatus.EXPIRED
    assert started_attempt.score is None


@pytest.mark.django_db
def test_server_ignores_client_score_manipulation(
    auth_client, student_user, enrollment, published_quiz_data, start
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client, attempt_id = start()
    client.put(
        UP.format(attempt_id=attempt_id, question_id=mc.id),
        {"selected_choice": wrong.id, "is_correct": True, "points_awarded": 99, "score": 99},
        format="json",
    )
    body = client.post(f"/api/v1/attempts/{attempt_id}/submit/").json()
    result = {item["question"]: item for item in body["questions"]}
    assert result[mc.id]["is_correct"] is False
    assert float(result[mc.id]["points_awarded"]) == 0
    assert float(body["score"]) == 0


@pytest.mark.django_db
def test_expired_attempt_attempt_number_allows_retake(
    auth_client, student_user, enrollment, classroom, lesson, teacher_user, topic
):
    from apps.quizzes.tests.conftest import make_published_quiz

    quiz, mc, wrong, right, numeric = make_published_quiz(
        classroom, lesson, teacher_user, topic, attempt_limit=2
    )
    client = auth_client(student_user)
    attempt_id = client.post(f"/api/v1/quizzes/{quiz.id}/attempts/").json()["id"]
    attempt = QuizAttempt.objects.get(pk=attempt_id)
    attempt.expires_at = timezone.now() - timedelta(minutes=1)
    attempt.save()

    second = client.post(f"/api/v1/quizzes/{quiz.id}/attempts/")
    assert second.status_code == status.HTTP_201_CREATED
    assert second.json()["attempt_number"] == 2