from django.db import transaction

from apps.accounts.models import User, UserRole


@transaction.atomic
def register_user(*, email: str, password: str, first_name: str = "", last_name: str = "", role: str) -> User:
    """Create a STUDENT or TEACHER account. ADMIN is never creatable here."""
    if role not in (UserRole.STUDENT, UserRole.TEACHER):
        raise ValueError("Public registration may only create STUDENT or TEACHER accounts.")

    user = User(email=email.lower(), first_name=first_name, last_name=last_name, role=role)
    user.set_password(password)
    user.full_clean()
    user.save()
    return user
