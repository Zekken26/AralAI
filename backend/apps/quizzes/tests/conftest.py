from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.classrooms.models import Classroom, Enrollment, EnrollmentStatus
from apps.lessons.models import Lesson, LessonStatus
from apps.quizzes.models import (
    AttemptStatus,
    Choice,
    Question,
    QuestionType,
    Quiz,
    QuizAttempt,
    QuizStatus,
    ReviewStatus,
)


def make_lesson(classroom, teacher, topic, *, status=LessonStatus.PUBLISHED, title="Lesson"):
    return Lesson.objects.create(
        topic=topic,
        classroom=classroom,
        author=teacher,
        title=title,
        learning_objectives=["Objective"],
        content="Content",
        status=status,
    )


def make_quiz(
    classroom,
    lesson,
    teacher,
    *,
    status=QuizStatus.DRAFT,
    title="Quiz",
    **kwargs,
):
    defaults = {
        "attempt_limit": None,
        "time_limit_minutes": None,
        "available_from": None,
        "available_until": None,
        "passing_score": Decimal("0"),
    }
    defaults.update(kwargs)
    return Quiz.objects.create(
        lesson=lesson,
        classroom=classroom,
        author=teacher,
        title=title,
        status=status,
        **defaults,
    )


def make_mc_question(
    quiz,
    topic,
    *,
    prompt="Which is correct?",
    points=5,
    review_status=ReviewStatus.APPROVED,
):
    question = Question.objects.create(
        quiz=quiz,
        topic=topic,
        question_type=QuestionType.MULTIPLE_CHOICE,
        prompt=prompt,
        difficulty=2,
        points=points,
        review_status=review_status,
    )
    wrong = Choice.objects.create(question=question, text="Wrong", is_correct=False, sequence_order=1)
    right = Choice.objects.create(question=question, text="Right", is_correct=True, sequence_order=2)
    return question, wrong, right


def make_numeric_question(
    quiz,
    topic,
    *,
    answer="4",
    tolerance="0.01",
    points=5,
    review_status=ReviewStatus.APPROVED,
):
    return Question.objects.create(
        quiz=quiz,
        topic=topic,
        question_type=QuestionType.NUMERIC,
        prompt="Solve numerically?",
        difficulty=2,
        points=points,
        numeric_answer=Decimal(answer),
        numeric_tolerance=Decimal(tolerance),
        review_status=review_status,
    )


def make_published_quiz(classroom, lesson, teacher, topic, **kwargs):
    status = kwargs.pop("status", QuizStatus.PUBLISHED)
    quiz = make_quiz(classroom, lesson, teacher, status=status, **kwargs)
    mc, wrong, right = make_mc_question(quiz, topic)
    numeric = make_numeric_question(quiz, topic)
    return quiz, mc, wrong, right, numeric


@pytest.fixture
def classroom(teacher_user, db):
    return Classroom.objects.create(teacher=teacher_user, name="Grade 8 Math", join_code="CODE1234")


@pytest.fixture
def other_classroom(second_teacher, db):
    return Classroom.objects.create(teacher=second_teacher, name="Other Class", join_code="OTHER123")


@pytest.fixture
def inactive_classroom(teacher_user, db):
    return Classroom.objects.create(
        teacher=teacher_user,
        name="Inactive",
        join_code="INACTIVE",
        is_active=False,
    )


@pytest.fixture
def enrollment(classroom, student_user, db):
    return Enrollment.objects.create(
        classroom=classroom,
        student=student_user,
        status=EnrollmentStatus.ACTIVE,
    )


@pytest.fixture
def second_enrollment(classroom, second_student, db):
    return Enrollment.objects.create(
        classroom=classroom,
        student=second_student,
        status=EnrollmentStatus.ACTIVE,
    )


@pytest.fixture
def lesson(classroom, teacher_user, topic, db):
    return make_lesson(classroom, teacher_user, topic)


@pytest.fixture
def draft_lesson(classroom, teacher_user, topic, db):
    return make_lesson(classroom, teacher_user, topic, status=LessonStatus.DRAFT, title="Draft lesson")


@pytest.fixture
def quiz(classroom, lesson, teacher_user, db):
    return make_quiz(classroom, lesson, teacher_user)


@pytest.fixture
def published_quiz_data(classroom, lesson, teacher_user, topic, db):
    return make_published_quiz(classroom, lesson, teacher_user, topic)


@pytest.fixture
def published_quiz(published_quiz_data):
    return published_quiz_data[0]


@pytest.fixture
def mc_question(published_quiz_data):
    return published_quiz_data[1]


@pytest.fixture
def mc_wrong_choice(published_quiz_data):
    return published_quiz_data[2]


@pytest.fixture
def mc_correct_choice(published_quiz_data):
    return published_quiz_data[3]


@pytest.fixture
def numeric_question(published_quiz_data):
    return published_quiz_data[4]


def create_attempt(quiz, student, *, attempt_number=1, status=AttemptStatus.IN_PROGRESS, **kwargs):
    return QuizAttempt.objects.create(
        quiz=quiz,
        student=student,
        attempt_number=attempt_number,
        status=status,
        **kwargs,
    )


@pytest.fixture
def started_attempt(published_quiz, student_user, db):
    return create_attempt(published_quiz, student_user)


@pytest.fixture
def submitted_attempt_data(published_quiz_data, student_user, db):
    """A submitted attempt with the MC question answered."""
    quiz, mc, wrong, right, numeric = published_quiz_data
    attempt = create_attempt(quiz, student_user, attempt_number=1)
    return attempt, mc, wrong, right, numeric