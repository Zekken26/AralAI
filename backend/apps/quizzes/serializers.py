from decimal import Decimal

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.accounts.serializers import UserSummarySerializer
from apps.quizzes.models import (
    AttemptStatus,
    Choice,
    Question,
    QuestionType,
    Quiz,
    QuizAttempt,
    StudentAnswer,
)


class QuizCreateSerializer(serializers.Serializer):
    lesson = serializers.IntegerField()
    classroom = serializers.IntegerField()
    title = serializers.CharField(max_length=200, allow_blank=True)
    instructions = serializers.CharField(required=False, allow_blank=True)
    attempt_limit = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    time_limit_minutes = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    available_from = serializers.DateTimeField(required=False, allow_null=True)
    available_until = serializers.DateTimeField(required=False, allow_null=True)
    passing_score = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=0,
        max_value=100,
        required=False,
        default=0,
    )
    randomize_questions = serializers.BooleanField(required=False, default=False)
    show_results_immediately = serializers.BooleanField(required=False, default=True)


class QuizUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, required=False, allow_blank=True)
    instructions = serializers.CharField(required=False, allow_blank=True)
    attempt_limit = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    time_limit_minutes = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    available_from = serializers.DateTimeField(required=False, allow_null=True)
    available_until = serializers.DateTimeField(required=False, allow_null=True)
    passing_score = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=0,
        max_value=100,
        required=False,
    )
    randomize_questions = serializers.BooleanField(required=False)
    show_results_immediately = serializers.BooleanField(required=False)


class TeacherQuizSerializer(serializers.ModelSerializer):
    author = UserSummarySerializer(read_only=True)
    lesson = serializers.IntegerField(source="lesson_id", read_only=True)
    classroom = serializers.IntegerField(source="classroom_id", read_only=True)

    class Meta:
        model = Quiz
        fields = [
            "id",
            "lesson",
            "classroom",
            "author",
            "title",
            "instructions",
            "status",
            "attempt_limit",
            "time_limit_minutes",
            "available_from",
            "available_until",
            "passing_score",
            "randomize_questions",
            "show_results_immediately",
            "published_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class TeacherQuizListSerializer(TeacherQuizSerializer):
    question_count = serializers.SerializerMethodField()

    class Meta(TeacherQuizSerializer.Meta):
        fields = TeacherQuizSerializer.Meta.fields + ["question_count"]

    def get_question_count(self, obj: Quiz) -> int:
        questions = getattr(obj, "questions", None)
        if questions is not None:
            return questions.all().count() if not isinstance(questions, list) else len(questions)
        return obj.questions.count()


class TeacherChoiceSerializer(serializers.ModelSerializer):
    is_correct = serializers.BooleanField()

    class Meta:
        model = Choice
        fields = ["id", "text", "is_correct", "sequence_order"]
        read_only_fields = ["id"]


class TeacherQuestionSerializer(serializers.ModelSerializer):
    quiz = serializers.IntegerField(source="quiz_id", read_only=True)
    topic = serializers.IntegerField(source="topic_id", read_only=True)
    choices = TeacherChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = [
            "id",
            "quiz",
            "topic",
            "question_type",
            "prompt",
            "explanation",
            "difficulty",
            "points",
            "numeric_answer",
            "numeric_tolerance",
            "is_ai_generated",
            "review_status",
            "sequence_order",
            "choices",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "quiz",
            "is_ai_generated",
            "review_status",
            "created_at",
            "updated_at",
        ]


class TeacherQuizDetailSerializer(TeacherQuizSerializer):
    questions = TeacherQuestionSerializer(many=True, read_only=True)

    class Meta(TeacherQuizSerializer.Meta):
        fields = TeacherQuizSerializer.Meta.fields + ["questions"]


class QuestionWriteSerializer(serializers.Serializer):
    topic = serializers.IntegerField()
    question_type = serializers.ChoiceField(choices=QuestionType.choices)
    prompt = serializers.CharField()
    explanation = serializers.CharField(required=False, allow_blank=True)
    difficulty = serializers.IntegerField(min_value=1, max_value=5, default=1)
    points = serializers.DecimalField(max_digits=6, decimal_places=2, min_value=Decimal("0.01"))
    numeric_answer = serializers.DecimalField(
        max_digits=20,
        decimal_places=10,
        required=False,
        allow_null=True,
    )
    numeric_tolerance = serializers.DecimalField(
        max_digits=20,
        decimal_places=10,
        required=False,
        allow_null=True,
        min_value=0,
    )
    sequence_order = serializers.IntegerField(required=False, default=0)


class ChoiceWriteSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=500)
    is_correct = serializers.BooleanField(required=False, default=False)
    sequence_order = serializers.IntegerField(required=False, default=0)


class StudentChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ["id", "text", "sequence_order"]
        read_only_fields = fields


class StudentQuestionSerializer(serializers.ModelSerializer):
    topic = serializers.IntegerField(source="topic_id", read_only=True)
    choices = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            "id",
            "topic",
            "question_type",
            "prompt",
            "difficulty",
            "points",
            "sequence_order",
            "choices",
        ]
        read_only_fields = fields

    def get_choices(self, obj: Question):
        if obj.question_type != QuestionType.MULTIPLE_CHOICE:
            return []
        return StudentChoiceSerializer(obj.choices.all(), many=True).data


class StudentQuizSerializer(serializers.ModelSerializer):
    lesson = serializers.IntegerField(source="lesson_id", read_only=True)
    classroom = serializers.IntegerField(source="classroom_id", read_only=True)
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            "id",
            "lesson",
            "classroom",
            "title",
            "instructions",
            "status",
            "attempt_limit",
            "time_limit_minutes",
            "available_from",
            "available_until",
            "passing_score",
            "randomize_questions",
            "show_results_immediately",
            "published_at",
            "question_count",
        ]
        read_only_fields = fields

    def get_question_count(self, obj: Quiz) -> int:
        approved = getattr(obj, "approved_questions", None)
        if approved is not None:
            return len(approved)
        return obj.questions.filter(review_status="APPROVED").count()


class StudentQuizDetailSerializer(StudentQuizSerializer):
    questions = serializers.SerializerMethodField()

    class Meta(StudentQuizSerializer.Meta):
        fields = StudentQuizSerializer.Meta.fields + ["questions"]

    def get_questions(self, obj: Quiz):
        approved = getattr(obj, "approved_questions", None)
        if approved is None:
            approved = list(obj.questions.filter(review_status="APPROVED").prefetch_related("choices"))
        return StudentQuestionSerializer(approved, many=True).data


class AnswerPreviewSerializer(serializers.Serializer):
    question = serializers.IntegerField()
    selected_choice = serializers.IntegerField(allow_null=True)
    numeric_response = serializers.DecimalField(
        max_digits=20,
        decimal_places=10,
        allow_null=True,
    )
    answered_at = serializers.DateTimeField()


class AttemptSerializer(serializers.ModelSerializer):
    quiz = serializers.IntegerField(source="quiz_id", read_only=True)
    answers = serializers.SerializerMethodField()

    class Meta:
        model = QuizAttempt
        fields = [
            "id",
            "quiz",
            "attempt_number",
            "status",
            "started_at",
            "expires_at",
            "submitted_at",
            "answers",
        ]
        read_only_fields = fields

    @extend_schema_field(AnswerPreviewSerializer(many=True))
    def get_answers(self, attempt: QuizAttempt):
        payload = []
        for answer in attempt.answers.all():
            item = {
                "question": answer.question_id,
                "selected_choice": answer.selected_choice_id,
                "numeric_response": answer.numeric_response,
                "answered_at": answer.answered_at,
            }
            payload.append(item)
        return payload


class MyAttemptSerializer(serializers.ModelSerializer):
    quiz = serializers.IntegerField(source="quiz_id", read_only=True)
    quiz_title = serializers.CharField(source="quiz.title", read_only=True)
    time_limit_minutes = serializers.IntegerField(source="quiz.time_limit_minutes", read_only=True)

    class Meta:
        model = QuizAttempt
        fields = [
            "id",
            "quiz",
            "quiz_title",
            "attempt_number",
            "status",
            "score",
            "passed",
            "started_at",
            "expires_at",
            "submitted_at",
            "time_limit_minutes",
        ]
        read_only_fields = fields


class SaveAnswerSerializer(serializers.Serializer):
    selected_choice = serializers.IntegerField(required=False, allow_null=True)
    numeric_response = serializers.DecimalField(
        max_digits=20,
        decimal_places=10,
        required=False,
        allow_null=True,
    )


