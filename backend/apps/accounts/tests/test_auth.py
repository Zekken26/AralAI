import pytest
from rest_framework import status


@pytest.mark.django_db
def test_student_can_register(api_client):
    response = api_client.post(
        "/api/v1/auth/register/",
        {
            "email": "new.student@example.com",
            "password": "secure-pass-123",
            "first_name": "Ana",
            "last_name": "Cruz",
            "role": "STUDENT",
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    body = response.json()
    assert body["email"] == "new.student@example.com"
    assert body["role"] == "STUDENT"
    assert "password" not in body


@pytest.mark.django_db
def test_teacher_can_register(api_client):
    response = api_client.post(
        "/api/v1/auth/register/",
        {"email": "new.teacher@example.com", "password": "secure-pass-123", "role": "TEACHER"},
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["role"] == "TEACHER"


@pytest.mark.django_db
def test_public_user_cannot_register_as_admin(api_client):
    response = api_client.post(
        "/api/v1/auth/register/",
        {"email": "new.admin@example.com", "password": "secure-pass-123", "role": "ADMIN"},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_duplicate_email_is_rejected(api_client, student_user):
    response = api_client.post(
        "/api/v1/auth/register/",
        {"email": student_user.email, "password": "secure-pass-123", "role": "STUDENT"},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "email" in str(response.json())


@pytest.mark.django_db
def test_invalid_credentials_are_rejected(api_client, student_user):
    response = api_client.post(
        "/api/v1/auth/login/",
        {"email": student_user.email, "password": "wrong-password"},
        format="json",
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_login_returns_access_and_refresh_tokens(api_client, student_user):
    response = api_client.post(
        "/api/v1/auth/login/",
        {"email": student_user.email, "password": "student-pass-123"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert "access" in body
    assert "refresh" in body


@pytest.mark.django_db
def test_refresh_endpoint_rotates_tokens(api_client, student_user):
    login = api_client.post(
        "/api/v1/auth/login/",
        {"email": student_user.email, "password": "student-pass-123"},
        format="json",
    )
    refresh = login.json()["refresh"]
    response = api_client.post("/api/v1/auth/refresh/", {"refresh": refresh}, format="json")
    assert response.status_code == status.HTTP_200_OK
    assert "access" in response.json()


@pytest.mark.django_db
def test_logout_blacklists_refresh_token(api_client, student_user):
    login = api_client.post(
        "/api/v1/auth/login/",
        {"email": student_user.email, "password": "student-pass-123"},
        format="json",
    )
    refresh = login.json()["refresh"]
    logout = api_client.post("/api/v1/auth/logout/", {"refresh": refresh}, format="json")
    assert logout.status_code in (status.HTTP_200_OK, status.HTTP_205_RESET_CONTENT)

    refreshed = api_client.post("/api/v1/auth/refresh/", {"refresh": refresh}, format="json")
    assert refreshed.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_me_returns_current_user(auth_client, student_user):
    client = auth_client(student_user)
    response = client.get("/api/v1/auth/me/")
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["email"] == student_user.email
    assert "password" not in body


@pytest.mark.django_db
def test_inactive_user_cannot_login(api_client, student_user):
    student_user.is_active = False
    student_user.save()
    response = api_client.post(
        "/api/v1/auth/login/",
        {"email": student_user.email, "password": "student-pass-123"},
        format="json",
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_protected_endpoint_rejects_anonymous(api_client):
    response = api_client.get("/api/v1/auth/me/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

    response = api_client.get("/api/v1/classrooms/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_login_and_me_do_not_expose_internal_fields(auth_client, student_user):
    client = auth_client(student_user)
    body = client.get("/api/v1/auth/me/").json()
    for internal in ("password", "is_superuser", "groups", "user_permissions", "last_login"):
        assert internal not in body