import pytest
from rest_framework import status

from apps.curriculum.models import CurriculumTopic
from apps.lessons.models import Lesson, LessonStatus


@pytest.fixture
def topic2(subject, db):
    return CurriculumTopic.objects.create(
        subject=subject,
        grade_level=8,
        code="M8AL-Ic-2",
        title="Laws of Exponents",
        sequence_order=4,
    )


def _valid_payload(topic_id, classroom_id):
    return {
        "topic": topic_id,
        "classroom": classroom_id,
        "title": "Intro to Linear Equations",
        "summary": "A short summary",
        "learning_objectives": ["Solve linear equations", "Graph linear equations"],
        "content": "A linear equation has the form ax + b = c.",
    }


def _create_lesson(*, topic, classroom, author, title="Draft lesson", learning_objectives=(), content="", status=LessonStatus.DRAFT):
    return Lesson.objects.create(
        topic=topic,
        classroom=classroom,
        author=author,
        title=title,
        learning_objectives=list(learning_objectives),
        content=content,
        status=status,
    )


@pytest.fixture
def classroom(teacher_user, db):
    from apps.classrooms.models import Classroom

    return Classroom.objects.create(
        teacher=teacher_user,
        name="Grade 8 Math",
        join_code="CODE1234",
    )


@pytest.fixture
def enrollment(classroom, student_user, db):
    from apps.classrooms.models import Enrollment, EnrollmentStatus

    return Enrollment.objects.create(classroom=classroom, student=student_user, status=EnrollmentStatus.ACTIVE)


@pytest.fixture
def draft_lesson(classroom, teacher_user, topic, db):
    return _create_lesson(topic=topic, classroom=classroom, author=teacher_user, title="Draft")


@pytest.mark.django_db
def test_teacher_can_create_draft_lesson(auth_client, teacher_user, classroom, topic):
    client = auth_client(teacher_user)
    response = client.post("/api/v1/lessons/", _valid_payload(topic.id, classroom.id), format="json")
    assert response.status_code == status.HTTP_201_CREATED
    body = response.json()
    assert body["status"] == LessonStatus.DRAFT
    assert body["version"] == 1


