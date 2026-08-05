from decimal import Decimal

import pytest
from django.db import IntegrityError, transaction
from rest_framework import status

from apps.quizzes import services
from apps.quizzes.models import (
    AttemptStatus,
    Choice,
    QuizAttempt,
    QuizStatus,
    StudentAnswer,
)
from apps.quizzes.tests.conftest import create_attempt, make_published_quiz


@pytest.mark.django_db
def test_unique_answer_constraint_enforced(published_quiz, mc_question, student_user):
    attempt = create_attempt(published_quiz, student_user)
    first_choice = mc_question.choices.first()
    StudentAnswer.objects.create(attempt=attempt, question=mc_question, selected_choice=first_choice)
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            StudentAnswer.objects.create(attempt=attempt, question=mc_question, numeric_response=1)


@pytest.mark.django_db
def test_unique_active_attempt_rule_enforced(published_quiz, student_user):
    create_attempt(published_quiz, student_user, attempt_number=1)
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            create_attempt(published_quiz, student_user, attempt_number=2)


@pytest.mark.django_db
def test_unique_attempt_number_enforced(published_quiz, student_user):
    create_attempt(published_quiz, student_user, status=AttemptStatus.SUBMITTED, attempt_number=1)
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            create_attempt(published_quiz, student_user, status=AttemptStatus.SUBMITTED, attempt_number=1)


@pytest.mark.django_db
def test_unique_correct_choice_per_question_enforced(mc_question):
    existing = mc_question.choices.get(is_correct=True)
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            Choice.objects.create(question=mc_question, text="Another", is_correct=True, sequence_order=9)


@pytest.mark.django_db
def test_score_range_constraint_enforced(published_quiz, student_user):
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            QuizAttempt.objects.create(
                quiz=published_quiz,
                student=student_user,
                attempt_number=1,
                status=AttemptStatus.SUBMITTED,
                score=Decimal("150"),
            )


@pytest.mark.django_db
def test_duplicate_submission_prevented(published_quiz, student_user, started_attempt):
    services.submit_quiz_attempt(attempt=started_attempt, student=student_user)
    with pytest.raises(services.QuizAttemptAlreadySubmittedError):
        services.submit_quiz_attempt(attempt=started_attempt, student=student_user)


@pytest.mark.django_db
def test_attempt_consistent_when_scoring_fails(
    auth_client, student_user, enrollment, published_quiz_data, monkeypatch
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(student_user)
    attempt_id = client.post(f"/api/v1/quizzes/{quiz.id}/attempts/").json()["id"]
    client.put(
        f"/api/v1/attempts/{attempt_id}/answers/{mc.id}/",
        {"selected_choice": right.id},
        format="json",
    )

    def boom(*args, **kwargs):
        raise RuntimeError("scoring exploded")

    monkeypatch.setattr(services, "calculate_attempt_score", boom)
    from rest_framework.test import APIClient

    raw_client = APIClient()
    raw_client.raise_request_exception = False
    raw_client.force_authenticate(student_user)
    response = raw_client.post(f"/api/v1/attempts/{attempt_id}/submit/")
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    attempt = QuizAttempt.objects.get(pk=attempt_id)
    assert attempt.status == AttemptStatus.IN_PROGRESS
    assert attempt.score is None
    answer = attempt.answers.get(question=mc)
    assert answer.is_correct is None
    assert answer.selected_choice_id == right.id


@pytest.mark.django_db
def test_start_attempt_rejects_expired_in_progress_attempt(
    auth_client, student_user, enrollment, classroom, lesson, teacher_user, topic
):
    from datetime import timedelta

    from django.utils import timezone

    quiz, mc, wrong, right, numeric = make_published_quiz(
        classroom, lesson, teacher_user, topic, attempt_limit=2
    )
    client = auth_client(student_user)
    first = client.post(f"/api/v1/quizzes/{quiz.id}/attempts/").json()["id"]
    QuizAttempt.objects.filter(pk=first).update(
        expires_at=timezone.now() - timedelta(minutes=1)
    )
    second = client.post(f"/api/v1/quizzes/{quiz.id}/attempts/")
    assert second.status_code == status.HTTP_201_CREATED
    assert second.json()["attempt_number"] == 2
    assert QuizAttempt.objects.get(pk=first).status == AttemptStatus.EXPIRED