from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.curriculum.models import CurriculumTopic, Subject
from apps.progress.models import (
    MasteryStatus,
    Recommendation,
    RecommendationStatus,
    RecommendationType,
    TopicMastery,
)
from apps.progress.services import generate_recommendations_for_topic
from apps.progress.tests.conftest import (
    make_submitted_attempt,
    recompute_mastery,
    submit_via_api,
)


SUMMARY_URL = "/api/v1/students/me/progress/"
TOPICS_URL = "/api/v1/students/me/progress/topics/"
RECS_URL = "/api/v1/students/me/recommendations/"
RECS_HISTORY_URL = "/api/v1/students/me/recommendations/history/"


@pytest.mark.django_db
def test_anonymous_is_rejected_from_all_progress_endpoints(api_client):
    urls = [
        SUMMARY_URL,
        TOPICS_URL,
        f"{TOPICS_URL}1/",
        f"{TOPICS_URL}1/history/",
        RECS_URL,
        RECS_HISTORY_URL,
        "/api/v1/classrooms/1/progress/",
        "/api/v1/classrooms/1/students-needing-support/",
        "/api/v1/classrooms/1/topics/1/progress/",
        "/api/v1/classrooms/1/students/1/progress/",
    ]
    for url in urls:
        assert api_client.get(url).status_code == 401, url


