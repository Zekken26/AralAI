from django.contrib import admin

from apps.progress.models import MasteryHistory, Recommendation, TopicMastery


class TopicMasteryAdmin(admin.ModelAdmin):
    list_display = ("student", "topic", "mastery_score", "status", "last_attempted_at")
    list_filter = ("status",)
    search_fields = (
        "student__email",
        "student__first_name",
        "student__last_name",
        "topic__title",
    )
    readonly_fields = [
        "mastery_score",
        "total_questions_answered",
        "total_correct_answers",
        "total_points_earned",
        "total_points_possible",
        "recent_accuracy",
        "difficulty_score",
        "consistency_score",
        "independent_score",
        "status",
        "first_attempted_at",
        "last_attempted_at",
        "last_recalculated_at",
        "created_at",
        "updated_at",
    ]


class MasteryHistoryAdmin(admin.ModelAdmin):
    list_display = ("topic_mastery", "quiz_attempt", "previous_score", "new_score", "created_at")
    list_select_related = ("topic_mastery", "quiz_attempt")
    readonly_fields = [
        "topic_mastery",
        "quiz_attempt",
        "previous_score",
        "new_score",
        "score_change",
        "reason",
        "created_at",
    ]


class RecommendationAdmin(admin.ModelAdmin):
    list_display = ("student", "topic", "recommendation_type", "priority", "status")
    list_filter = ("status", "priority", "recommendation_type")
    search_fields = (
        "student__email",
        "student__first_name",
        "student__last_name",
        "topic__title",
        "title",
    )
    readonly_fields = [
        "student",
        "topic",
        "recommendation_type",
        "priority",
        "title",
        "reason",
        "status",
    ]


admin.site.register(TopicMastery, TopicMasteryAdmin)
admin.site.register(MasteryHistory, MasteryHistoryAdmin)
admin.site.register(Recommendation, RecommendationAdmin)