class SavedAnswerSerializer(serializers.ModelSerializer):
    question = serializers.IntegerField(source="question_id", read_only=True)

    class Meta:
        model = StudentAnswer
        fields = [
            "id",
            "question",
            "selected_choice",
            "numeric_response",
            "answered_at",
        ]
        read_only_fields = fields


class QuestionResultItemSerializer(serializers.Serializer):
    question = serializers.IntegerField()
    prompt = serializers.CharField()
    question_type = serializers.CharField()
    selected_choice = serializers.IntegerField(allow_null=True)
    numeric_response = serializers.DecimalField(
        max_digits=20,
        decimal_places=10,
        allow_null=True,
    )
    is_correct = serializers.BooleanField()
    points_awarded = serializers.DecimalField(max_digits=10, decimal_places=2)
    correct_choice = serializers.IntegerField(allow_null=True)
    numeric_answer = serializers.DecimalField(
        max_digits=20,
        decimal_places=10,
        allow_null=True,
    )
    explanation = serializers.CharField()


class AttemptResultSerializer(serializers.ModelSerializer):
    quiz = serializers.IntegerField(source="quiz_id", read_only=True)
    quiz_title = serializers.CharField(source="quiz.title", read_only=True)
    questions = serializers.SerializerMethodField()

    class Meta:
        model = QuizAttempt
        fields = [
            "id",
            "quiz",
            "quiz_title",
            "attempt_number",
            "status",
            "score",
            "earned_points",
            "maximum_points",
            "passed",
            "started_at",
            "expires_at",
            "submitted_at",
            "questions",
        ]
        read_only_fields = fields

    @extend_schema_field(QuestionResultItemSerializer(many=True))
    def get_questions(self, attempt: QuizAttempt):
        answers = {a.question_id: a for a in attempt.answers.all()}
        questions = self._approved_questions(attempt.quiz)
        items = []
        for q in questions:
            answer = answers.get(q.id)
            correct_choice = None
            if q.question_type == QuestionType.MULTIPLE_CHOICE:
                correct = next((c for c in q.choices.all() if c.is_correct), None)
                correct_choice = correct.id if correct else None
            items.append(
                {
                    "question": q.id,
                    "prompt": q.prompt,
                    "question_type": q.question_type,
                    "selected_choice": answer.selected_choice_id if answer else None,
                    "numeric_response": answer.numeric_response if answer else None,
                    "is_correct": bool(answer.is_correct) if answer else False,
                    "points_awarded": answer.points_awarded if answer else "0.00",
                    "correct_choice": correct_choice,
                    "numeric_answer": q.numeric_answer,
                    "explanation": q.explanation,
                }
            )
        return items

    def _approved_questions(self, quiz: Quiz):
        approved = getattr(quiz, "approved_questions", None)
        if approved is not None:
            return approved
        return quiz.questions.filter(review_status="APPROVED").prefetch_related("choices")


class AnswerSummarySerializer(serializers.Serializer):
    question = serializers.IntegerField()
    prompt = serializers.CharField()
    question_type = serializers.CharField()
    selected_choice = serializers.IntegerField(allow_null=True)
    numeric_response = serializers.DecimalField(
        max_digits=20,
        decimal_places=10,
        allow_null=True,
    )
    is_correct = serializers.BooleanField()
    points_awarded = serializers.DecimalField(max_digits=10, decimal_places=2)
    correct_choice = serializers.IntegerField(allow_null=True)
    numeric_answer = serializers.DecimalField(
        max_digits=20,
        decimal_places=10,
        allow_null=True,
    )