@pytest.mark.django_db
def test_student_summary_after_single_submission(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(student_user)
    submit_via_api(client, quiz, {mc.id: {"selected_choice": right.id}})
    body = client.get(SUMMARY_URL).json()
    assert float(body["overall_mastery_average"]) == 52.0
    assert body["topics_attempted"] == 1
    assert body["topics_mastered"] == 0
    assert body["topics_needing_support"] == 0
    assert body["total_submitted_attempts"] == 1
    assert len(body["recent_performance_trend"]) == 1
    assert body["recent_performance_trend"][0]["score"] == 50.0
    assert body["trend_delta"] is None
    assert body["last_activity_date"] is not None


@pytest.mark.django_db
def test_student_summary_accumulates_attempts_and_trend_delta(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(student_user)
    submit_via_api(client, quiz, {mc.id: {"selected_choice": right.id}})
    submit_via_api(
        client,
        quiz,
        {
            mc.id: {"selected_choice": wrong.id},
            numeric.id: {"numeric_response": 999},
        },
    )
    body = client.get(SUMMARY_URL).json()
    assert body["total_submitted_attempts"] == 2
    assert float(body["overall_mastery_average"]) == 28.67
    assert body["topics_needing_support"] == 1
    assert len(body["recent_performance_trend"]) == 2
    assert body["trend_delta"] == -50.0


@pytest.mark.django_db
def test_student_summary_empty_state(auth_client, student_user):
    client = auth_client(student_user)
    body = client.get(SUMMARY_URL).json()
    assert body["overall_mastery_average"] is None
    assert body["topics_attempted"] == 0
    assert body["topics_mastered"] == 0
    assert body["total_submitted_attempts"] == 0
    assert body["recent_performance_trend"] == []
    assert body["trend_delta"] is None
    assert body["last_activity_date"] is None


@pytest.mark.django_db
def test_mastery_list_orders_by_score_and_filters_by_subject(
    auth_client, student_user, enrollment, published_quiz_data, subject, db
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(student_user, quiz, answers=[(mc, True, 5)])
    make_submitted_attempt(
        student_user, quiz, attempt_number=2, answers=[(numeric, False, 0)]
    )
    recompute_mastery(student_user)
    other_subject = Subject.objects.create(name="Science", code="SCI8", is_active=True)
    foreign_topic = CurriculumTopic.objects.create(
        subject=other_subject,
        grade_level=8,
        code="S8LT-Ia-1",
        title="Force",
        sequence_order=1,
    )
    TopicMastery.objects.create(student=student_user, topic=foreign_topic, mastery_score=90)

    client = auth_client(student_user)
    body = client.get(TOPICS_URL).json()["results"]
    assert [item["topic"]["id"] for item in body] == [foreign_topic.id, mc.topic_id]

    filtered = client.get(f"{TOPICS_URL}?subject={subject.id}").json()["results"]
    assert [item["topic"]["id"] for item in filtered] == [mc.topic_id]
    assert filtered[0]["mastery_score"] == "32.00"
    assert filtered[0]["status"] == MasteryStatus.NEEDS_SUPPORT
    assert filtered[0]["active_recommendation_count"] >= 0


@pytest.mark.django_db
def test_mastery_detail_includes_recommendations_and_last_change(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(student_user, quiz, answers=[(mc, True, 5)])
    recompute_mastery(student_user)
    generate_recommendations_for_topic(student_user, mc.topic_id)
    client = auth_client(student_user)
    response = client.get(f"{TOPICS_URL}{mc.topic_id}/")
    assert response.status_code == 200
    body = response.json()
    assert body["mastery_score"] == "52.00"
    assert float(body["last_score_change"]) == 52.0
    assert [r["recommendation_type"] for r in body["active_recommendations"]] == [
        RecommendationType.GUIDED_PRACTICE
    ]


@pytest.mark.django_db
def test_mastery_detail_404_for_unattempted_topic(
    auth_client, student_user, topic
):
    client = auth_client(student_user)
    assert client.get(f"{TOPICS_URL}{topic.id}/").status_code == 404


@pytest.mark.django_db
def test_mastery_history_endpoint_lists_newest_first(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(student_user, quiz, answers=[(mc, False, 0)])
    make_submitted_attempt(student_user, quiz, attempt_number=2, answers=[(mc, True, 5)])
    recompute_mastery(student_user)
    client = auth_client(student_user)
    body = client.get(f"{TOPICS_URL}{mc.topic_id}/history/").json()["results"]
    assert [item["previous_score"] for item in body] == ["10.00", "0.00"]
    assert [item["new_score"] for item in body] == ["32.00", "10.00"]
    assert body[0]["quiz_attempt"] is not None
    assert body[0]["quiz_title"] == quiz.title


@pytest.mark.django_db
def test_mastery_history_404_for_unattempted_topic(auth_client, student_user, topic):
    client = auth_client(student_user)
    assert client.get(f"{TOPICS_URL}{topic.id}/history/").status_code == 404


@pytest.mark.django_db
def test_recommendations_list_returns_only_own_active(
    auth_client, student_user, second_student, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(student_user, quiz, answers=[(mc, False, 0), (numeric, False, 0)])
    recompute_mastery(student_user)
    generate_recommendations_for_topic(student_user, mc.topic_id)
    client = auth_client(student_user)
    body = client.get(RECS_URL).json()["results"]
    assert {r["recommendation_type"] for r in body} == {
        RecommendationType.REVIEW_LESSON,
        RecommendationType.EASY_PRACTICE,
    }
    assert all(r["status"] == RecommendationStatus.ACTIVE for r in body)
    assert all(r["topic"]["title"] == mc.topic.title for r in body)

    other = auth_client(second_student)
    assert other.get(RECS_URL).json()["results"] == []


@pytest.mark.django_db
def test_recommendation_history_lists_completed_and_dismissed(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(student_user, quiz, answers=[(mc, False, 0), (numeric, False, 0)])
    recompute_mastery(student_user)
    generate_recommendations_for_topic(student_user, mc.topic_id)
    rec = Recommendation.objects.get(
        student=student_user, recommendation_type=RecommendationType.EASY_PRACTICE
    )
    rec.status = RecommendationStatus.DISMISSED
    rec.save()
    client = auth_client(student_user)
    body = client.get(RECS_HISTORY_URL).json()["results"]
    assert len(body) == 1
    assert body[0]["status"] == RecommendationStatus.DISMISSED


@pytest.mark.django_db
def test_complete_endpoint_updates_status_once(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(student_user, quiz, answers=[(mc, False, 0), (numeric, False, 0)])
    recompute_mastery(student_user)
    generate_recommendations_for_topic(student_user, mc.topic_id)
    rec = Recommendation.objects.get(
        student=student_user, recommendation_type=RecommendationType.REVIEW_LESSON
    )
    client = auth_client(student_user)
    response = client.post(f"/api/v1/students/me/recommendations/{rec.id}/complete/")
    assert response.status_code == 200
    assert response.json()["status"] == RecommendationStatus.COMPLETED
    assert response.json()["completed_at"] is not None
    second = client.post(f"/api/v1/students/me/recommendations/{rec.id}/complete/")
    assert second.status_code == 200
    assert second.json()["completed_at"] == response.json()["completed_at"]


@pytest.mark.django_db
def test_dismiss_endpoint_marks_dismissed(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(student_user, quiz, answers=[(mc, False, 0), (numeric, False, 0)])
    recompute_mastery(student_user)
    generate_recommendations_for_topic(student_user, mc.topic_id)
    rec = Recommendation.objects.get(
        student=student_user, recommendation_type=RecommendationType.REVIEW_LESSON
    )
    client = auth_client(student_user)
    response = client.post(f"/api/v1/students/me/recommendations/{rec.id}/dismiss/")
    assert response.status_code == 200
    assert response.json()["status"] == RecommendationStatus.DISMISSED


@pytest.mark.django_db
def test_foreign_recommendation_actions_return_404(
    auth_client, student_user, second_student, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(student_user, quiz, answers=[(mc, False, 0), (numeric, False, 0)])
    recompute_mastery(student_user)
    generate_recommendations_for_topic(student_user, mc.topic_id)
    rec = Recommendation.objects.get(
        student=student_user, recommendation_type=RecommendationType.REVIEW_LESSON
    )
    client = auth_client(second_student)
    assert client.post(f"/api/v1/students/me/recommendations/{rec.id}/complete/").status_code == 404
    assert client.post(f"/api/v1/students/me/recommendations/{rec.id}/dismiss/").status_code == 404


@pytest.mark.django_db
def test_teacher_endpoints_forbidden_for_students(
    auth_client, student_user, classroom
):
    client = auth_client(student_user)
    for url in (
        f"/api/v1/classrooms/{classroom.id}/progress/",
        f"/api/v1/classrooms/{classroom.id}/students-needing-support/",
        f"/api/v1/classrooms/{classroom.id}/topics/1/progress/",
        f"/api/v1/classrooms/{classroom.id}/students/{student_user.id}/progress/",
    ):
        assert client.get(url).status_code == 403, url


@pytest.mark.django_db
def test_student_endpoints_forbidden_for_teachers(
    auth_client, teacher_user
):
    client = auth_client(teacher_user)
    for url in (SUMMARY_URL, TOPICS_URL, RECS_URL):
        assert client.get(url).status_code == 403, url


@pytest.mark.django_db
def test_classroom_progress_aggregates(
    auth_client, teacher_user, classroom, enrollment, second_enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    student = enrollment.student
    make_submitted_attempt(student, quiz, answers=[(mc, True, 5)])
    make_submitted_attempt(
        second_enrollment.student, quiz, answers=[(mc, False, 0), (numeric, False, 0)]
    )
    recompute_mastery(student)
    recompute_mastery(second_enrollment.student)
    client = auth_client(teacher_user)
    body = client.get(f"/api/v1/classrooms/{classroom.id}/progress/").json()
    assert body["classroom_id"] == classroom.id
    assert body["attempted_topics"] == 1
    assert float(body["class_average_mastery"]) == 31.0
    assert len(body["weakest_topics"]) == 1
    assert float(body["weakest_topics"][0]["average_mastery"]) == 31.0
    assert len(body["strongest_topics"]) == 1
    distribution = body["topic_distribution"][0]
    assert distribution["needs_support"] == 1
    assert distribution["developing"] == 1
    assert distribution["mastered"] == 0
    assert distribution["attempted_students"] == 2
    assert distribution["submitted_attempts"] == 2


@pytest.mark.django_db
def test_classroom_progress_404_for_foreign_teacher(
    auth_client, second_teacher, classroom
):
    client = auth_client(second_teacher)
    assert client.get(f"/api/v1/classrooms/{classroom.id}/progress/").status_code == 404


@pytest.mark.django_db
def test_students_needing_support_lists_students(
    auth_client, teacher_user, classroom, enrollment, second_enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(
        enrollment.student, quiz, answers=[(mc, True, 5)]
    )
    make_submitted_attempt(
        second_enrollment.student, quiz, answers=[(mc, False, 0), (numeric, False, 0)]
    )
    recompute_mastery(enrollment.student)
    recompute_mastery(second_enrollment.student)
    client = auth_client(teacher_user)
    body = client.get(
        f"/api/v1/classrooms/{classroom.id}/students-needing-support/"
    ).json()
    assert body["count"] == 1
    student = body["students"][0]
    assert student["student"]["id"] == second_enrollment.student.id
    assert student["student"]["first_name"] == second_enrollment.student.first_name
    assert len(student["topics"]) == 1
    assert student["topics"][0]["status"] == MasteryStatus.NEEDS_SUPPORT


@pytest.mark.django_db
def test_classroom_topic_progress_breakdown(
    auth_client, teacher_user, classroom, enrollment, second_enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(
        enrollment.student, quiz, answers=[(mc, True, 5)]
    )
    make_submitted_attempt(
        second_enrollment.student, quiz, answers=[(mc, False, 0), (numeric, False, 0)]
    )
    recompute_mastery(enrollment.student)
    recompute_mastery(second_enrollment.student)
    client = auth_client(teacher_user)
    response = client.get(
        f"/api/v1/classrooms/{classroom.id}/topics/{mc.topic_id}/progress/"
    )
    assert response.status_code == 200
    body = response.json()
    assert body["topic"]["title"] == mc.topic.title
    assert float(body["average_mastery"]) == 31.0
    assert body["attempted_students"] == 2
    assert body["distribution"] == {
        "needs_support": 1,
        "developing": 1,
        "proficient": 0,
        "mastered": 0,
    }
    assert len(body["students"]) == 2


@pytest.mark.django_db
def test_teacher_student_progress_for_enrolled_student(
    auth_client, teacher_user, classroom, enrollment, second_enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(
        enrollment.student, quiz, answers=[(mc, True, 5)]
    )
    recompute_mastery(enrollment.student)
    client = auth_client(teacher_user)
    student = enrollment.student
    response = client.get(
        f"/api/v1/classrooms/{classroom.id}/students/{student.id}/progress/"
    )
    assert response.status_code == 200
    body = response.json()
    assert body["student"]["id"] == student.id
    assert body["student"]["first_name"] == student.first_name
    assert body["student"]["last_name"] == student.last_name
    assert body["topics_attempted"] == 1
    assert body["topics_mastered"] == 0
    assert float(body["overall_mastery_average"]) == 52.0
    assert body["topics"][0]["status"] == MasteryStatus.DEVELOPING


@pytest.mark.django_db
def test_teacher_student_progress_404_for_unenrolled_student(
    auth_client, teacher_user, classroom, student_user, second_student, published_quiz_data
):
    client = auth_client(teacher_user)
    response = client.get(
        f"/api/v1/classrooms/{classroom.id}/students/{second_student.id}/progress/"
    )
    assert response.status_code == 404


@pytest.mark.django_db
def test_mastery_detail_query_count(
    auth_client, student_user, enrollment, published_quiz_data, django_assert_num_queries
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(student_user, quiz, answers=[(mc, True, 5)])
    recompute_mastery(student_user)
    generate_recommendations_for_topic(student_user, mc.topic_id)
    client = auth_client(student_user)
    with django_assert_num_queries(4):
        response = client.get(f"{TOPICS_URL}{mc.topic_id}/")
    assert response.status_code == 200


@pytest.mark.django_db
def test_classroom_progress_query_count(
    auth_client,
    teacher_user,
    classroom,
    enrollment,
    second_enrollment,
    published_quiz_data,
    django_assert_num_queries,
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(enrollment.student, quiz, answers=[(mc, True, 5)])
    make_submitted_attempt(
        second_enrollment.student, quiz, answers=[(mc, False, 0), (numeric, False, 0)]
    )
    recompute_mastery(enrollment.student)
    recompute_mastery(second_enrollment.student)
    client = auth_client(teacher_user)
    with django_assert_num_queries(4):
        response = client.get(f"/api/v1/classrooms/{classroom.id}/progress/")
    assert response.status_code == 200
