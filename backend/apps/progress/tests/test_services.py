from datetime import timedelta
from decimal import Decimal
from unittest import mock

import pytest
from django.core.management import call_command
from django.utils import timezone

from apps.progress.models import (
    MasteryHistory,
    MasteryStatus,
    Recommendation,
    TopicMastery,
)
from apps.progress.services import (
    process_submitted_attempt,
    recalculate_topic_mastery,
    rebuild_student_mastery,
)
from apps.quizzes.models import AttemptStatus, Quiz, QuizStatus, StudentAnswer
from apps.progress.tests.conftest import (
    add_question,
    make_submitted_attempt,
    recompute_mastery,
    submit_via_api,
)


@pytest.mark.django_db
def test_submit_creates_mastery_with_expected_components(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(student_user)
    response = submit_via_api(
        client,
        quiz,
        {mc.id: {"selected_choice": right.id}},
    )
    assert response.status_code == 200
    assert response.json()["status"] == AttemptStatus.SUBMITTED

    mastery = TopicMastery.objects.get(student=student_user, topic_id=mc.topic_id)
    assert mastery.mastery_score == Decimal("52.00")
    assert mastery.status == MasteryStatus.DEVELOPING
    assert mastery.recent_accuracy == Decimal("20.00")
    assert mastery.difficulty_score == Decimal("100.00")
    assert mastery.consistency_score == Decimal("100.00")
    assert mastery.independent_score == Decimal("100.00")
    assert mastery.total_questions_answered == 1
    assert mastery.total_correct_answers == 1
    assert mastery.total_points_earned == Decimal("5.00")
    assert mastery.total_points_possible == Decimal("5.00")
    assert mastery.first_attempted_at is not None
    assert mastery.last_attempted_at == mastery.first_attempted_at


@pytest.mark.django_db
def test_submit_records_topic_snapshot_on_answer(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(student_user)
    submit_via_api(client, quiz, {mc.id: {"selected_choice": right.id}})
    answer = StudentAnswer.objects.get(attempt__student=student_user, question=mc)
    assert answer.topic_id == mc.topic_id


@pytest.mark.django_db
def test_submit_creates_first_history_entry_with_previous_zero(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(student_user)
    submit_via_api(client, quiz, {mc.id: {"selected_choice": right.id}})
    history = MasteryHistory.objects.get(topic_mastery__student=student_user)
    assert history.previous_score == Decimal("0")
    assert history.new_score == Decimal("52.00")
    assert history.score_change == Decimal("52.00")
    assert history.reason.startswith("Attempt #1")


@pytest.mark.django_db
def test_all_wrong_submission_is_needs_support(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(student_user)
    submit_via_api(
        client,
        quiz,
        {
            mc.id: {"selected_choice": wrong.id},
            numeric.id: {"numeric_response": 999},
        },
    )
    mastery = TopicMastery.objects.get(student=student_user, topic_id=mc.topic_id)
    assert mastery.mastery_score == Decimal("10.00")
    assert mastery.status == MasteryStatus.NEEDS_SUPPORT
    assert mastery.total_questions_answered == 2
    assert mastery.total_correct_answers == 0


@pytest.mark.django_db
def test_consistency_penalty_across_two_attempts(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(student_user)
    submit_via_api(
        client,
        quiz,
        {
            mc.id: {"selected_choice": wrong.id},
            numeric.id: {"numeric_response": 999},
        },
    )
    submit_via_api(
        client,
        quiz,
        {
            mc.id: {"selected_choice": right.id},
            numeric.id: {"numeric_response": 4},
        },
    )
    mastery = TopicMastery.objects.get(student=student_user, topic_id=mc.topic_id)
    assert mastery.total_questions_answered == 4
    assert mastery.total_correct_answers == 2
    assert mastery.total_points_earned == Decimal("10.00")
    assert mastery.total_points_possible == Decimal("20.00")
    assert mastery.mastery_score == Decimal("44.00")
    assert mastery.consistency_score == Decimal("0.00")

    entries = list(MasteryHistory.objects.filter(topic_mastery=mastery).order_by("created_at"))
    assert len(entries) == 2
    assert entries[0].previous_score == Decimal("0")
    assert entries[0].new_score == Decimal("10.00")
    assert entries[1].previous_score == Decimal("10.00")
    assert entries[1].new_score == Decimal("44.00")
    assert entries[1].score_change == Decimal("34.00")


@pytest.mark.django_db
def test_recent_window_limited_to_last_20_answers(
    student_user, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    extra = [add_question(quiz, mc.topic) for _ in range(6)]
    questions = [mc, numeric] + [q for q, _, _ in extra]
    for attempt_number in (1, 2):
        make_submitted_attempt(
            student_user,
            quiz,
            attempt_number=attempt_number,
            answers=[(q, True, q.points) for q in questions],
        )
    make_submitted_attempt(
        student_user,
        quiz,
        attempt_number=3,
        answers=[(q, False, 0) for q in questions],
    )
    recompute_mastery(student_user)
    mastery = TopicMastery.objects.get(student=student_user, topic_id=mc.topic_id)
    assert mastery.total_questions_answered == 24
    assert mastery.recent_accuracy == Decimal("60.00")
    assert mastery.difficulty_score == Decimal("60.00")
    assert mastery.mastery_score == Decimal("58.00")


@pytest.mark.django_db
def test_multi_topic_attempt_creates_mastery_per_topic(
    auth_client, student_user, enrollment, published_quiz_data, topic2
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    topic2_mc, _, topic2_right = add_question(quiz, topic2)
    client = auth_client(student_user)
    submit_via_api(
        client,
        quiz,
        {
            mc.id: {"selected_choice": right.id},
            topic2_mc.id: {"selected_choice": topic2_right.id},
        },
    )
    assert TopicMastery.objects.filter(student=student_user).count() == 2
    topic1_mastery = TopicMastery.objects.get(student=student_user, topic_id=mc.topic_id)
    topic2_mastery = TopicMastery.objects.get(student=student_user, topic_id=topic2.id)
    assert topic1_mastery.mastery_score == Decimal("52.00")
    assert topic2_mastery.mastery_score == Decimal("52.00")


@pytest.mark.django_db
def test_process_submitted_attempt_is_idempotent(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(student_user)
    response = submit_via_api(client, quiz, {mc.id: {"selected_choice": right.id}})
    attempt_id = response.json()["id"]

    mastery_before = TopicMastery.objects.get(student=student_user, topic_id=mc.topic_id)
    history_count = MasteryHistory.objects.count()
    recommendations = Recommendation.objects.count()

    assert process_submitted_attempt(attempt_id) is True
    assert MasteryHistory.objects.count() == history_count
    assert Recommendation.objects.count() == recommendations
    mastery_after = TopicMastery.objects.get(student=student_user, topic_id=mc.topic_id)
    assert mastery_after.mastery_score == mastery_before.mastery_score
    assert mastery_after.last_recalculated_at >= mastery_before.last_recalculated_at


@pytest.mark.django_db
def test_process_returns_none_for_unknown_or_unsubmitted_attempt(
    student_user, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    in_progress = make_submitted_attempt(
        student_user, quiz, answers=[(mc, True, 5)], status="IN_PROGRESS"
    )
    assert process_submitted_attempt(in_progress.id) is None
    assert process_submitted_attempt(999999) is None
    assert not TopicMastery.objects.exists()


@pytest.mark.django_db
def test_recommendation_failure_never_breaks_submission(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(student_user)
    with mock.patch(
        "apps.progress.services.generate_recommendations_for_topic",
        side_effect=RuntimeError("boom"),
    ):
        response = submit_via_api(client, quiz, {mc.id: {"selected_choice": right.id}})
    assert response.status_code == 200
    assert response.json()["status"] == AttemptStatus.SUBMITTED
    assert TopicMastery.objects.filter(student=student_user, topic_id=mc.topic_id).exists()


@pytest.mark.django_db
def test_archived_quiz_submissions_still_count(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(student_user)
    submit_via_api(client, quiz, {mc.id: {"selected_choice": right.id}})
    quiz.status = QuizStatus.ARCHIVED
    quiz.save()
    mastery = TopicMastery.objects.get(student=student_user, topic_id=mc.topic_id)
    assert mastery.mastery_score == Decimal("52.00")
    updated = TopicMastery.objects.get(pk=mastery.pk)
    assert updated.mastery_score == Decimal("52.00")


@pytest.mark.django_db
def test_moving_question_topic_does_not_rewrite_history(
    auth_client, student_user, enrollment, published_quiz_data, topic2
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(student_user)
    response = submit_via_api(client, quiz, {mc.id: {"selected_choice": right.id}})
    attempt_id = response.json()["id"]
    topic1_id = mc.topic_id
    mc.topic = topic2
    mc.save()
    assert process_submitted_attempt(attempt_id) is True
    topic1_mastery = TopicMastery.objects.get(student=student_user, topic_id=topic1_id)
    assert topic1_mastery.mastery_score == Decimal("52.00")
    assert not TopicMastery.objects.filter(student=student_user, topic_id=topic2.id).exists()


@pytest.mark.django_db
def test_recalculate_returns_none_without_answers(student_user, topic):
    assert recalculate_topic_mastery(student_user, topic.id) is None
    assert not TopicMastery.objects.exists()


@pytest.mark.django_db
def test_rebuild_student_mastery_is_idempotent_and_scoped(
    student_user, second_student, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(
        student_user,
        quiz,
        attempt_number=1,
        answers=[(mc, False, 0), (numeric, False, 0)],
        submitted_at=timezone.now() - timedelta(hours=2),
    )
    make_submitted_attempt(
        student_user,
        quiz,
        attempt_number=2,
        answers=[(mc, True, 5), (numeric, True, 5)],
        submitted_at=timezone.now(),
    )
    make_submitted_attempt(
        second_student,
        quiz,
        attempt_number=1,
        answers=[(mc, True, 5)],
        submitted_at=timezone.now(),
    )

    assert rebuild_student_mastery(student_id=student_user.id) == 2
    assert MasteryHistory.objects.count() == 2
    entries = list(
        MasteryHistory.objects.filter(topic_mastery__student=student_user).order_by("created_at")
    )
    assert entries[0].previous_score == Decimal("0")
    assert entries[0].new_score == Decimal("10.00")
    assert entries[1].previous_score == Decimal("10.00")
    assert entries[1].new_score == Decimal("44.00")

    assert rebuild_student_mastery(student_id=student_user.id) == 2
    assert MasteryHistory.objects.count() == 2

    assert rebuild_student_mastery() == 3
    assert MasteryHistory.objects.count() == 3


@pytest.mark.django_db
def test_rebuild_mastery_management_command(student_user, published_quiz_data):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(student_user, quiz, answers=[(mc, True, 5)])
    call_command("rebuild_mastery", student_id=student_user.id)
    assert MasteryHistory.objects.count() == 1
    call_command("rebuild_mastery", student_id=student_user.id)
    assert MasteryHistory.objects.count() == 1
