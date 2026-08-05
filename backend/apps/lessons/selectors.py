from django.db.models import Q

from apps.accounts.models import User, UserRole
from apps.classrooms.models import EnrollmentStatus
from apps.lessons.models import Lesson, LessonStatus


def base_lessons_for_user(user: User):
    role = getattr(user, "role", None)
    if role == UserRole.TEACHER:
        return Lesson.objects.filter(author=user)
    if user.role == UserRole.STUDENT:
        return Lesson.objects.filter(
            status=LessonStatus.PUBLISHED,
            classroom__enrollments__student=user,
            classroom__enrollments__status=EnrollmentStatus.ACTIVE,
        ).distinct()
    return Lesson.objects.none()


def lessons_for_user(user: User, *, classroom_id: int | None = None, topic_id: int | None = None, status=None):
    role = getattr(user, "role", None)
    qs = base_lessons_for_user(user)
    if classroom_id is not None:
        qs = qs.filter(classroom_id=classroom_id)
    if topic_id is not None:
        qs = qs.filter(topic_id=topic_id)
    if status is not None and role == UserRole.TEACHER:
        qs = qs.filter(status=status)
    return qs.select_related("topic", "classroom", "author")


def get_lesson_for_user(user: User, lesson_id: int) -> Lesson | None:
    return base_lessons_for_user(user).filter(pk=lesson_id).first()