import pytest
from django.db import IntegrityError, transaction

from apps.progress.models import (
    MasteryHistory,
    MasteryStatus,
    Recommendation,
    RecommendationStatus,
    RecommendationType,
    TopicMastery,
)
from apps.quizzes.models import StudentAnswer
from apps.progress.tests.conftest import make_submitted_attempt


@pytest.mark.django_db
def test_unique_student_topic_mastery(student_user, topic):
    TopicMastery.objects.create(student=student_user, topic=topic, mastery_score=50)
    with pytest.raises(IntegrityError), transaction.atomic():
        TopicMastery.objects.create(student=student_user, topic=topic, mastery_score=80)


@pytest.mark.django_db
def test_mastery_score_must_stay_within_0_100(student_user, topic):
    with pytest.raises(IntegrityError), transaction.atomic():
        TopicMastery.objects.create(student=student_user, topic=topic, mastery_score=150)
    with pytest.raises(IntegrityError), transaction.atomic():
        TopicMastery.objects.create(student=student_user, topic=topic, mastery_score=-5)


@pytest.mark.django_db
def test_mastery_score_bounds_accepted(student_user, topic, topic2):
    TopicMastery.objects.create(student=student_user, topic=topic, mastery_score=0)
    TopicMastery.objects.create(student=student_user, topic=topic2, mastery_score=100)
    assert TopicMastery.objects.count() == 2


@pytest.mark.django_db
def test_unique_active_recommendation_per_student_topic_type(student_user, topic):
    Recommendation.objects.create(
        student=student_user,
        topic=topic,
        recommendation_type=RecommendationType.REVIEW_LESSON,
        title="Review",
        reason="Reason",
    )
    with pytest.raises(IntegrityError), transaction.atomic():
        Recommendation.objects.create(
            student=student_user,
            topic=topic,
            recommendation_type=RecommendationType.REVIEW_LESSON,
            title="Review again",
            reason="Reason",
        )


@pytest.mark.django_db
def test_completed_and_active_same_type_coexist(student_user, topic):
    first = Recommendation.objects.create(
        student=student_user,
        topic=topic,
        recommendation_type=RecommendationType.REVIEW_LESSON,
        title="Review",
        reason="Reason",
    )
    first.status = RecommendationStatus.COMPLETED
    first.save()
    Recommendation.objects.create(
        student=student_user,
        topic=topic,
        recommendation_type=RecommendationType.REVIEW_LESSON,
        title="Review again",
        reason="Reason",
    )


@pytest.mark.django_db
def test_history_unique_per_mastery_and_attempt(
    student_user, topic, mc_question, numeric_question
):
    mastery = TopicMastery.objects.create(student=student_user, topic=topic, mastery_score=50)
    attempt = make_submitted_attempt(
        student_user,
        mc_question.quiz,
        answers=[(mc_question, True, 5), (numeric_question, False, 0)],
    )
    MasteryHistory.objects.create(
        topic_mastery=mastery,
        quiz_attempt=attempt,
        previous_score=0,
        new_score=50,
        score_change=50,
        reason="Reason",
    )
    with pytest.raises(IntegrityError), transaction.atomic():
        MasteryHistory.objects.create(
            topic_mastery=mastery,
            quiz_attempt=attempt,
            previous_score=0,
            new_score=50,
            score_change=50,
            reason="Reason",
        )


@pytest.mark.django_db
def test_topic_mastery_defaults(student_user, topic):
    mastery = TopicMastery.objects.create(student=student_user, topic=topic)
    assert mastery.mastery_score == 0
    assert mastery.status == MasteryStatus.NEEDS_SUPPORT
    assert mastery.independent_score == 100


@pytest.mark.django_db
def test_student_answer_topic_snapshot_defaults_to_null(
    student_user, mc_question, numeric_question
):
    attempt = make_submitted_attempt(
        student_user,
        mc_question.quiz,
        answers=[(mc_question, True, 5)],
    )
    answer = StudentAnswer.objects.get(attempt=attempt, question=mc_question)
    assert answer.topic_id == mc_question.topic_id
