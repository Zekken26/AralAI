from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError

from apps.accounts.models import User
from apps.classrooms.models import Classroom, Enrollment, EnrollmentStatus
from apps.curriculum.models import CurriculumTopic
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
    StudentAnswer,
)


class QuizClassroomOwnershipError(PermissionDenied):
    default_detail = "You can only create quizzes in classrooms you own."
    default_code = "CLASSROOM_OWNERSHIP_REQUIRED"


class QuizNotPublishedError(APIException):
    status_code = 409
    default_detail = "This quiz has not been published yet."
    default_code = "QUIZ_NOT_PUBLISHED"


class QuizNotAvailableError(APIException):
    status_code = 409
    default_detail = "This quiz is currently unavailable."
    default_code = "QUIZ_NOT_AVAILABLE"


class LessonNotPublishedError(APIException):
    status_code = 409
    default_detail = "The linked lesson must be published before the quiz can be used."
    default_code = "LESSON_NOT_PUBLISHED"


class QuizAttemptLimitReachedError(APIException):
    status_code = 409
    default_detail = "You have reached the maximum number of attempts for this quiz."
    default_code = "QUIZ_ATTEMPT_LIMIT_REACHED"


class QuizAttemptAlreadyActiveError(APIException):
    status_code = 409
    default_detail = "You already have an active attempt for this quiz."
    default_code = "QUIZ_ATTEMPT_ALREADY_ACTIVE"


class QuizAttemptExpiredError(APIException):
    status_code = 409
    default_detail = "This attempt has expired and can no longer be changed."
    default_code = "QUIZ_ATTEMPT_EXPIRED"


class QuizAttemptAlreadySubmittedError(APIException):
    status_code = 409
    default_detail = "This attempt has already been submitted."
    default_code = "QUIZ_ATTEMPT_ALREADY_SUBMITTED"


class QuizAttemptNotSubmittedError(APIException):
    status_code = 409
    default_detail = "Results are only available after the attempt has been submitted."
    default_code = "QUIZ_ATTEMPT_NOT_SUBMITTED"


class QuestionNotApprovedError(APIException):
    status_code = 422
    default_detail = "Only approved questions may be used."
    default_code = "QUESTION_NOT_APPROVED"


class InvalidQuestionConfigurationError(APIException):
    status_code = 422
    default_detail = "The question configuration is invalid."
    default_code = "INVALID_QUESTION_CONFIGURATION"


class InvalidAnswerFormatError(APIException):
    status_code = 422
    default_detail = "The submitted answer does not match the question type."
    default_code = "INVALID_ANSWER_FORMAT"


class ChoiceNotInQuestionError(APIException):
    status_code = 422
    default_detail = "The selected choice does not belong to this question."
    default_code = "CHOICE_NOT_IN_QUESTION"


class QuestionNotInQuizError(APIException):
    status_code = 422
    default_detail = "The question does not belong to this quiz."
    default_code = "QUESTION_NOT_IN_QUIZ"


class ChoiceDeleteBlockedError(APIException):
    status_code = 409
    default_detail = "This choice cannot be deleted because it would invalidate the quiz."
    default_code = "CHOICE_DELETE_BLOCKED"


class QuizPublishError(ValidationError):
    default_detail = "The quiz is not ready to be published."
    default_code = "QUIZ_NOT_PUBLISHABLE"


def _require_quiz_owner(quiz: Quiz, user: User) -> None:
    if quiz.author_id != user.id:
        raise PermissionDenied("Only the quiz owner can perform this action.")


def _validate_quiz_fields(
    *,
    attempt_limit,
    time_limit_minutes,
    passing_score,
    available_from,
    available_until,
) -> None:
    errors = {}
    if attempt_limit is not None and attempt_limit < 1:
        errors["attempt_limit"] = "Attempt limit must be null or at least 1."
    if time_limit_minutes is not None and time_limit_minutes <= 0:
        errors["time_limit_minutes"] = "Time limit must be null or greater than 0."
    if passing_score is not None and not (Decimal("0") <= Decimal(passing_score) <= Decimal("100")):
        errors["passing_score"] = "Passing score must be between 0 and 100."
    if available_from and available_until and available_from > available_until:
        errors["available_until"] = "Available until must be after available from."
    if errors:
        raise ValidationError(errors)