@pytest.mark.django_db
def test_student_cannot_create_lesson(auth_client, student_user, classroom, topic):
    client = auth_client(student_user)
    response = client.post("/api/v1/lessons/", _valid_payload(topic.id, classroom.id), format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_teacher_cannot_create_lesson_in_another_teachers_classroom(
    auth_client, second_teacher, classroom, topic
):
    client = auth_client(second_teacher)
    response = client.post("/api/v1/lessons/", _valid_payload(topic.id, classroom.id), format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_incomplete_lesson_cannot_be_published(auth_client, teacher_user, classroom, topic, draft_lesson):
    client = auth_client(teacher_user)
    response = client.post(f"/api/v1/lessons/{draft_lesson.id}/publish/")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    draft_lesson.refresh_from_db()
    assert draft_lesson.status == LessonStatus.DRAFT


@pytest.mark.django_db
def test_teacher_can_publish_valid_lesson(auth_client, teacher_user, classroom, topic, draft_lesson):
    draft_lesson.title = "Complete lesson"
    draft_lesson.learning_objectives = ["Solve linear equations"]
    draft_lesson.content = "Content here."
    draft_lesson.save()
    client = auth_client(teacher_user)
    response = client.post(f"/api/v1/lessons/{draft_lesson.id}/publish/")
    assert response.status_code == status.HTTP_200_OK
    draft_lesson.refresh_from_db()
    assert draft_lesson.status == LessonStatus.PUBLISHED
    assert draft_lesson.published_at is not None
    assert response.json()["published_at"] is not None


@pytest.mark.django_db
def test_student_cannot_see_draft_lesson(auth_client, student_user, classroom, topic, draft_lesson, enrollment):
    client = auth_client(student_user)
    response = client.get(f"/api/v1/lessons/{draft_lesson.id}/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_unenrolled_student_cannot_see_published_lesson(
    auth_client, second_student, classroom, teacher_user, topic, draft_lesson
):
    draft_lesson.title = "Published lesson"
    draft_lesson.learning_objectives = ["obj"]
    draft_lesson.content = "content"
    draft_lesson.status = LessonStatus.PUBLISHED
    draft_lesson.save()
    client = auth_client(second_student)
    response = client.get(f"/api/v1/lessons/{draft_lesson.id}/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_enrolled_student_can_see_published_lesson(
    auth_client, student_user, classroom, teacher_user, topic, draft_lesson, enrollment
):
    draft_lesson.title = "Published lesson"
    draft_lesson.learning_objectives = ["obj"]
    draft_lesson.content = "content"
    draft_lesson.status = LessonStatus.PUBLISHED
    draft_lesson.save()
    client = auth_client(student_user)
    response = client.get(f"/api/v1/lessons/{draft_lesson.id}/")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == LessonStatus.PUBLISHED


@pytest.mark.django_db
def test_students_only_see_published_lessons_in_their_classrooms(
    auth_client, student_user, classroom, teacher_user, topic, enrollment
):
    published = _create_lesson(topic=topic, classroom=classroom, author=teacher_user)
    published.title = "P1"
    published.learning_objectives = ["o"]
    published.content = "c"
    published.status = LessonStatus.PUBLISHED
    published.save()

    draft = _create_lesson(topic=topic, classroom=classroom, author=teacher_user, title="Draft only")
    mini = _create_lesson(topic=topic, classroom=classroom, author=teacher_user, title="Mini")
    mini.title = "M1"
    mini.content = "c"
    mini.learning_objectives = ["o"]
    mini.status = LessonStatus.ARCHIVED
    mini.save()

    client = auth_client(student_user)
    response = client.get("/api/v1/lessons/")
    assert response.status_code == status.HTTP_200_OK
    ids = {item["id"] for item in response.json()["results"]}
    assert published.id in ids
    assert draft.id not in ids
    assert mini.id not in ids


@pytest.mark.django_db
def test_teacher_cannot_edit_another_teachers_lesson(
    auth_client, second_teacher, draft_lesson
):
    client = auth_client(second_teacher)
    response = client.patch(f"/api/v1/lessons/{draft_lesson.id}/", {"title": "Hacked"}, format="json")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_author_can_edit_and_version_increments(auth_client, teacher_user, draft_lesson):
    client = auth_client(teacher_user)
    response = client.patch(f"/api/v1/lessons/{draft_lesson.id}/", {"title": "Edited"}, format="json")
    assert response.status_code == status.HTTP_200_OK
    draft_lesson.refresh_from_db()
    assert draft_lesson.title == "Edited"
    assert draft_lesson.version == 2


@pytest.mark.django_db
def test_archived_lesson_hidden_from_students(
    auth_client, student_user, classroom, teacher_user, topic, enrollment, draft_lesson
):
    draft_lesson.title = "Will archive"
    draft_lesson.learning_objectives = ["o"]
    draft_lesson.content = "c"
    draft_lesson.status = LessonStatus.PUBLISHED
    draft_lesson.save()

    client = auth_client(teacher_user)
    response = client.post(f"/api/v1/lessons/{draft_lesson.id}/archive/")
    assert response.status_code == status.HTTP_200_OK

    student_client = auth_client(student_user)
    assert student_client.get(f"/api/v1/lessons/{draft_lesson.id}/").status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_lesson_responses_do_not_expose_internal_fields(
    auth_client, student_user, classroom, teacher_user, topic, draft_lesson, enrollment
):
    draft_lesson.title = "Safe payload"
    draft_lesson.learning_objectives = ["o"]
    draft_lesson.content = "c"
    draft_lesson.status = LessonStatus.PUBLISHED
    draft_lesson.save()
    client = auth_client(student_user)
    body = client.get(f"/api/v1/lessons/{draft_lesson.id}/").json()
    assert "password" not in body
    assert "is_superuser" not in body
    assert "user_permissions" not in body
    assert "groups" not in body


@pytest.mark.django_db
def test_teacher_can_filter_lessons_by_status(
    auth_client, teacher_user, classroom, topic, draft_lesson
):
    other = _create_lesson(topic=topic, classroom=classroom, author=teacher_user, title="Published one")
    other.title = "P"
    other.content = "c"
    other.learning_objectives = ["o"]
    other.status = LessonStatus.PUBLISHED
    other.save()

    client = auth_client(teacher_user)
    published = client.get("/api/v1/lessons/?status=PUBLISHED").json()["results"]
    assert [item["id"] for item in published] == [other.id]
    drafts = client.get("/api/v1/lessons/?status=DRAFT").json()["results"]
    assert [item["id"] for item in drafts] == [draft_lesson.id]