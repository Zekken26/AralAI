from rest_framework.permissions import BasePermission

from apps.quizzes.models import Choice, Question, Quiz, QuizAttempt


class IsQuizOwner(BasePermission):
    """Object-level: only the teacher who authored the quiz."""

    message = "Only the quiz owner can perform this action."

    def has_object_permission(self, request, view, obj) -> bool:
        if isinstance(obj, Choice):
            obj = obj.question.quiz
        elif isinstance(obj, Question):
            obj = obj.quiz
        return request.user.is_authenticated and obj.author_id == request.user.id


class IsAttemptOwner(BasePermission):
    """Object-level: only the student who owns the attempt."""

    message = "Only the attempt owner can perform this action."

    def has_object_permission(self, request, view, obj) -> bool:
        if not isinstance(obj, QuizAttempt):
            return False
        return request.user.is_authenticated and obj.student_id == request.user.id


class IsQuizClassroomOwner(BasePermission):
    """Object-level: only the teacher who owns the quiz's classroom."""

    message = "Only the classroom owner can view these attempts."

    def has_object_permission(self, request, view, obj) -> bool:
        if isinstance(obj, Quiz):
            classroom_owner = obj.classroom.teacher_id
        elif isinstance(obj, QuizAttempt):
            classroom_owner = obj.quiz.classroom.teacher_id
        else:
            return False
        return request.user.is_authenticated and classroom_owner == request.user.id


class CanViewAttemptAsTeacher(IsQuizClassroomOwner):
    """Attempts are visible to the teacher who owns the quiz classroom."""


class CanAccessPublishedQuiz(BasePermission):
    """Object-level: student visibility rules for a published, available quiz."""

    message = "This quiz is not available to you."

    def has_object_permission(self, request, view, obj) -> bool:
        if not isinstance(obj, Quiz):
            return False
        if not request.user.is_authenticated:
            return False
        from apps.quizzes.selectors import get_quiz_for_student

        return get_quiz_for_student(request.user, obj.pk) is not None