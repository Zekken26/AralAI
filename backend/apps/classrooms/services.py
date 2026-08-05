from django.db import IntegrityError, transaction
from rest_framework.exceptions import APIException

from apps.accounts.models import User
from apps.classrooms.models import Classroom, Enrollment, EnrollmentStatus


class InvalidJoinCodeError(APIException):
    status_code = 400
    default_detail = "The join code does not match any classroom."
    default_code = "INVALID_JOIN_CODE"


class ClassroomInactiveError(APIException):
    status_code = 409
    default_detail = "This classroom is no longer accepting students."
    default_code = "CLASSROOM_INACTIVE"


class DuplicateEnrollmentError(APIException):
    status_code = 409
    default_detail = "You are already enrolled in this classroom."
    default_code = "DUPLICATE_ENROLLMENT"


@transaction.atomic
def create_classroom(*, teacher: User, name: str, section: str = "", school_year: str = "") -> Classroom:
    """Create a classroom owned by `teacher` with a unique, non-predictable join code."""
    for _ in range(20):
        join_code = Classroom.generate_join_code()
        if not Classroom.objects.filter(join_code=join_code).exists():
            classroom = Classroom.objects.create(
                teacher=teacher,
                name=name,
                section=section,
                school_year=school_year,
                join_code=join_code,
            )
            return classroom
    raise RuntimeError("Could not generate a unique join code.")


@transaction.atomic
def update_classroom(*, classroom: Classroom, data: dict) -> Classroom:
    for field, value in data.items():
        setattr(classroom, field, value)
    classroom.full_clean()
    classroom.save()
    return classroom


@transaction.atomic
def join_classroom(*, student: User, join_code: str) -> Enrollment:
    """Enroll a student in the classroom matching `join_code`."""
    classroom = Classroom.objects.select_for_update().filter(join_code=join_code).first()
    if classroom is None:
        raise InvalidJoinCodeError()
    if not classroom.is_active:
        raise ClassroomInactiveError()
    if Enrollment.objects.filter(classroom=classroom, student=student).exists():
        raise DuplicateEnrollmentError()
    try:
        enrollment = Enrollment.objects.create(
            classroom=classroom,
            student=student,
            status=EnrollmentStatus.ACTIVE,
        )
    except IntegrityError as exc:
        raise DuplicateEnrollmentError() from exc
    return enrollment