def _explain_invalid_config(question: Question) -> dict:
    errors = {}
    if question.question_type == QuestionType.MULTIPLE_CHOICE:
        choices = list(question.choices.all())
        if len(choices) < 2:
            errors["choices"] = "A multiple-choice question needs at least two choices."
        correct = [c for c in choices if c.is_correct]
        if len(correct) != 1:
            errors["is_correct"] = "A multiple-choice question needs exactly one correct choice."
    elif question.question_type == QuestionType.NUMERIC:
        if question.numeric_answer is None:
            errors["numeric_answer"] = "A numeric question must define a numeric answer."
    return errors


def _validate_config(question: Question) -> None:
    errors = _explain_invalid_config(question)
    if errors:
        raise InvalidQuestionConfigurationError(errors)


def _validate_topic(topic_id: int, quiz: Quiz) -> CurriculumTopic:
    topic = CurriculumTopic.objects.filter(pk=topic_id).first()
    if topic is None:
        raise ValidationError({"topic": "Topic does not exist."})
    lesson_topic = quiz.lesson.topic
    if topic_id != lesson_topic.id and topic.subject_id != lesson_topic.subject_id:
        raise ValidationError({"topic": "Topic must match the lesson topic or the same curriculum."})
    return topic


@transaction.atomic
def create_quiz(*, author: User, classroom_id: int, lesson_id: int, **fields) -> Quiz:
    if not author.is_teacher:
        raise PermissionDenied("Only teachers can create quizzes.")
    classroom = Classroom.objects.filter(pk=classroom_id).first()
    if classroom is None:
        raise QuizClassroomOwnershipError()
    if classroom.teacher_id != author.id:
        raise QuizClassroomOwnershipError()

    lesson = Lesson.objects.filter(pk=lesson_id).first()
    if lesson is None:
        raise ValidationError({"lesson": "Lesson does not exist."})
    if lesson.classroom_id != classroom_id:
        raise ValidationError({"lesson": "Lesson must belong to the same classroom as the quiz."})

    _validate_quiz_fields(
        attempt_limit=fields.get("attempt_limit"),
        time_limit_minutes=fields.get("time_limit_minutes"),
        passing_score=fields.get("passing_score", Decimal("0")),
        available_from=fields.get("available_from"),
        available_until=fields.get("available_until"),
    )

    return Quiz.objects.create(
        lesson=lesson,
        classroom=classroom,
        author=author,
        title=fields.get("title", ""),
        instructions=fields.get("instructions", ""),
        attempt_limit=fields.get("attempt_limit"),
        time_limit_minutes=fields.get("time_limit_minutes"),
        available_from=fields.get("available_from"),
        available_until=fields.get("available_until"),
        passing_score=fields.get("passing_score", Decimal("0")),
        randomize_questions=fields.get("randomize_questions", False),
        show_results_immediately=fields.get("show_results_immediately", True),
        status=QuizStatus.DRAFT,
    )


@transaction.atomic
def update_quiz(*, quiz: Quiz, author: User, data: dict) -> Quiz:
    _require_quiz_owner(quiz, author)
    incoming = dict(data)
    incoming["attempt_limit"] = data.get("attempt_limit", quiz.attempt_limit)
    incoming["time_limit_minutes"] = data.get("time_limit_minutes", quiz.time_limit_minutes)
    incoming["passing_score"] = data.get("passing_score", quiz.passing_score)
    incoming["available_from"] = data.get("available_from", quiz.available_from)
    incoming["available_until"] = data.get("available_until", quiz.available_until)
    _validate_quiz_fields(**incoming)
    for field in (
        "title",
        "instructions",
        "attempt_limit",
        "time_limit_minutes",
        "available_from",
        "available_until",
        "passing_score",
        "randomize_questions",
        "show_results_immediately",
    ):
        if field in data:
            setattr(quiz, field, data[field])
    quiz.save()
    return quiz


