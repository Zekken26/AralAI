"""Wire-format regression locks for the teacher analytics endpoints.

These tests deliberately assert the *transport* contract the frontend relies
on: decimals arrive as JSON numbers (not strings), enum keys are uppercase
statuses / lowercase distribution buckets, topic rows keep a deterministic
order, and empty/inaccessible states map to 200/404 exactly.
"""

import pytest

from apps.curriculum.models import CurriculumTopic
from apps.progress.models import TopicMastery
from apps.progress.tests.conftest import make_submitted_attempt, recompute_mastery


@pytest.fixture
def two_submissions(enrollment, second_enrollment, published_quiz_data):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(enrollment.student, quiz, answers=[(mc, True, 5)])
    make_submitted_attempt(
        second_enrollment.student, quiz, answers=[(mc, False, 0), (numeric, False, 0)]
    )
    recompute_mastery(enrollment.student)
    recompute_mastery(second_enrollment.student)
    return quiz, mc, enrollment, second_enrollment


@pytest.mark.django_db
def test_classroom_progress_transport_is_all_numbers(
    auth_client, teacher_user, classroom, two_submissions
):
    body = auth_client(teacher_user).get(
        f"/api/v1/classrooms/{classroom.id}/progress/"
    ).json()
    assert isinstance(body["class_average_mastery"], (int, float))
    assert not isinstance(body["class_average_mastery"], bool)
    for entry in body["weakest_topics"] + body["strongest_topics"]:
        assert isinstance(entry["average_mastery"], (int, float))
    distribution = body["topic_distribution"][0]
    for key in (
        "needs_support",
        "developing",
        "proficient",
        "mastered",
        "attempted_students",
        "submitted_attempts",
    ):
        assert isinstance(distribution[key], int), key
    assert isinstance(distribution["average_mastery"], (int, float))


@pytest.mark.django_db
def test_topic_distribution_average_mastery_matches_class_average(
    auth_client, teacher_user, classroom, two_submissions
):
    body = auth_client(teacher_user).get(
        f"/api/v1/classrooms/{classroom.id}/progress/"
    ).json()
    distribution = body["topic_distribution"][0]
    assert distribution["average_mastery"] == pytest.approx(
        body["class_average_mastery"]
    )


@pytest.mark.django_db
def test_support_endpoint_orders_weakest_topic_first_with_uppercase_status(
    auth_client, teacher_user, classroom, two_submissions
):
    body = auth_client(teacher_user).get(
        f"/api/v1/classrooms/{classroom.id}/students-needing-support/"
    ).json()
    assert body["count"] == 1
    entry = body["students"][0]
    topics = entry["topics"]
    assert len(topics) == 1
    assert topics[0]["status"] == "NEEDS_SUPPORT"
    assert isinstance(topics[0]["mastery_score"], (int, float))
    scores = [topic["mastery_score"] for topic in topics]
    assert scores == sorted(scores)


@pytest.mark.django_db
def test_support_endpoint_200_with_empty_students_for_quiet_classroom(
    auth_client, teacher_user, classroom, enrollment
):
    response = auth_client(teacher_user).get(
        f"/api/v1/classrooms/{classroom.id}/students-needing-support/"
    )
    assert response.status_code == 200
    assert response.json() == {"count": 0, "students": []}


@pytest.mark.django_db
def test_topic_progress_empty_state_is_200_with_null_averages(
    auth_client, teacher_user, classroom, enrollment, topic
):
    response = auth_client(teacher_user).get(
        f"/api/v1/classrooms/{classroom.id}/topics/{topic.id}/progress/"
    )
    assert response.status_code == 200
    body = response.json()
    assert body["topic"]["id"] == topic.id
    assert body["topic"]["title"] is None
    assert body["topic"]["code"] is None
    assert body["average_mastery"] is None
    assert body["attempted_students"] == 0
    assert body["distribution"] == {
        "needs_support": 0,
        "developing": 0,
        "proficient": 0,
        "mastered": 0,
    }
    assert body["students"] == []


@pytest.mark.django_db
def test_topic_progress_uses_lowercase_distribution_and_uppercase_statuses(
    auth_client, teacher_user, classroom, two_submissions
):
    quiz, mc, _, _ = two_submissions
    body = auth_client(teacher_user).get(
        f"/api/v1/classrooms/{classroom.id}/topics/{mc.topic_id}/progress/"
    ).json()
    assert set(body["distribution"].keys()) == {
        "needs_support",
        "developing",
        "proficient",
        "mastered",
    }
    assert isinstance(body["average_mastery"], (int, float))
    statuses = {row["status"] for row in body["students"]}
    assert statuses == {"NEEDS_SUPPORT", "DEVELOPING"}
    assert all(
        isinstance(row["mastery_score"], (int, float)) for row in body["students"]
    )


@pytest.mark.django_db
def test_teacher_student_progress_orders_topics_by_score_descending(
    auth_client, teacher_user, classroom, enrollment, second_lesson, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    make_submitted_attempt(enrollment.student, quiz, answers=[(mc, True, 5)])
    recompute_mastery(enrollment.student)
    TopicMastery.objects.create(
        student=enrollment.student, topic=second_lesson.topic, mastery_score=10
    )
    student = enrollment.student
    body = auth_client(teacher_user).get(
        f"/api/v1/classrooms/{classroom.id}/students/{student.id}/progress/"
    ).json()
    assert [row["topic"]["id"] for row in body["topics"]] == [
        mc.topic_id,
        second_lesson.topic.id,
    ]
    assert all(
        isinstance(row["mastery_score"], (int, float)) for row in body["topics"]
    )
    assert isinstance(body["overall_mastery_average"], (int, float))


@pytest.mark.django_db
def test_foreign_teacher_gets_404_across_analytics_endpoints(
    auth_client, second_teacher, classroom, enrollment, topic
):
    client = auth_client(second_teacher)
    urls = [
        f"/api/v1/classrooms/{classroom.id}/progress/",
        f"/api/v1/classrooms/{classroom.id}/students-needing-support/",
        f"/api/v1/classrooms/{classroom.id}/topics/{topic.id}/progress/",
        f"/api/v1/classrooms/{classroom.id}/students/{enrollment.student.id}/progress/",
    ]
    for url in urls:
        assert client.get(url).status_code == 404, url
