import pytest
from django.utils import timezone
from rest_framework import status

from apps.lessons.models import LessonStatus
from apps.quizzes.models import QuizStatus, ReviewStatus
from apps.quizzes.tests.conftest import make_mc_question, make_numeric_question, make_quiz


def _payload(classroom_id, lesson_id, **overrides):
    payload = {"lesson": lesson_id, "classroom": classroom_id, "title": "Linear Equations Check"}
    payload.update(overrides)
    return payload


@pytest.mark.django_db
def test_teacher_can_create_quiz_in_owned_classroom(auth_client, teacher_user, classroom, lesson):
    client = auth_client(teacher_user)
    response = client.post(
        "/api/v1/quizzes/",
        _payload(classroom.id, lesson.id),
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    body = response.json()
    assert body["status"] == QuizStatus.DRAFT
    assert body["classroom"] == classroom.id
    assert body["lesson"] == lesson.id


@pytest.mark.django_db
def test_teacher_cannot_create_quiz_in_another_teachers_classroom(
    auth_client, second_teacher, classroom, lesson, topic
):
    client = auth_client(second_teacher)
    response = client.post(
        "/api/v1/quizzes/",
        _payload(classroom.id, lesson.id),
        format="json",
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_student_cannot_create_quiz(auth_client, student_user, classroom, lesson, enrollment):
    client = auth_client(student_user)
    response = client.post(
        "/api/v1/quizzes/",
        _payload(classroom.id, lesson.id),
        format="json",
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_quiz_lesson_must_belong_to_same_classroom(
    auth_client, teacher_user, classroom, other_classroom, topic
):
    from apps.quizzes.tests.conftest import make_lesson

    other_lesson = make_lesson(other_classroom, teacher_user, topic)
    client = auth_client(teacher_user)
    response = client.post(
        "/api/v1/quizzes/",
        _payload(classroom.id, other_lesson.id),
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_attempt_limit_validation(auth_client, teacher_user, classroom, lesson):
    client = auth_client(teacher_user)
    response = client.post(
        "/api/v1/quizzes/",
        _payload(classroom.id, lesson.id, attempt_limit=0),
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_passing_score_must_be_between_0_and_100(auth_client, teacher_user, classroom, lesson):
    client = auth_client(teacher_user)
    for bad in (-1, 101):
        response = client.post(
            "/api/v1/quizzes/",
            _payload(classroom.id, lesson.id, passing_score=bad),
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_draft_lesson_blocks_publication(
    auth_client, teacher_user, classroom, draft_lesson, topic, quiz
):
    draft_lesson.status = LessonStatus.DRAFT
    draft_lesson.save()
    quiz.lesson = draft_lesson
    quiz.save()
    client = auth_client(teacher_user)
    response = client.post(f"/api/v1/quizzes/{quiz.id}/publish/")
    assert response.status_code == status.HTTP_409_CONFLICT
    assert response.json().get("code") == "LESSON_NOT_PUBLISHED"
    quiz.refresh_from_db()
    assert quiz.status == QuizStatus.DRAFT


@pytest.mark.django_db
def test_quiz_cannot_publish_with_zero_questions(auth_client, teacher_user, quiz):
    client = auth_client(teacher_user)
    response = client.post(f"/api/v1/quizzes/{quiz.id}/publish/")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_quiz_cannot_publish_with_unapproved_questions(
    auth_client, teacher_user, topic, quiz
):
    make_mc_question(quiz, topic, review_status=ReviewStatus.DRAFT)
    client = auth_client(teacher_user)
    response = client.post(f"/api/v1/quizzes/{quiz.id}/publish/")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert response.json().get("code") == "QUESTION_NOT_APPROVED"
    quiz.refresh_from_db()
    assert quiz.status == QuizStatus.DRAFT


@pytest.mark.django_db
def test_quiz_publishes_successfully_with_valid_approved_questions(
    auth_client, teacher_user, topic, quiz
):
    make_mc_question(quiz, topic)
    make_numeric_question(quiz, topic)
    client = auth_client(teacher_user)
    response = client.post(f"/api/v1/quizzes/{quiz.id}/publish/")
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["status"] == QuizStatus.PUBLISHED
    assert body["published_at"] is not None
    quiz.refresh_from_db()
    assert quiz.published_at is not None


@pytest.mark.django_db
def test_republish_keeps_original_published_at(
    auth_client, teacher_user, topic, quiz
):
    make_mc_question(quiz, topic)
    make_numeric_question(quiz, topic)
    client = auth_client(teacher_user)
    client.post(f"/api/v1/quizzes/{quiz.id}/publish/")
    quiz.refresh_from_db()
    original = quiz.published_at
    quiz.status = QuizStatus.DRAFT
    quiz.save()
    response = client.post(f"/api/v1/quizzes/{quiz.id}/publish/")
    assert response.status_code == status.HTTP_200_OK
    quiz.refresh_from_db()
    assert quiz.published_at == original


@pytest.mark.django_db
def test_teacher_cannot_manage_another_teachers_quiz(auth_client, second_teacher, quiz):
    client = auth_client(second_teacher)
    assert client.get(f"/api/v1/quizzes/{quiz.id}/").status_code == status.HTTP_404_NOT_FOUND
    assert (
        client.patch(f"/api/v1/quizzes/{quiz.id}/", {"title": "Hacked"}, format="json").status_code
        == status.HTTP_404_NOT_FOUND
    )
    assert (
        client.post(f"/api/v1/quizzes/{quiz.id}/publish/").status_code == status.HTTP_404_NOT_FOUND
    )
    assert (
        client.post(f"/api/v1/quizzes/{quiz.id}/archive/").status_code == status.HTTP_404_NOT_FOUND
    )


@pytest.mark.django_db
def test_teacher_sees_own_drafts_and_archived(
    auth_client, teacher_user, classroom, lesson, topic, quiz
):
    archived = quiz
    archived.status = QuizStatus.ARCHIVED
    archived.save()

    from apps.quizzes.tests.conftest import make_quiz

    published = make_quiz(classroom, lesson, teacher_user, status=QuizStatus.PUBLISHED)
    make_mc_question(published, topic)
    make_numeric_question(published, topic)
    published.published_at = timezone.now()
    published.save(update_fields=["published_at"])

    client = auth_client(teacher_user)
    response = client.get("/api/v1/quizzes/")
    assert response.status_code == status.HTTP_200_OK
    ids = {item["id"] for item in response.json()["results"]}
    assert quiz.id in ids
    assert published.id in ids


@pytest.mark.django_db
def test_student_cannot_see_draft_or_archived_quiz(
    auth_client, student_user, classroom, lesson, topic, quiz, enrollment, teacher_user
):
    draft = quiz

    archived_quiz = make_quiz(classroom, lesson, teacher_user, status=QuizStatus.ARCHIVED)

    published = make_quiz(classroom, lesson, teacher_user, status=QuizStatus.PUBLISHED)
    make_mc_question(published, topic)
    make_numeric_question(published, topic)

    client = auth_client(student_user)
    assert client.get(f"/api/v1/quizzes/{draft.id}/").status_code == status.HTTP_404_NOT_FOUND
    assert (
        client.get(f"/api/v1/quizzes/{archived_quiz.id}/").status_code
        == status.HTTP_404_NOT_FOUND
    )
    response = client.get("/api/v1/quizzes/")
    ids = {item["id"] for item in response.json()["results"]}
    assert draft.id not in ids
    assert archived_quiz.id not in ids
    assert published.id in ids


@pytest.mark.django_db
def test_student_cannot_see_quiz_in_classroom_without_enrollment(
    auth_client, second_student, classroom, published_quiz
):
    client = auth_client(second_student)
    response = client.get(f"/api/v1/quizzes/{published_quiz.id}/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_archiving_hides_quiz_from_students(
    auth_client, student_user, classroom, enrollment, published_quiz, teacher_user
):
    client = auth_client(teacher_user)
    response = client.post(f"/api/v1/quizzes/{published_quiz.id}/archive/")
    assert response.status_code == status.HTTP_200_OK

    student_client = auth_client(student_user)
    assert (
        student_client.get(f"/api/v1/quizzes/{published_quiz.id}/").status_code
        == status.HTTP_404_NOT_FOUND
    )