@transaction.atomic
def publish_quiz(*, quiz: Quiz, author: User) -> Quiz:
    _require_quiz_owner(quiz, author)
    if quiz.lesson.status != LessonStatus.PUBLISHED:
        raise LessonNotPublishedError()
    questions = quiz.questions.all()
    if not questions.exists():
        raise QuizPublishError({"questions": "A quiz cannot be published without at least one question."})
    if questions.exclude(review_status=ReviewStatus.APPROVED).exists():
        raise QuestionNotApprovedError()
    approved = [q for q in questions if q.review_status == ReviewStatus.APPROVED]
    for question in approved:
        _validate_config(question)
    quiz.status = QuizStatus.PUBLISHED
    quiz.published_at = quiz.published_at or timezone.now()
    quiz.save(update_fields=["status", "published_at", "updated_at"])
    return quiz


@transaction.atomic
def archive_quiz(*, quiz: Quiz, author: User) -> Quiz:
    _require_quiz_owner(quiz, author)
    quiz.status = QuizStatus.ARCHIVED
    quiz.save(update_fields=["status", "updated_at"])
    return quiz


@transaction.atomic
def create_question(
    *,
    quiz: Quiz,
    author: User,
    topic_id: int,
    question_type: str,
    prompt: str,
    points: Decimal,
    difficulty: int = 1,
    explanation: str = "",
    numeric_answer=None,
    numeric_tolerance=None,
    sequence_order: int = 0,
) -> Question:
    _require_quiz_owner(quiz, author)
    topic = _validate_topic(topic_id, quiz)

    if question_type not in (QuestionType.MULTIPLE_CHOICE, QuestionType.NUMERIC):
        raise InvalidQuestionConfigurationError({"question_type": "Unsupported question type."})
    if difficulty < 1 or difficulty > 5:
        raise InvalidQuestionConfigurationError({"difficulty": "Difficulty must be between 1 and 5."})
    if Decimal(points) <= 0:
        raise InvalidQuestionConfigurationError({"points": "Points must be greater than zero."})
    if numeric_tolerance is not None and Decimal(numeric_tolerance) < 0:
        raise InvalidQuestionConfigurationError({"numeric_tolerance": "Numeric tolerance must be zero or positive."})
    if numeric_tolerance is None:
        numeric_tolerance = Decimal("0")

    return Question.objects.create(
        quiz=quiz,
        topic=topic,
        question_type=question_type,
        prompt=prompt,
        explanation=explanation,
        difficulty=difficulty,
        points=points,
        numeric_answer=numeric_answer,
        numeric_tolerance=numeric_tolerance,
        sequence_order=sequence_order,
    )


@transaction.atomic
def update_question(*, question: Question, author: User, data: dict) -> Question:
    quiz = question.quiz
    _require_quiz_owner(quiz, author)
    incoming = dict(data)
    incoming.pop("review_status", None)

    if "topic" in incoming:
        question.topic = _validate_topic(incoming.pop("topic"), quiz)
    if "difficulty" in incoming:
        difficulty = incoming["difficulty"]
        if difficulty < 1 or difficulty > 5:
            raise InvalidQuestionConfigurationError({"difficulty": "Difficulty must be between 1 and 5."})
    if "points" in incoming and Decimal(incoming["points"]) <= 0:
        raise InvalidQuestionConfigurationError({"points": "Points must be greater than zero."})
    if "numeric_tolerance" in incoming and Decimal(incoming["numeric_tolerance"]) < 0:
        raise InvalidQuestionConfigurationError({"numeric_tolerance": "Numeric tolerance must be zero or positive."})

    for field, value in incoming.items():
        if field in {
            "prompt",
            "explanation",
            "question_type",
            "difficulty",
            "points",
            "numeric_answer",
            "numeric_tolerance",
            "sequence_order",
        }:
            setattr(question, field, value)
    question.save()

    if question.review_status == ReviewStatus.APPROVED:
        _validate_config(question)
    return question


@transaction.atomic
def approve_question(*, question: Question, author: User) -> Question:
    _require_quiz_owner(question.quiz, author)
    _validate_config(question)
    question.review_status = ReviewStatus.APPROVED
    question.save(update_fields=["review_status", "updated_at"])
    return question


