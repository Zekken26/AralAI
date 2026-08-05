from types import SimpleNamespace

import logging

from drf_spectacular.utils import (
    OpenApiExample,
    OpenApiResponse,
    extend_schema,
    extend_schema_view,
)
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import UserRole
from apps.accounts.permissions import IsStudent, IsTeacher
from apps.progress.services import process_submitted_attempt
from apps.quizzes import selectors, services
from apps.quizzes.models import Choice, Question, Quiz
from apps.quizzes.serializers import (
    AttemptAnalyticsSerializer,
    AttemptResultSerializer,
    AttemptSerializer,
    ChoiceWriteSerializer,
    ClassroomQuizResultsSerializer,
    MyAttemptSerializer,
    QuestionWriteSerializer,
    QuizCreateSerializer,
    QuizResultsSummarySerializer,
    QuizUpdateSerializer,
    SaveAnswerSerializer,
    SavedAnswerSerializer,
    StudentQuizDetailSerializer,
    StudentQuizSerializer,
    TeacherChoiceSerializer,
    TeacherQuizDetailSerializer,
    TeacherQuizListSerializer,
    TeacherQuestionSerializer,
    TeacherQuizSerializer,
)

QUIZ_NOT_FOUND_DETAIL = "QUIZ_NOT_AVAILABLE, QUIZ_NOT_PUBLISHED, QUIZ_ATTEMPT_LIMIT_REACHED, QUIZ_ATTEMPT_ALREADY_ACTIVE, QUIZ_ATTEMPT_EXPIRED, QUIZ_ATTEMPT_ALREADY_SUBMITTED, QUESTION_NOT_APPROVED, INVALID_QUESTION_CONFIGURATION, INVALID_ANSWER_FORMAT, CHOICE_NOT_IN_QUESTION, NOT_ENROLLED, LESSON_NOT_PUBLISHED"

logger = logging.getLogger(__name__)


class QuizListCreateView(generics.ListCreateAPIView):
    """List quizzes visible to the caller.

    Teachers see their own drafts, published and archived quizzes. Students only see
    published, currently available quizzes in classrooms where their enrollment is ACTIVE.
    """

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if getattr(self.request.user, "role", None) == UserRole.STUDENT:
            return StudentQuizSerializer
        return TeacherQuizListSerializer

    def get_queryset(self):
        role = getattr(self.request.user, "role", None)
        classroom_id = self.request.query_params.get("classroom")
        topic_id = self.request.query_params.get("topic")
        if role == UserRole.STUDENT:
            return selectors.quizzes_for_student(
                self.request.user,
                classroom_id=classroom_id,
                topic_id=topic_id,
            )
        if role == UserRole.TEACHER:
            return selectors.quizzes_for_teacher(
                self.request.user,
                classroom_id=classroom_id,
                topic_id=topic_id,
                status=self.request.query_params.get("status"),
            )
        return Quiz.objects.none()

    @extend_schema(
        request=QuizCreateSerializer,
        responses={201: TeacherQuizSerializer},
        examples=[
            OpenApiExample(
                "Create quiz",
                summary="Create a quiz in an owned classroom",
                value={
                    "lesson": 1,
                    "classroom": 1,
                    "title": "Linear Equations Check",
                    "instructions": "Answer all questions.",
                    "attempt_limit": 2,
                    "time_limit_minutes": 15,
                    "passing_score": 60,
                },
                request_only=True,
            )
        ],
    )
    def create(self, request, *args, **kwargs):
        if not request.user.is_teacher:
            raise PermissionDenied("Only teachers can create quizzes.")
        serializer = QuizCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        quiz = services.create_quiz(
            author=request.user,
            classroom_id=data.pop("classroom"),
            lesson_id=data.pop("lesson"),
            **data,
        )
        return Response(TeacherQuizSerializer(quiz).data, status=status.HTTP_201_CREATED)


class QuizDetailView(generics.GenericAPIView):
    """Role-aware quiz detail.

    Teachers receive full configuration (including answer keys). Students receive only
    approved questions without correct choices, numeric answers, tolerance or explanations.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = TeacherQuizDetailSerializer

    def get_object(self):
        role = getattr(self.request.user, "role", None)
        if role == UserRole.STUDENT:
            return selectors.get_quiz_for_student(self.request.user, self.kwargs["pk"])
        if role == UserRole.TEACHER:
            return selectors.get_quiz_for_teacher(self.request.user, self.kwargs["pk"])
        return None

    def get(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj is None:
            raise NotFound("Quiz not found.")
        serializer_class = (
            StudentQuizDetailSerializer
            if getattr(request.user, "role", None) == UserRole.STUDENT
            else TeacherQuizDetailSerializer
        )
        return Response(serializer_class(obj).data)

    @extend_schema(
        request=QuizUpdateSerializer,
        responses={200: TeacherQuizDetailSerializer},
    )
    def patch(self, request, *args, **kwargs):
        if not request.user.is_teacher:
            raise PermissionDenied("Only teachers can edit quizzes.")
        quiz = selectors.get_quiz_for_teacher(request.user, self.kwargs["pk"])
        if quiz is None:
            raise NotFound("Quiz not found.")
        serializer = QuizUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        quiz = services.update_quiz(quiz=quiz, author=request.user, data=serializer.validated_data)
        return Response(TeacherQuizDetailSerializer(quiz).data)


class QuizPublishView(generics.GenericAPIView):
    permission_classes = [IsTeacher]
    serializer_class = TeacherQuizSerializer

    def get_object(self):
        quiz = selectors.get_quiz_for_teacher(self.request.user, self.kwargs["pk"])
        if quiz is None:
            raise NotFound("Quiz not found.")
        return quiz

    @extend_schema(
        request=None,
        responses={200: TeacherQuizSerializer},
        description=(
            "Publishing requires an owned classroom, a PUBLISHED lesson, at least one "
            "question and every question APPROVED and structurally valid. Sets published_at."
        ),
    )
    def post(self, request, *args, **kwargs):
        quiz = self.get_object()
        quiz = services.publish_quiz(quiz=quiz, author=request.user)
        return Response(TeacherQuizSerializer(quiz).data)


class QuizArchiveView(generics.GenericAPIView):
    permission_classes = [IsTeacher]
    serializer_class = TeacherQuizSerializer

    def get_object(self):
        quiz = selectors.get_quiz_for_teacher(self.request.user, self.kwargs["pk"])
        if quiz is None:
            raise NotFound("Quiz not found.")
        return quiz

    def post(self, request, *args, **kwargs):
        quiz = self.get_object()
        quiz = services.archive_quiz(quiz=quiz, author=request.user)
        return Response(TeacherQuizSerializer(quiz).data)


class QuizQuestionListCreateView(generics.GenericAPIView):
    permission_classes = [IsTeacher]
    serializer_class = TeacherQuestionSerializer

    def get_quiz(self):
        quiz = selectors.get_quiz_for_teacher(self.request.user, self.kwargs["pk"])
        if quiz is None:
            raise NotFound("Quiz not found.")
        return quiz

    def get(self, request, *args, **kwargs):
        quiz = self.get_quiz()
        questions = quiz.questions.prefetch_related("choices").order_by("sequence_order", "id")
        return Response(TeacherQuestionSerializer(questions, many=True).data)

    @extend_schema(
        request=QuestionWriteSerializer,
        responses={201: TeacherQuestionSerializer},
        examples=[
            OpenApiExample(
                "Add multiple-choice question",
                value={
                    "topic": 1,
                    "question_type": "MULTIPLE_CHOICE",
                    "prompt": "Solve for x: 2x + 4 = 12",
                    "difficulty": 2,
                    "points": 5,
                },
                request_only=True,
            )
        ],
    )
    def post(self, request, *args, **kwargs):
        quiz = self.get_quiz()
        serializer = QuestionWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        question = services.create_question(
            quiz=quiz,
            author=request.user,
            topic_id=data.pop("topic"),
            **data,
        )
        return Response(TeacherQuestionSerializer(question).data, status=status.HTTP_201_CREATED)


class QuestionDetailView(generics.GenericAPIView):
    permission_classes = [IsTeacher]
    serializer_class = TeacherQuestionSerializer

    def get_question(self):
        question = (
            Question.objects.select_related("quiz")
            .filter(pk=self.kwargs["pk"], quiz__author=self.request.user)
            .prefetch_related("choices")
            .first()
        )
        if question is None:
            raise NotFound("Question not found.")
        return question

    def get(self, request, *args, **kwargs):
        return Response(TeacherQuestionSerializer(self.get_question()).data)

    @extend_schema(
        request=QuestionWriteSerializer,
        responses={200: TeacherQuestionSerializer},
    )
    def patch(self, request, *args, **kwargs):
        question = self.get_question()
        serializer = QuestionWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        question = services.update_question(
            question=question,
            author=request.user,
            data=serializer.validated_data,
        )
        return Response(TeacherQuestionSerializer(question).data)


class QuestionApproveView(generics.GenericAPIView):
    permission_classes = [IsTeacher]
    serializer_class = TeacherQuestionSerializer

    def get_question(self):
        question = (
            Question.objects.select_related("quiz")
            .filter(pk=self.kwargs["pk"], quiz__author=self.request.user)
            .first()
        )
        if question is None:
            raise NotFound("Question not found.")
        return question

    @extend_schema(
        request=None,
        responses={
            200: TeacherQuestionSerializer,
            422: OpenApiResponse(description="INVALID_QUESTION_CONFIGURATION"),
        },
        description="Approves a question after validating its full configuration.",
    )
    def post(self, request, *args, **kwargs):
        question = services.approve_question(question=self.get_question(), author=request.user)
        return Response(TeacherQuestionSerializer(question).data)


class QuestionRejectView(generics.GenericAPIView):
    permission_classes = [IsTeacher]
    serializer_class = TeacherQuestionSerializer

    def get_question(self):
        question = (
            Question.objects.select_related("quiz")
            .filter(pk=self.kwargs["pk"], quiz__author=self.request.user)
            .first()
        )
        if question is None:
            raise NotFound("Question not found.")
        return question

    def post(self, request, *args, **kwargs):
        question = services.reject_question(question=self.get_question(), author=request.user)
        return Response(TeacherQuestionSerializer(question).data)


class QuestionChoiceListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsTeacher]
    serializer_class = TeacherChoiceSerializer

    def get_question(self):
        question = (
            Question.objects.select_related("quiz")
            .filter(pk=self.kwargs["pk"], quiz__author=self.request.user)
            .first()
        )
        if question is None:
            raise NotFound("Question not found.")
        return question

    def get_queryset(self):
        return self.get_question().choices.all()

    @extend_schema(
        request=ChoiceWriteSerializer,
        responses={201: TeacherChoiceSerializer},
        examples=[
            OpenApiExample(
                "Add choice",
                value={"text": "x = 4", "is_correct": True},
                request_only=True,
            )
        ],
    )
    def create(self, request, *args, **kwargs):
        question = self.get_question()
        serializer = ChoiceWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        choice = services.add_choice(question=question, author=request.user, **serializer.validated_data)
        return Response(TeacherChoiceSerializer(choice).data, status=status.HTTP_201_CREATED)


class ChoiceDetailView(generics.GenericAPIView):
    permission_classes = [IsTeacher]
    serializer_class = TeacherChoiceSerializer

    def get_choice(self):
        choice = (
            Choice.objects.select_related("question__quiz")
            .filter(pk=self.kwargs["pk"], question__quiz__author=self.request.user)
            .first()
        )
        if choice is None:
            raise NotFound("Choice not found.")
        return choice

    @extend_schema(
        request=ChoiceWriteSerializer,
        responses={200: TeacherChoiceSerializer},
    )
    def patch(self, request, *args, **kwargs):
        choice = self.get_choice()
        serializer = ChoiceWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        choice = services.update_choice(choice=choice, author=request.user, data=serializer.validated_data)
        return Response(TeacherChoiceSerializer(choice).data)

    @extend_schema(
        request=None,
        responses={204: None},
        description=(
            "Deleting a choice is blocked when it would invalidate an approved question or "
            "a published quiz (CHOICE_DELETE_BLOCKED)."
        ),
    )
    def delete(self, request, *args, **kwargs):
        services.delete_choice(choice=self.get_choice(), author=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class QuizAttemptsView(generics.GenericAPIView):
    """POST starts an attempt (student). GET lists attempts (classroom teacher)."""

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsTeacher()]
        return [IsStudent()]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return AttemptAnalyticsSerializer
        return AttemptSerializer

    @extend_schema(
        responses={200: AttemptAnalyticsSerializer},
        description="Teacher view of all student attempts on a quiz they own.",
    )
    def get(self, request, *args, **kwargs):
        quiz = selectors.get_quiz_for_teacher(request.user, self.kwargs["pk"])
        if quiz is None:
            raise NotFound("Quiz not found.")
        attempts = selectors.attempts_for_quiz_owner(request.user, self.kwargs["pk"])
        page = self.paginate_queryset(attempts)
        return self.get_paginated_response(AttemptAnalyticsSerializer(page, many=True).data)

    @extend_schema(
        request=None,
        responses={201: AttemptSerializer},
        examples=[
            OpenApiExample(
                "Start attempt",
                value={
                    "id": 1,
                    "quiz": 1,
                    "attempt_number": 1,
                    "status": "IN_PROGRESS",
                    "started_at": "2026-08-04T10:00:00Z",
                    "expires_at": "2026-08-04T10:15:00Z",
                    "submitted_at": None,
                    "answers": [],
                },
            )
        ],
        description=(
            "Starts an attempt. Rejected with 409 when the quiz is not published/available, "
            "the student is not enrolled, the attempt limit is reached (QUIZ_ATTEMPT_LIMIT_REACHED) "
            "or an active attempt already exists (QUIZ_ATTEMPT_ALREADY_ACTIVE)."
        ),
    )
    def post(self, request, *args, **kwargs):
        if selectors.get_quiz_for_student(request.user, self.kwargs["pk"]) is None:
            raise NotFound("Quiz not found or not available.")
        attempt = services.start_quiz_attempt(quiz_id=self.kwargs["pk"], student=request.user)
        return Response(AttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)


class AttemptDetailView(generics.GenericAPIView):
    permission_classes = [IsStudent]
    serializer_class = AttemptSerializer

    def get_attempt(self):
        attempt = selectors.get_attempt_for_student(self.request.user, self.kwargs["pk"])
        if attempt is None:
            raise NotFound("Attempt not found.")
        return attempt

    def get(self, request, *args, **kwargs):
        return Response(AttemptSerializer(self.get_attempt()).data)


class AnswerSaveView(generics.GenericAPIView):
    permission_classes = [IsStudent]
    serializer_class = SaveAnswerSerializer

    def get_attempt(self):
        attempt = selectors.get_attempt_for_student(self.request.user, self.kwargs["pk"])
        if attempt is None:
            raise NotFound("Attempt not found.")
        return attempt

    @extend_schema(
        request=SaveAnswerSerializer,
        responses={200: SavedAnswerSerializer},
        examples=[
            OpenApiExample(
                "Save multiple-choice answer",
                value={"selected_choice": 3},
                request_only=True,
            ),
            OpenApiExample(
                "Save numeric answer",
                value={"numeric_response": 4},
                request_only=True,
            ),
        ],
        description=(
            "Saves or updates an answer while the attempt is IN_PROGRESS. The answer format must "
            "match the question type (INVALID_ANSWER_FORMAT) and the choice must belong to the "
            "question (CHOICE_NOT_IN_QUESTION). Client-supplied is_correct/points fields are ignored."
        ),
    )
    def put(self, request, *args, **kwargs):
        attempt = self.get_attempt()
        serializer = SaveAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        answer = services.save_student_answer(
            attempt=attempt,
            student=request.user,
            question_id=self.kwargs["question_id"],
            data=serializer.validated_data,
        )
        return Response(SavedAnswerSerializer(answer).data)


class AttemptSubmitView(generics.GenericAPIView):
    permission_classes = [IsStudent]
    serializer_class = AttemptResultSerializer

    def get_attempt(self):
        attempt = selectors.get_attempt_for_student(self.request.user, self.kwargs["pk"])
        if attempt is None:
            raise NotFound("Attempt not found.")
        return attempt

    @extend_schema(
        request=None,
        responses={200: AttemptResultSerializer},
        description=(
            "Submits the attempt. All scoring is computed server-side: answered questions are "
            "evaluated, unanswered questions earn zero, the percentage score and passed result "
            "are persisted. Duplicate submission returns 409 QUIZ_ATTEMPT_ALREADY_SUBMITTED; "
            "expired attempts return 409 QUIZ_ATTEMPT_EXPIRED."
        ),
    )
    def post(self, request, *args, **kwargs):
        attempt = self.get_attempt()
        attempt = services.submit_quiz_attempt(attempt=attempt, student=request.user)
        try:
            process_submitted_attempt(attempt.id)
        except Exception:
            logger.exception(
                "Mastery recalculation failed for attempt %s; quiz submission unaffected.",
                attempt.id,
            )
        return Response(AttemptResultSerializer(attempt).data)


class AttemptResultsView(generics.GenericAPIView):
    permission_classes = [IsStudent]
    serializer_class = AttemptResultSerializer

    def get_attempt(self):
        attempt = selectors.get_attempt_for_student(self.request.user, self.kwargs["pk"])
        if attempt is None:
            raise NotFound("Attempt not found.")
        return attempt

    @extend_schema(
        responses={200: AttemptResultSerializer},
        description=(
            "Historical result for a submitted attempt, including the student's answer, correct "
            "answer, explanation, points awarded and total score. Remains available even after "
            "the quiz window closes or the quiz is archived."
        ),
    )
    def get(self, request, *args, **kwargs):
        attempt = self.get_attempt()
        if attempt.status != "SUBMITTED":
            raise services.QuizAttemptNotSubmittedError()
        return Response(AttemptResultSerializer(attempt).data)


class MyAttemptsView(generics.ListAPIView):
    """All quiz attempts belonging to the authenticated student."""

    permission_classes = [IsStudent]
    serializer_class = MyAttemptSerializer
    queryset = Quiz.objects.none()

    def get_queryset(self):
        return selectors.attempts_for_student(self.request.user)


class MyQuizzesView(generics.ListAPIView):
    """Available quizzes for the authenticated student."""

    permission_classes = [IsStudent]
    serializer_class = StudentQuizSerializer
    queryset = Quiz.objects.none()

    def get_queryset(self):
        return selectors.quizzes_for_student(self.request.user)


class QuizResultsSummaryView(generics.GenericAPIView):
    permission_classes = [IsTeacher]
    serializer_class = QuizResultsSummarySerializer

    @extend_schema(
        responses={200: QuizResultsSummarySerializer},
        description="Aggregate performance summary for a quiz the teacher owns.",
    )
    def get(self, request, *args, **kwargs):
        quiz = selectors.get_quiz_for_teacher(request.user, self.kwargs["pk"])
        if quiz is None:
            raise NotFound("Quiz not found.")
        attempts = selectors.quiz_results_summary_attempts(request.user, self.kwargs["pk"])
        summary = SimpleNamespace(quiz=quiz, attempts=list(attempts))
        return Response(QuizResultsSummarySerializer(summary).data)


class ClassroomQuizResultsView(generics.ListAPIView):
    permission_classes = [IsTeacher]
    serializer_class = ClassroomQuizResultsSerializer
    queryset = Quiz.objects.none()

    def get_queryset(self):
        classroom = selectors.get_classroom_for_user(self.request.user, self.kwargs["pk"])
        if classroom is None or classroom.teacher_id != self.request.user.id:
            raise NotFound("Classroom not found.")
        return selectors.classroom_quiz_results(self.request.user, self.kwargs["pk"])