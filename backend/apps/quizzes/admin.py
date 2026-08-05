from django.contrib import admin

from apps.quizzes.models import Choice, Question, Quiz, QuizAttempt, StudentAnswer


class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 0
    fields = ("text", "is_correct", "sequence_order")
    readonly_fields = ("id",)


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0
    fields = (
        "prompt",
        "question_type",
        "difficulty",
        "points",
        "review_status",
        "sequence_order",
    )
    readonly_fields = ("id",)


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "classroom",
        "lesson",
        "author",
        "status",
        "attempt_limit",
        "time_limit_minutes",
        "passing_score",
        "published_at",
    )
    list_filter = ("status", "classroom")
    search_fields = ("title", "author__email", "classroom__name")
    readonly_fields = ("published_at", "created_at", "updated_at")
    inlines = [QuestionInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "prompt",
        "quiz",
        "question_type",
        "difficulty",
        "points",
        "review_status",
        "is_ai_generated",
        "sequence_order",
    )
    list_filter = ("question_type", "review_status", "difficulty", "is_ai_generated")
    search_fields = ("prompt", "quiz__title")
    readonly_fields = ("created_at", "updated_at")
    inlines = [ChoiceInline]


@admin.register(Choice)
class ChoiceAdmin(admin.ModelAdmin):
    list_display = ("id", "text", "question", "is_correct", "sequence_order")
    list_filter = ("is_correct",)
    search_fields = ("text", "question__prompt")

    def has_add_permission(self, request):
        return False


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "quiz",
        "student",
        "attempt_number",
        "status",
        "score",
        "earned_points",
        "maximum_points",
        "passed",
        "started_at",
        "submitted_at",
    )
    list_filter = ("status", "passed", "quiz")
    search_fields = ("student__email", "quiz__title")
    readonly_fields = (
        "quiz",
        "student",
        "attempt_number",
        "score",
        "earned_points",
        "maximum_points",
        "passed",
        "started_at",
        "expires_at",
        "submitted_at",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False


@admin.register(StudentAnswer)
class StudentAnswerAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "attempt",
        "question",
        "selected_choice",
        "numeric_response",
        "is_correct",
        "points_awarded",
        "answered_at",
    )
    list_filter = ("is_correct",)
    search_fields = ("attempt__student__email", "question__prompt")
    readonly_fields = (
        "attempt",
        "question",
        "selected_choice",
        "numeric_response",
        "is_correct",
        "points_awarded",
        "answered_at",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False