@transaction.atomic
def reject_question(*, question: Question, author: User) -> Question:
    _require_quiz_owner(question.quiz, author)
    question.review_status = ReviewStatus.REJECTED
    question.save(update_fields=["review_status", "updated_at"])
    return question


@transaction.atomic
def add_choice(
    *,
    question: Question,
    author: User,
    text: str,
    is_correct: bool = False,
    sequence_order: int = 0,
) -> Choice:
    _require_quiz_owner(question.quiz, author)
    if question.question_type != QuestionType.MULTIPLE_CHOICE:
        raise InvalidQuestionConfigurationError({"choices": "Only multiple-choice questions can have choices."})
    if not text.strip():
        raise InvalidQuestionConfigurationError({"text": "Choice text cannot be empty."})
    if is_correct:
        question.choices.filter(is_correct=True).update(is_correct=False)
    return Choice.objects.create(
        question=question,
        text=text,
        is_correct=is_correct,
        sequence_order=sequence_order,
    )


@transaction.atomic
def update_choice(*, choice: Choice, author: User, data: dict) -> Choice:
    question = choice.question
    _require_quiz_owner(question.quiz, author)
    if question.question_type != QuestionType.MULTIPLE_CHOICE:
        raise InvalidQuestionConfigurationError({"choices": "Only multiple-choice questions can have choices."})
    if "text" in data:
        if not data["text"].strip():
            raise InvalidQuestionConfigurationError({"text": "Choice text cannot be empty."})
        choice.text = data["text"]
    if "sequence_order" in data:
        choice.sequence_order = data["sequence_order"]
    if "is_correct" in data:
        making_correct = bool(data["is_correct"])
        if making_correct == choice.is_correct:
            pass
        elif making_correct:
            question.choices.exclude(pk=choice.pk).filter(is_correct=True).update(is_correct=False)
            choice.is_correct = True
        else:
            if question.review_status == ReviewStatus.APPROVED:
                _validate_config(question)
            choice.is_correct = False
    choice.save()
    if question.review_status == ReviewStatus.APPROVED:
        _validate_config(question)
    return choice


@transaction.atomic
def delete_choice(*, choice: Choice, author: User) -> None:
    question = choice.question
    _require_quiz_owner(question.quiz, author)
    protected = (
        question.review_status == ReviewStatus.APPROVED or question.quiz.status != QuizStatus.DRAFT
    )
    if protected:
        remaining = question.choices.exclude(pk=choice.pk)
        if remaining.count() < 2 or not remaining.filter(is_correct=True).exists():
            raise ChoiceDeleteBlockedError()
    choice.delete()


def _first_correct_choice(question: Question):
    return question.choices.filter(is_correct=True).first()


def _is_answer_correct(question: Question, answer: StudentAnswer | None) -> bool:
    if answer is None:
        return False
    if question.question_type == QuestionType.MULTIPLE_CHOICE:
        correct = _first_correct_choice(question)
        return bool(correct) and answer.selected_choice_id == correct.id
    if question.question_type == QuestionType.NUMERIC:
        response = answer.numeric_response
        if response is None or question.numeric_answer is None:
            return False
        tolerance = question.numeric_tolerance
        if tolerance is None:
            tolerance = Decimal("0")
        return abs(Decimal(response) - Decimal(question.numeric_answer)) <= Decimal(tolerance)
    return False


def calculate_attempt_score(questions, answers_by_question):
    """Return (earned, maximum, per_question) using Decimal arithmetic."""
    earned = Decimal("0")
    maximum = Decimal("0")
    per_question = []
    for question in questions:
        maximum += question.points
        correct = _is_answer_correct(question, answers_by_question.get(question.id))
        awarded = question.points if correct else Decimal("0")
        earned += awarded
        per_question.append(
            {
                "question": question,
                "answer": answers_by_question.get(question.id),
                "is_correct": correct,
                "points_awarded": awarded,
            }
        )
    return earned, maximum, per_question


def _percentage(earned: Decimal, maximum: Decimal) -> Decimal:
    if maximum <= 0:
        return Decimal("0")
    return (earned / maximum * Decimal("100")).quantize(Decimal("0.01"))


