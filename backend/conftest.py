import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(email="admin@aralai.test", password="admin-pass-123", role=UserRole.ADMIN, is_staff=True)


@pytest.fixture
def teacher_user(db):
    return User.objects.create_user(
        email="teacher@aralai.test",
        password="teacher-pass-123",
        first_name="Maria",
        last_name="Santos",
        role=UserRole.TEACHER,
    )


@pytest.fixture
def student_user(db):
    return User.objects.create_user(
        email="student@aralai.test",
        password="student-pass-123",
        first_name="Juan",
        last_name="Dela Cruz",
        role=UserRole.STUDENT,
    )


@pytest.fixture
def second_teacher(db):
    return User.objects.create_user(
        email="teacher2@aralai.test",
        password="teacher-pass-123",
        role=UserRole.TEACHER,
    )


@pytest.fixture
def second_student(db):
    return User.objects.create_user(
        email="student2@aralai.test",
        password="student-pass-123",
        role=UserRole.STUDENT,
    )


@pytest.fixture
def auth_client(api_client):
    """Helper factory that authenticates a client for a given user."""

    def _authenticate(user):
        api_client.force_authenticate(user=user)
        return api_client

    return _authenticate


@pytest.fixture
def subject(db):
    from apps.curriculum.models import Subject

    return Subject.objects.create(name="Mathematics", code="MATH8", is_active=True)


@pytest.fixture
def topic(subject, db):
    from apps.curriculum.models import CurriculumTopic

    return CurriculumTopic.objects.create(
        subject=subject,
        grade_level=8,
        code="M8AL-Ia-1",
        title="Linear Equations",
        description="Linear equations in one variable.",
        sequence_order=1,
    )


@pytest.fixture(autouse=True)
def disable_throttling(settings):
    """Raise all throttle rates so auth tests do not trip IP-based limits."""
    rates = settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {})
    settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {key: "10000/min" for key in rates}