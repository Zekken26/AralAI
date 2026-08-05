import pytest
from rest_framework import status

from apps.classrooms.models import Classroom, Enrollment, EnrollmentStatus


@pytest.fixture
def classroom(teacher_user, db):
    return Classroom.objects.create(
        teacher=teacher_user,
        name="Grade 8 Math",
        section="Section A",
        school_year="2026-2027",
        join_code="CODE1234",
    )


@pytest.fixture
def enrollment(classroom, student_user, db):
    return Enrollment.objects.create(classroom=classroom, student=student_user, status=EnrollmentStatus.ACTIVE)


def _create_classroom(teacher):
    return Classroom.objects.create(
        teacher=teacher,
        name="Another Class",
        section="Section B",
        join_code=Classroom.generate_join_code(),
    )


@pytest.mark.django_db
def test_teacher_can_create_classroom(auth_client, teacher_user):
    client = auth_client(teacher_user)
    response = client.post(
        "/api/v1/classrooms/",
        {"name": "Grade 8", "section": "A", "school_year": "2026-2027"},
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    body = response.json()
    assert body["name"] == "Grade 8"
    assert len(body["join_code"]) == 8
    assert Classroom.objects.filter(pk=body["id"], teacher=teacher_user).exists()


@pytest.mark.django_db
def test_join_code_is_unique_and_unpredictable(auth_client, teacher_user):
    client = auth_client(teacher_user)
    seen = set()
    for i in range(5):
        response = client.post(
            "/api/v1/classrooms/",
            {"name": f"Class {i}"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        code = response.json()["join_code"]
        assert code not in seen
        seen.add(code)
    assert len(seen) == 5


@pytest.mark.django_db
def test_student_cannot_create_classroom(auth_client, student_user):
    client = auth_client(student_user)
    response = client.post("/api/v1/classrooms/", {"name": "Nope"}, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_student_can_join_with_valid_code(auth_client, student_user, classroom):
    client = auth_client(student_user)
    response = client.post("/api/v1/classrooms/join/", {"join_code": "CODE1234"}, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert Enrollment.objects.filter(classroom=classroom, student=student_user).exists()


@pytest.mark.django_db
def test_teacher_cannot_use_student_join_endpoint(auth_client, teacher_user, classroom):
    client = auth_client(teacher_user)
    response = client.post("/api/v1/classrooms/join/", {"join_code": "CODE1234"}, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_invalid_join_code_is_rejected(auth_client, student_user):
    client = auth_client(student_user)
    response = client.post("/api/v1/classrooms/join/", {"join_code": "NOPE123"}, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_inactive_classroom_cannot_be_joined(auth_client, student_user, classroom):
    classroom.is_active = False
    classroom.save()
    client = auth_client(student_user)
    response = client.post("/api/v1/classrooms/join/", {"join_code": "CODE1234"}, format="json")
    assert response.status_code in (status.HTTP_409_CONFLICT, status.HTTP_400_BAD_REQUEST)


@pytest.mark.django_db
def test_duplicate_enrollment_is_rejected(auth_client, student_user, classroom, enrollment):
    client = auth_client(student_user)
    response = client.post("/api/v1/classrooms/join/", {"join_code": "CODE1234"}, format="json")
    assert response.status_code == status.HTTP_409_CONFLICT


@pytest.mark.django_db
def test_teacher_cannot_access_another_teachers_classroom(auth_client, teacher_user, second_teacher, classroom):
    client = auth_client(second_teacher)
    response = client.get(f"/api/v1/classrooms/{classroom.id}/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_student_cannot_access_unrelated_classroom(auth_client, student_user, second_student, classroom):
    client = auth_client(second_student)
    response = client.get(f"/api/v1/classrooms/{classroom.id}/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_enrolled_student_can_view_classroom(auth_client, student_user, classroom, enrollment):
    client = auth_client(student_user)
    response = client.get(f"/api/v1/classrooms/{classroom.id}/")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["join_code"] is None


@pytest.mark.django_db
def test_owner_sees_join_code(auth_client, teacher_user, classroom):
    client = auth_client(teacher_user)
    response = client.get(f"/api/v1/classrooms/{classroom.id}/")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["join_code"] == "CODE1234"


@pytest.mark.django_db
def test_classroom_owner_can_list_enrolled_students(auth_client, teacher_user, classroom, student_user, enrollment):
    client = auth_client(teacher_user)
    response = client.get(f"/api/v1/classrooms/{classroom.id}/students/")
    assert response.status_code == status.HTTP_200_OK
    results = response.json()["results"]
    assert len(results) == 1
    student_payload = results[0]["student"]
    assert student_payload["id"] == student_user.id
    for sensitive in ("email", "password", "role", "is_superuser", "groups", "user_permissions"):
        assert sensitive not in student_payload


@pytest.mark.django_db
def test_unrelated_teacher_cannot_list_students(auth_client, second_teacher, classroom, enrollment):
    client = auth_client(second_teacher)
    response = client.get(f"/api/v1/classrooms/{classroom.id}/students/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_student_cannot_list_students(auth_client, student_user, classroom, enrollment):
    client = auth_client(student_user)
    response = client.get(f"/api/v1/classrooms/{classroom.id}/students/")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_classroom_owner_can_patch_classroom(auth_client, teacher_user, classroom):
    client = auth_client(teacher_user)
    response = client.patch(f"/api/v1/classrooms/{classroom.id}/", {"name": "Updated Name"}, format="json")
    assert response.status_code == status.HTTP_200_OK
    classroom.refresh_from_db()
    assert classroom.name == "Updated Name"


@pytest.mark.django_db
def test_non_owner_cannot_patch_classroom(auth_client, second_teacher, classroom):
    client = auth_client(second_teacher)
    response = client.patch(f"/api/v1/classrooms/{classroom.id}/", {"name": "Hacked"}, format="json")
    assert response.status_code == status.HTTP_404_NOT_FOUND