def _mark_expired(attempt: QuizAttempt, now=None) -> bool:
    now = now or timezone.now()
    if attempt.status == AttemptStatus.IN_PROGRESS and attempt.expires_at and now > attempt.expires_at:
        attempt.status = AttemptStatus.EXPIRED
        attempt.save(update_fields=["status", "updated_at"])
        return True
    return False


def _check_attempt_state(attempt_id: int):
    """Lock the attempt, apply expiry, and return (attempt, now).

    Runs in its own transaction so that marking an attempt EXPIRED persists even
    when the caller subsequently raises a state error.
    """
    with transaction.atomic():
        attempt = QuizAttempt.objects.select_for_update().get(pk=attempt_id)
        now = timezone.now()
        _mark_expired(attempt, now)
    return attempt, now


@transaction.atomic
def start_quiz_attempt(*, quiz_id: int, student: User) -> QuizAttempt:
    quiz = Quiz.objects.select_for_update().filter(pk=quiz_id).first()
    if quiz is None:
        raise QuizNotAvailableError()
    if quiz.status != QuizStatus.PUBLISHED:
        raise QuizNotPublishedError()
    if not quiz.classroom.is_active:
        raise QuizNotAvailableError()

    enrolled = Enrollment.objects.filter(
        classroom=quiz.classroom,
        student=student,
        status=EnrollmentStatus.ACTIVE,
    ).exists()
    if not enrolled:
        raise PermissionDenied("You must be enrolled in this classroom to take the quiz.")

    if quiz.lesson.status != LessonStatus.PUBLISHED:
        raise LessonNotPublishedError()

    now = timezone.now()
    if quiz.available_from and now < quiz.available_from:
        raise QuizNotAvailableError()
    if quiz.available_until and now > quiz.available_until:
        raise QuizNotAvailableError()

    if not quiz.questions.filter(review_status=ReviewStatus.APPROVED).exists():
        raise QuizNotAvailableError()

    attempts = list(quiz.attempts.select_for_update().filter(student=student))
    for attempt in attempts:
        if _mark_expired(attempt, now):
            attempt.refresh_from_db()
    attempts = list(quiz.attempts.filter(student=student))

    active = [a for a in attempts if a.status == AttemptStatus.IN_PROGRESS]
    if active:
        raise QuizAttemptAlreadyActiveError()
    if quiz.attempt_limit is not None and len(attempts) >= quiz.attempt_limit:
        raise QuizAttemptLimitReachedError()

    attempt_number = max((a.attempt_number for a in attempts), default=0) + 1
    kwargs = {
        "quiz": quiz,
        "student": student,
        "attempt_number": attempt_number,
        "status": AttemptStatus.IN_PROGRESS,
    }
    if quiz.time_limit_minutes:
        kwargs["expires_at"] = now + timedelta(minutes=quiz.time_limit_minutes)
    try:
        return QuizAttempt.objects.create(**kwargs)
    except IntegrityError as exc:
        raise QuizAttemptAlreadyActiveError() from exc