class AttemptAnalyticsSerializer(serializers.ModelSerializer):
    student = UserSummarySerializer(read_only=True)
    answers = serializers.SerializerMethodField()

    class Meta:
        model = QuizAttempt
        fields = [
            "id",
            "student",
            "attempt_number",
            "status",
            "score",
            "earned_points",
            "maximum_points",
            "passed",
            "started_at",
            "expires_at",
            "submitted_at",
            "answers",
        ]
        read_only_fields = fields

    @extend_schema_field(AnswerSummarySerializer(many=True))
    def get_answers(self, attempt: QuizAttempt):
        answers = {a.question_id: a for a in attempt.answers.all()}
        questions = self._approved_questions(attempt.quiz)
        items = []
        for q in questions:
            answer = answers.get(q.id)
            correct_choice = None
            if q.question_type == QuestionType.MULTIPLE_CHOICE:
                correct = next((c for c in q.choices.all() if c.is_correct), None)
                correct_choice = correct.id if correct else None
            items.append(
                {
                    "question": q.id,
                    "prompt": q.prompt,
                    "question_type": q.question_type,
                    "selected_choice": answer.selected_choice_id if answer else None,
                    "numeric_response": answer.numeric_response if answer else None,
                    "is_correct": bool(answer.is_correct) if answer else False,
                    "points_awarded": answer.points_awarded if answer else "0.00",
                    "correct_choice": correct_choice,
                    "numeric_answer": q.numeric_answer,
                }
            )
        return items

    def _approved_questions(self, quiz: Quiz):
        approved = getattr(quiz, "approved_questions", None)
        if approved is not None:
            return approved
        return quiz.questions.filter(review_status="APPROVED").prefetch_related("choices")


class StudentSummaryItemSerializer(serializers.Serializer):
    student = UserSummarySerializer(read_only=True)
    attempts = serializers.IntegerField()
    best_score = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        allow_null=True,
    )
    passed_attempts = serializers.IntegerField()
    last_submitted_at = serializers.DateTimeField(allow_null=True)


class QuizResultsSummarySerializer(serializers.Serializer):
    quiz = serializers.IntegerField(source="quiz.id")
    quiz_title = serializers.CharField(source="quiz.title")
    total_attempts = serializers.SerializerMethodField()
    submitted_attempts = serializers.SerializerMethodField()
    average_score = serializers.SerializerMethodField()
    pass_rate = serializers.SerializerMethodField()
    students = serializers.SerializerMethodField()

    def get_total_attempts(self, obj) -> int:
        return len(obj.attempts)

    def get_submitted_attempts(self, obj) -> int:
        return sum(1 for a in obj.attempts if a.status == AttemptStatus.SUBMITTED)

    @extend_schema_field(serializers.FloatField(allow_null=True))
    def get_average_score(self, obj):
        scores = [a.score for a in obj.attempts if a.status == AttemptStatus.SUBMITTED and a.score is not None]
        if not scores:
            return None
        return str(sum(scores) / len(scores))

    @extend_schema_field(serializers.FloatField(allow_null=True))
    def get_pass_rate(self, obj):
        submitted = [a for a in obj.attempts if a.status == AttemptStatus.SUBMITTED]
        if not submitted:
            return None
        return str(sum(1 for a in submitted if a.passed) / len(submitted))

    @extend_schema_field(StudentSummaryItemSerializer(many=True))
    def get_students(self, obj):
        rows = {}
        for attempt in obj.attempts:
            if attempt.status != AttemptStatus.SUBMITTED:
                continue
            student = attempt.student
            row = rows.setdefault(
                student.id,
                {
                    "student": UserSummarySerializer(student).data,
                    "attempts": 0,
                    "best_score": None,
                    "passed_attempts": 0,
                    "last_submitted_at": None,
                },
            )
            row["attempts"] += 1
            if attempt.passed:
                row["passed_attempts"] += 1
            if attempt.score is not None and (
                row["best_score"] is None or attempt.score > row["best_score"]
            ):
                row["best_score"] = attempt.score
            if row["last_submitted_at"] is None or (
                attempt.submitted_at and attempt.submitted_at > row["last_submitted_at"]
            ):
                row["last_submitted_at"] = attempt.submitted_at
        return list(rows.values())


class ClassroomQuizResultsSerializer(serializers.ModelSerializer):
    quiz = serializers.IntegerField(source="id", read_only=True)
    title = serializers.CharField(read_only=True)
    total_attempts = serializers.IntegerField(read_only=True)
    submitted_attempts = serializers.IntegerField(read_only=True)
    passed_attempts = serializers.IntegerField(read_only=True)
    average_score = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Quiz
        fields = [
            "quiz",
            "title",
            "status",
            "total_attempts",
            "submitted_attempts",
            "passed_attempts",
            "average_score",
        ]
        read_only_fields = fields