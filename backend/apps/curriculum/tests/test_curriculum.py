import pytest
from django.core.management import call_command
from rest_framework import status

from apps.curriculum.models import CurriculumTopic, Subject


@pytest.mark.django_db
def test_seeding_creates_subject_and_topics():
    call_command("seed_curriculum")
    assert Subject.objects.filter(code="MATH8").exists()
    assert CurriculumTopic.objects.count() == 5
    titles = set(CurriculumTopic.objects.values_list("title", flat=True))
    assert titles == {
        "Linear Equations",
        "Systems of Linear Equations",
        "Functions",
        "Laws of Exponents",
        "Basic Statistics",
    }


@pytest.mark.django_db
def test_seeding_is_idempotent():
    call_command("seed_curriculum")
    call_command("seed_curriculum")
    call_command("seed_curriculum")
    assert Subject.objects.filter(code="MATH8").count() == 1
    assert CurriculumTopic.objects.count() == 5


@pytest.mark.django_db
def test_subjects_endpoint_lists_active_subjects(auth_client, teacher_user, subject):
    client = auth_client(teacher_user)
    response = client.get("/api/v1/subjects/")
    assert response.status_code == status.HTTP_200_OK
    assert any(item["code"] == "MATH8" for item in response.json()["results"])


@pytest.mark.django_db
def test_subject_topics_endpoint(auth_client, teacher_user, subject, topic):
    client = auth_client(teacher_user)
    response = client.get(f"/api/v1/subjects/{subject.id}/topics/")
    assert response.status_code == status.HTTP_200_OK
    payload = response.json()["results"]
    assert len(payload) == 1
    assert payload[0]["code"] == "M8AL-Ia-1"


@pytest.mark.django_db
def test_topic_detail_endpoint(auth_client, teacher_user, topic):
    client = auth_client(teacher_user)
    response = client.get(f"/api/v1/topics/{topic.id}/")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["title"] == "Linear Equations"


@pytest.mark.django_db
def test_curriculum_endpoints_accept_students(auth_client, student_user, topic):
    client = auth_client(student_user)
    assert client.get(f"/api/v1/topics/{topic.id}/").status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_unauthorized_users_cannot_modify_curriculum(auth_client, teacher_user, topic):
    client = auth_client(teacher_user)
    response = client.post("/api/v1/subjects/", {"name": "Hack", "code": "X"}, format="json")
    assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
    response = client.patch(f"/api/v1/topics/{topic.id}/", {"title": "Hacked"}, format="json")
    assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED