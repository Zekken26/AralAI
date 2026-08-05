from django.utils import timezone
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError

from apps.accounts.models import User
from apps.classrooms.models import Classroom
from apps.curriculum.models import CurriculumTopic
from apps.lessons.models import Lesson, LessonStatus


class ClassroomOwnershipError(PermissionDenied):
    default_detail = "You can only create lessons in classrooms you own."
    default_code = "CLASSROOM_OWNERSHIP_REQUIRED"


class PublishValidationError(ValidationError):
    default_detail = "The lesson is not ready to be published."
    default_code = "LESSON_NOT_PUBLISHABLE"


def _validate_publishable(lesson: Lesson) -> None:
    errors = {}
    if not lesson.title.strip():
        errors["title"] = "A lesson must have a title before it can be published."
    if lesson.topic_id is None:
        errors["topic"] = "A lesson must have a curriculum topic before it can be published."
    if lesson.classroom_id is None:
        errors["classroom"] = "A lesson must belong to a classroom before it can be published."
    objectives = lesson.learning_objectives or []
    if not objectives:
        errors["learning_objectives"] = "A lesson must have at least one learning objective."
    if not lesson.content.strip():
        errors["content"] = "A lesson must have non-empty content before it can be published."
    if errors:
        raise PublishValidationError(errors)


def create_lesson(*, author: User, topic_id: int, classroom_id: int, **fields) -> Lesson:
    classroom = Classroom.objects.filter(pk=classroom_id).first()
    if classroom is None:
        raise ValidationError({"classroom": "Classroom does not exist."})
    if not author.is_teacher or classroom.teacher_id != author.id:
        raise ClassroomOwnershipError()

    topic = CurriculumTopic.objects.filter(pk=topic_id).first()
    if topic is None:
        raise ValidationError({"topic": "Topic does not exist."})

    lesson = Lesson.objects.create(
        topic=topic,
        classroom=classroom,
        author=author,
        title=fields.get("title", ""),
        summary=fields.get("summary", ""),
        learning_objectives=fields.get("learning_objectives", []),
        content=fields.get("content", ""),
    )
    return lesson


def update_lesson(*, lesson: Lesson, author: User, data: dict) -> Lesson:
    if lesson.author_id != author.id:
        raise PermissionDenied("Only the lesson author can edit this lesson.")
    for field, value in data.items():
        setattr(lesson, field, value)
    lesson.version += 1
    lesson.full_clean()
    lesson.save()
    return lesson


def publish_lesson(*, lesson: Lesson, author: User) -> Lesson:
    if lesson.author_id != author.id:
        raise PermissionDenied("Only the lesson author can publish this lesson.")
    _validate_publishable(lesson)
    lesson.status = LessonStatus.PUBLISHED
    lesson.published_at = lesson.published_at or timezone.now()
    lesson.save(update_fields=["status", "published_at", "updated_at"])
    return lesson


def archive_lesson(*, lesson: Lesson, author: User) -> Lesson:
    if lesson.author_id != author.id:
        raise PermissionDenied("Only the lesson author can archive this lesson.")
    lesson.status = LessonStatus.ARCHIVED
    lesson.save(update_fields=["status", "updated_at"])
    return lesson