def save_student_answer(
    *,
    attempt: QuizAttempt,
    student: User,
    question_id: int,
    data: dict,
) -> StudentAnswer:
    if attempt.student_id != student.id:
        raise PermissionDenied("This attempt belongs to another student.")

    attempt, _ = _check_attempt_state(attempt.pk)
    if attempt.status == AttemptStatus.EXPIRED:
        raise QuizAttemptExpiredError()
    if attempt.status == AttemptStatus.SUBMITTED:
        raise QuizAttemptAlreadySubmittedError()

    with transaction.atomic():
        attempt = QuizAttempt.objects.select_for_update().get(pk=attempt.pk)
        if attempt.status != AttemptStatus.IN_PROGRESS:
            if attempt.status == AttemptStatus.EXPIRED:
                raise QuizAttemptExpiredError()
            raise QuizAttemptAlreadySubmittedError()

        question = Question.objects.filter(pk=question_id, quiz_id=attempt.quiz_id).first()
        if question is None:
            raise QuestionNotInQuizError()
        if question.review_status != ReviewStatus.APPROVED:
            raise QuestionNotApprovedError()

        selected_choice_id = data.get("selected_choice")
        numeric_response = data.get("numeric_response")

        if question.question_type == QuestionType.MULTIPLE_CHOICE:
            if numeric_response is not None:
                raise InvalidAnswerFormatError()
            if selected_choice_id is None:
                raise InvalidAnswerFormatError()
            if not Choice.objects.filter(pk=selected_choice_id, question_id=question.id).exists():
                raise ChoiceNotInQuestionError()
            saved_choice = Choice.objects.get(pk=selected_choice_id)
            answer, _ = StudentAnswer.objects.get_or_create(attempt=attempt, question=question)
            answer.selected_choice = saved_choice
            answer.numeric_response = None
        else:
            if selected_choice_id is not None:
                raise InvalidAnswerFormatError()
            if numeric_response is None:
                raise InvalidAnswerFormatError()
            try:
                Decimal(str(numeric_response))
            except (InvalidOperation, ValueError, TypeError) as exc:
                raise InvalidAnswerFormatError() from exc
            answer, _ = StudentAnswer.objects.get_or_create(attempt=attempt, question=question)
            answer.numeric_response = Decimal(str(numeric_response))
            answer.selected_choice = None

        answer.answered_at = timezone.now()
        answer.save()
    return answer


def submit_quiz_attempt(*, attempt: QuizAttempt, student: User) -> QuizAttempt:
    if attempt.student_id != student.id:
        raise PermissionDenied("This attempt belongs to another student.")

    attempt, now = _check_attempt_state(attempt.pk)
    if attempt.status == AttemptStatus.EXPIRED:
        raise QuizAttemptExpiredError()
    if attempt.status == AttemptStatus.SUBMITTED:
        raise QuizAttemptAlreadySubmittedError()

    with transaction.atomic():
        attempt = QuizAttempt.objects.select_for_update().get(pk=attempt.pk)
        Quiz.objects.select_for_update().filter(pk=attempt.quiz_id).first()
        now = timezone.now()
        _mark_expired(attempt, now)
        if attempt.status == AttemptStatus.EXPIRED:
            raise QuizAttemptExpiredError()
        if attempt.status == AttemptStatus.SUBMITTED:
            raise QuizAttemptAlreadySubmittedError()

        questions = list(
            attempt.quiz.questions.filter(review_status=ReviewStatus.APPROVED)
            .prefetch_related("choices")
            .order_by("sequence_order", "id")
        )
        answers = {
            answer.question_id: answer for answer in attempt.answers.select_related("selected_choice")
        }

        earned, maximum, evaluated = calculate_attempt_score(questions, answers)

        for item in evaluated:
            answer = item["answer"]
            if answer is not None and answer.is_correct is None:
                answer.is_correct = item["is_correct"]
                answer.points_awarded = item["points_awarded"]
                answer.answered_at = now
                answer.save(update_fields=["is_correct", "points_awarded", "answered_at", "updated_at"])

        quiz = attempt.quiz
        score = _percentage(earned, maximum)
        attempt.earned_points = earned
        attempt.maximum_points = maximum
        attempt.score = score
        attempt.passed = score >= quiz.passing_score
        attempt.status = AttemptStatus.SUBMITTED
        attempt.submitted_at = now
        attempt.save(
            update_fields=[
                "earned_points",
                "maximum_points",
                "score",
                "passed",
                "status",
                "submitted_at",
                "updated_at",
            ]
        )
    return attempt


def expire_quiz_attempt(*, attempt: QuizAttempt, now=None) -> bool:
    return _mark_expired(attempt, now)


@transaction.atomic
def expire_overdue_attempts(now=None) -> int:
    now = now or timezone.now()
    candidates = QuizAttempt.objects.filter(
        status=AttemptStatus.IN_PROGRESS,
        expires_at__isnull=False,
        expires_at__lt=now,
    ).select_for_update()
    count = 0
    for attempt in candidates:
        attempt.status = AttemptStatus.EXPIRED
        attempt.save(update_fields=["status", "updated_at"])
        count += 1
    return count