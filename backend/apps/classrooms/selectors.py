from apps.accounts.models import User, UserRole
from apps.classrooms.models import Classroom, Enrollment, EnrollmentStatus


def classrooms_for_user(user: User):
    """Classrooms visible to `user` based on their role."""
    role = getattr(user, "role", None)
    if role == UserRole.TEACHER:
        return Classroom.objects.filter(teacher=user)
    if user.role == UserRole.STUDENT:
        return Classroom.objects.filter(
            enrollments__student=user,
            enrollments__status=EnrollmentStatus.ACTIVE,
        ).distinct()
    return Classroom.objects.none()


def get_classroom_for_user(user: User, classroom_id: int) -> Classroom | None:
    return classrooms_for_user(user).filter(pk=classroom_id).first()


def enrolled_students(classroom: Classroom):
    return (
        Enrollment.objects.filter(classroom=classroom, status=EnrollmentStatus.ACTIVE)
        .select_related("student")
        .order_by("joined_at")
    )


def is_enrolled(student: User, classroom: Classroom) -> bool:
    return Enrollment.objects.filter(
        classroom=classroom,
        student=student,
        status=EnrollmentStatus.ACTIVE,
    ).exists()
