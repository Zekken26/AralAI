from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from apps.lessons.models import LessonStatus
from apps.progress.models import (
    MasteryStatus,
    Recommendation,
    RecommendationPriority,
    RecommendationStatus,
    RecommendationType,
    TopicMastery,
)
from apps.progress.services import (
    complete_recommendation,
    dismiss_recommendation,
    generate_recommendations_for_student,
    generate_recommendations_for_topic,
)
from apps.progress.tests.conftest import (
    add_question,
    make_submitted_attempt,
    recompute_mastery,
    submit_via_api,
)


@pytest.mark.django_db
def test_needs_support_recommends_review_and_easy_practice(
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
    by_type = {r.recommendation_type: r for r in Recommendation.objects.all()}
    assert set(by_type) == {
        RecommendationType.REVIEW_LESSON,
        RecommendationType.EASY_PRACTICE,
    }
    assert by_type[RecommendationType.REVIEW_LESSON].priority == RecommendationPriority.HIGH
    assert by_type[RecommendationType.REVIEW_LESSON].target_lesson_id == quiz.lesson_id
    assert by_type[RecommendationType.REVIEW_LESSON].target_quiz_id is None
    assert by_type[RecommendationType.EASY_PRACTICE].priority == RecommendationPriority.HIGH
    assert by_type[RecommendationType.EASY_PRACTICE].target_quiz_id == quiz.id
    assert "10.00" in by_type[RecommendationType.REVIEW_LESSON].reason
    assert by_type[RecommendationType.REVIEW_LESSON].generated_from_attempt_id is not None


@pytest.mark.django_db
def test_developing_recommends_guided_practice_only_when_stable(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(student_user)
    submit_via_api(client, quiz, {mc.id: {"selected_choice": right.id}})
    recs = list(Recommendation.objects.all())
    assert [r.recommendation_type for r in recs] == [RecommendationType.GUIDED_PRACTICE]
    assert recs[0].priority == RecommendationPriority.MEDIUM
    assert recs[0].target_quiz_id == quiz.id


@pytest.mark.django_db
def test_declining_developing_recommends_lesson_review(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(student_user)
    submit_via_api(
        client,
        quiz,
        {
            mc.id: {"selected_choice": right.id},
            numeric.id: {"numeric_response": 4},
        },
    )
    submit_via_api(
        client,
        quiz,
        {
            mc.id: {"selected_choice": right.id},
            numeric.id: {"numeric_response": 999},
        },
    )
    mastery = TopicMastery.objects.get(student=student_user, topic_id=mc.topic_id)
    assert mastery.status == MasteryStatus.DEVELOPING
    by_type = {r.recommendation_type: r for r in Recommendation.objects.all()}
    assert set(by_type) == {
        RecommendationType.GUIDED_PRACTICE,
        RecommendationType.REVIEW_LESSON,
    }
    assert (
        by_type[RecommendationType.GUIDED_PRACTICE].status == RecommendationStatus.ACTIVE
    )
    assert (
        by_type[RecommendationType.GUIDED_PRACTICE].priority == RecommendationPriority.MEDIUM
    )
    assert by_type[RecommendationType.REVIEW_LESSON].priority == RecommendationPriority.MEDIUM
    assert by_type[RecommendationType.REVIEW_LESSON].status == RecommendationStatus.ACTIVE
    assert "declining" in by_type[RecommendationType.REVIEW_LESSON].reason


@pytest.mark.django_db
def test_proficient_recommends_mixed_practice(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    extra = [add_question(quiz, mc.topic) for _ in range(1)]
    third, _, third_right = extra[0]
    client = auth_client(student_user)
    submit_via_api(
        client,
        quiz,
        {
            mc.id: {"selected_choice": right.id},
            numeric.id: {"numeric_response": 4},
            third.id: {"selected_choice": third_right.id},
        },
    )
    mastery = TopicMastery.objects.get(student=student_user, topic_id=mc.topic_id)
    assert mastery.status == MasteryStatus.PROFICIENT
    assert mastery.mastery_score == Decimal("76.00")
    recs = list(Recommendation.objects.all())
    assert [r.recommendation_type for r in recs] == [RecommendationType.MIXED_PRACTICE]
    assert recs[0].priority == RecommendationPriority.LOW


@pytest.mark.django_db
def test_proficient_adds_spaced_review_when_due(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    third, _, third_right = add_question(quiz, mc.topic)
    client = auth_client(student_user)
    submit_via_api(
        client,
        quiz,
        {
            mc.id: {"selected_choice": right.id},
            numeric.id: {"numeric_response": 4},
            third.id: {"selected_choice": third_right.id},
        },
    )
    mastery = TopicMastery.objects.get(student=student_user, topic_id=mc.topic_id)
    TopicMastery.objects.filter(pk=mastery.pk).update(
        last_attempted_at=timezone.now() - timedelta(days=8)
    )
    generate_recommendations_for_topic(student_user, mc.topic_id)
    types = set(
        Recommendation.objects.filter(status=RecommendationStatus.ACTIVE).values_list(
            "recommendation_type", flat=True
        )
    )
    assert types == {
        RecommendationType.MIXED_PRACTICE,
        RecommendationType.SPACED_REVIEW,
    }


@pytest.mark.django_db
def test_mastered_recommends_advance_topic(
    auth_client, student_user, enrollment, published_quiz_data, topic2
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    extra = [add_question(quiz, mc.topic) for _ in range(3)]
    questions = [(mc, right), (numeric, 4)] + [
        (q, r) for q, _, r in extra
    ]
    client = auth_client(student_user)
    submit_via_api(
        client,
        quiz,
        {
            q.id: (
                {"selected_choice": choice.id}
                if q.question_type == "MULTIPLE_CHOICE"
                else {"numeric_response": choice}
            )
            for q, choice in questions
        },
    )
    mastery = TopicMastery.objects.get(student=student_user, topic_id=mc.topic_id)
    assert mastery.status == MasteryStatus.MASTERED
    assert mastery.mastery_score == Decimal("100.00")
    recs = list(
        Recommendation.objects.filter(status=RecommendationStatus.ACTIVE)
    )
    assert [r.recommendation_type for r in recs] == [RecommendationType.ADVANCE_TOPIC]
    assert recs[0].priority == RecommendationPriority.LOW
    assert "Inequalities" in recs[0].title
    assert "M8AL-Ia-2" in recs[0].reason


@pytest.mark.django_db
def test_mastered_adds_spaced_review_when_due(
    auth_client, student_user, enrollment, published_quiz_data, topic2
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    extra = [add_question(quiz, mc.topic) for _ in range(3)]
    client = auth_client(student_user)
    submit_via_api(
        client,
        quiz,
        {
            **{mc.id: {"selected_choice": right.id}},
            **{numeric.id: {"numeric_response": 4}},
            **{q.id: {"selected_choice": r.id} for q, _, r in extra},
        },
    )
    mastery = TopicMastery.objects.get(student=student_user, topic_id=mc.topic_id)
    TopicMastery.objects.filter(pk=mastery.pk).update(
        last_attempted_at=timezone.now() - timedelta(days=9)
    )
    generate_recommendations_for_topic(student_user, mc.topic_id)
    types = set(
        Recommendation.objects.filter(status=RecommendationStatus.ACTIVE).values_list(
            "recommendation_type", flat=True
        )
    )
    assert types == {RecommendationType.ADVANCE_TOPIC, RecommendationType.SPACED_REVIEW}


@pytest.mark.django_db
def test_review_lesson_without_accessible_lesson_still_created_but_no_easy_practice(
    student_user, enrollment, classroom, teacher_user, topic, db
):
    from apps.lessons.models import Lesson, LessonStatus
    from apps.quizzes.models import QuizStatus
    from apps.progress.tests.conftest import make_mc_question, make_numeric_question, make_quiz

    draft_lesson = Lesson.objects.create(
        topic=topic,
        classroom=classroom,
        author=teacher_user,
        title="Draft lesson",
        learning_objectives=["Objective"],
        content="Content",
        status=LessonStatus.DRAFT,
    )
    quiz = make_quiz(classroom, draft_lesson, teacher_user, status=QuizStatus.DRAFT)
    mc, _, _ = make_mc_question(quiz, topic)
    numeric = make_numeric_question(quiz, topic)
    make_submitted_attempt(
        student_user,
        quiz,
        answers=[(mc, False, 0), (numeric, False, 0)],
    )
    recompute_mastery(student_user)
    generate_recommendations_for_topic(student_user, topic.id)
    by_type = {r.recommendation_type: r for r in Recommendation.objects.all()}
    assert RecommendationType.REVIEW_LESSON in by_type
    assert by_type[RecommendationType.REVIEW_LESSON].target_lesson_id is None
    assert RecommendationType.EASY_PRACTICE not in by_type


@pytest.mark.django_db
def test_stale_active_recommendations_expire_when_status_changes(
    student_user, enrollment, published_quiz_data, topic2
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    TopicMastery.objects.create(
        student=student_user,
        topic=mc.topic,
        mastery_score=Decimal("10.00"),
        status=MasteryStatus.NEEDS_SUPPORT,
    )
    generate_recommendations_for_topic(student_user, mc.topic_id)
    assert Recommendation.objects.filter(status=RecommendationStatus.ACTIVE).count() == 2

    extra = [add_question(quiz, mc.topic) for _ in range(3)]
    questions = [mc, numeric] + [q for q, _, _ in extra]
    make_submitted_attempt(
        student_user,
        quiz,
        answers=[(q, True, q.points) for q in questions],
    )
    recompute_mastery(student_user)
    mastery = TopicMastery.objects.get(student=student_user, topic_id=mc.topic_id)
    assert mastery.status == MasteryStatus.MASTERED
    assert mastery.mastery_score == Decimal("100.00")

    generate_recommendations_for_topic(student_user, mc.topic_id)
    assert Recommendation.objects.filter(status=RecommendationStatus.EXPIRED).count() == 2
    active = list(Recommendation.objects.filter(status=RecommendationStatus.ACTIVE))
    assert [r.recommendation_type for r in active] == [RecommendationType.ADVANCE_TOPIC]


@pytest.mark.django_db
def test_completed_recommendations_are_not_touched_by_regeneration(
    student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(
        student_user,
        quiz,
        answers=[(mc, False, 0), (numeric, False, 0)],
    )
    recompute_mastery(student_user)
    generate_recommendations_for_topic(student_user, mc.topic_id)
    review = Recommendation.objects.get(
        student=student_user, recommendation_type=RecommendationType.REVIEW_LESSON
    )
    review.status = RecommendationStatus.COMPLETED
    review.save()
    generate_recommendations_for_topic(student_user, mc.topic_id)
    review.refresh_from_db()
    assert review.status == RecommendationStatus.COMPLETED


@pytest.mark.django_db
def test_generate_for_student_refreshes_every_topic(
    student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(
        student_user,
        quiz,
        answers=[(mc, False, 0), (numeric, False, 0)],
    )
    recompute_mastery(student_user)
    assert generate_recommendations_for_student(student_user) == 1
    assert Recommendation.objects.count() == 2


@pytest.mark.django_db
def test_complete_recommendation_marks_completed(
    student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(
        student_user,
        quiz,
        answers=[(mc, False, 0), (numeric, False, 0)],
    )
    recompute_mastery(student_user)
    generate_recommendations_for_topic(student_user, mc.topic_id)
    rec = Recommendation.objects.get(
        student=student_user, recommendation_type=RecommendationType.REVIEW_LESSON
    )
    result = complete_recommendation(recommendation=rec, student=student_user)
    assert result.status == RecommendationStatus.COMPLETED
    assert result.completed_at is not None
    result = complete_recommendation(recommendation=result, student=student_user)
    assert result.completed_at is not None
    assert result.status == RecommendationStatus.COMPLETED


@pytest.mark.django_db
def test_dismiss_recommendation_marks_dismissed(
    student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(
        student_user,
        quiz,
        answers=[(mc, False, 0), (numeric, False, 0)],
    )
    recompute_mastery(student_user)
    generate_recommendations_for_topic(student_user, mc.topic_id)
    rec = Recommendation.objects.get(
        student=student_user, recommendation_type=RecommendationType.EASY_PRACTICE
    )
    result = dismiss_recommendation(recommendation=rec, student=student_user)
    assert result.status == RecommendationStatus.DISMISSED
    assert result.completed_at is None


@pytest.mark.django_db
def test_complete_recommendation_denied_for_foreign_student(
    student_user, second_student, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(
        student_user,
        quiz,
        answers=[(mc, False, 0), (numeric, False, 0)],
    )
    recompute_mastery(student_user)
    generate_recommendations_for_topic(student_user, mc.topic_id)
    rec = Recommendation.objects.get(
        student=student_user, recommendation_type=RecommendationType.REVIEW_LESSON
    )
    with pytest.raises(PermissionDenied):
        complete_recommendation(recommendation=rec, student=second_student)
    with pytest.raises(PermissionDenied):
        dismiss_recommendation(recommendation=rec, student=second_student)
