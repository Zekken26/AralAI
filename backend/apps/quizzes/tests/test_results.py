import pytest
from rest_framework import status

from apps.quizzes.models import AttemptStatus, QuizStatus
from apps.quizzes.tests.conftest import create_attempt


def _submit_attempt(client, quiz, mc, right, numeric):
    attempt_id = client.post(f"/api/v1/quizzes/{quiz.id}/attempts/").json()["id"]
    client.put(
        f"/api/v1/attempts/{attempt_id}/answers/{mc.id}/",
        {"selected_choice": right.id},
        format="json",
    )
    client.put(
        f"/api/v1/attempts/{attempt_id}/answers/{numeric.id}/",
        {"numeric_response": 4},
        format="json",
    )
    response = client.post(f"/api/v1/attempts/{attempt_id}/submit/")
    assert response.status_code == status.HTTP_200_OK
    return attempt_id


@pytest.fixture
def submitted_attempt_id(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(student_user)
    return _submit_attempt(client, quiz, mc, right, numeric)


@pytest.mark.django_db
def test_student_can_view_own_submitted_result(
    auth_client, student_user, enrollment, published_quiz_data, submitted_attempt_id
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(student_user)
    response = client.get(f"/api/v1/attempts/{submitted_attempt_id}/results/")
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["status"] == AttemptStatus.SUBMITTED
    assert body["passed"] is True
    assert float(body["score"]) == 100
    result = {item["question"]: item for item in body["questions"]}
    assert result[mc.id]["correct_choice"] == right.id
    assert result[numeric.id]["numeric_answer"] == 4


@pytest.mark.django_db
def test_student_cannot_view_another_students_result(
    auth_client, second_student, published_quiz_data, submitted_attempt_id
):
    client = auth_client(second_student)
    response = client.get(f"/api/v1/attempts/{submitted_attempt_id}/results/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_teacher_can_view_attempts_from_owned_classroom(
    auth_client, teacher_user, student_user, published_quiz_data, submitted_attempt_id
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(teacher_user)
    response = client.get(f"/api/v1/quizzes/{quiz.id}/attempts/")
    assert response.status_code == status.HTTP_200_OK
    results = response.json()["results"]
    assert len(results) == 1
    assert results[0]["id"] == submitted_attempt_id
    assert results[0]["student"]["id"] == student_user.id


@pytest.mark.django_db
def test_unrelated_teacher_cannot_view_attempts(
    auth_client, second_teacher, published_quiz_data, submitted_attempt_id
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(second_teacher)
    response = client.get(f"/api/v1/quizzes/{quiz.id}/attempts/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_teacher_attempt_payload_has_only_safe_student_fields(
    auth_client, teacher_user, published_quiz_data, submitted_attempt_id
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(teacher_user)
    response = client.get(f"/api/v1/quizzes/{quiz.id}/attempts/")
    student_payload = response.json()["results"][0]["student"]
    assert "password" not in str(response.json())
    for field in ("email", "role", "is_superuser", "groups", "user_permissions", "is_staff"):
        assert field not in student_payload


@pytest.mark.django_db
def test_pre_submission_payload_hides_correct_answers(
    auth_client, student_user, enrollment, published_quiz_data, started_attempt
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(student_user)
    attempts_response = client.get(f"/api/v1/attempts/{started_attempt.id}/")
    body = attempts_response.json()
    assert "is_correct" not in str(body)
    assert "points_awarded" not in str(body)
    for answer in body["answers"]:
        assert "is_correct" not in answer
        assert "points_awarded" not in answer


@pytest.mark.django_db
def test_post_submission_result_includes_explanations_and_correct_answers(
    auth_client, student_user, enrollment, published_quiz_data, submitted_attempt_id
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    mc.explanation = "Because subtracting 4 then dividing by 2 gives 4."
    mc.save()
    client = auth_client(student_user)
    body = client.get(f"/api/v1/attempts/{submitted_attempt_id}/results/").json()
    result = {item["question"]: item for item in body["questions"]}
    assert result[mc.id]["explanation"] == "Because subtracting 4 then dividing by 2 gives 4."
    assert result[mc.id]["correct_choice"] == right.id
    assert result[numeric.id]["numeric_answer"] == 4


@pytest.mark.django_db
def test_response_does_not_expose_password_or_tokens(
    auth_client, student_user, enrollment, published_quiz_data, submitted_attempt_id
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(student_user)
    for url in (
        f"/api/v1/attempts/{submitted_attempt_id}/results/",
        "/api/v1/students/me/attempts/",
        "/api/v1/students/me/quizzes/",
    ):
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "password" not in str(response.json()).lower()
        assert "refresh" not in str(response.json()).lower()
        assert '"access"' not in str(response.json())


@pytest.mark.django_db
def test_historical_result_survives_archive(
    auth_client, student_user, teacher_user, enrollment, published_quiz,
    published_quiz_data, submitted_attempt_id, classroom
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    teacher_client = auth_client(teacher_user)
    assert teacher_client.post(f"/api/v1/quizzes/{quiz.id}/archive/").status_code == status.HTTP_200_OK

    student_client = auth_client(student_user)
    assert (
        student_client.get(f"/api/v1/quizzes/{quiz.id}/").status_code == status.HTTP_404_NOT_FOUND
    )
    assert (
        student_client.get(f"/api/v1/attempts/{submitted_attempt_id}/results/").status_code
        == status.HTTP_200_OK
    )


@pytest.mark.django_db
def test_results_require_submission(
    auth_client, student_user, enrollment, published_quiz, started_attempt
):
    client = auth_client(student_user)
    response = client.get(f"/api/v1/attempts/{started_attempt.id}/results/")
    assert response.status_code == status.HTTP_409_CONFLICT
    assert response.json().get("code") == "QUIZ_ATTEMPT_NOT_SUBMITTED"


@pytest.mark.django_db
def test_results_summary_for_owner(
    auth_client, teacher_user, published_quiz_data, submitted_attempt_id
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(teacher_user)
    response = client.get(f"/api/v1/quizzes/{quiz.id}/results-summary/")
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["total_attempts"] == 1
    assert body["submitted_attempts"] == 1
    assert body["students"][0]["attempts"] == 1
    assert body["students"][0]["passed_attempts"] == 1


@pytest.mark.django_db
def test_results_summary_hides_unrelated_teacher(
    auth_client, second_teacher, published_quiz_data, submitted_attempt_id
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(second_teacher)
    response = client.get(f"/api/v1/quizzes/{quiz.id}/results-summary/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_classroom_quiz_results(
    auth_client, teacher_user, classroom, published_quiz_data, submitted_attempt_id
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(teacher_user)
    response = client.get(f"/api/v1/classrooms/{classroom.id}/quiz-results/")
    assert response.status_code == status.HTTP_200_OK
    results = response.json()["results"]
    row = next(item for item in results if item["quiz"] == quiz.id)
    assert row["total_attempts"] == 1
    assert row["submitted_attempts"] == 1
    assert float(row["average_score"]) == 100