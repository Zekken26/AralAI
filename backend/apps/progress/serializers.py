from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.accounts.serializers import UserSummarySerializer
from apps.progress import selectors
from apps.progress.models import MasteryHistory, Recommendation, TopicMastery


class TopicSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    code = serializers.CharField()


class TargetLessonSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()


class TargetQuizSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()


class RecommendationSerializer(serializers.ModelSerializer):
    topic = TopicSummarySerializer(read_only=True)
    target_lesson = serializers.SerializerMethodField()
    target_quiz = serializers.SerializerMethodField()

    class Meta:
        model = Recommendation
        fields = [
            "id",
            "topic",
            "recommendation_type",
            "priority",
            "title",
            "reason",
            "status",
            "target_lesson",
            "target_quiz",
            "generated_from_attempt",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    @extend_schema_field(TargetLessonSerializer(allow_null=True))
    def get_target_lesson(self, obj):
        if obj.target_lesson_id is None:
            return None
        return {"id": obj.target_lesson_id, "title": obj.target_lesson.title}

    @extend_schema_field(TargetQuizSerializer(allow_null=True))
    def get_target_quiz(self, obj):
        if obj.target_quiz_id is None:
            return None
        return {"id": obj.target_quiz_id, "title": obj.target_quiz.title}


class TopicMasteryListSerializer(serializers.ModelSerializer):
    topic = TopicSummarySerializer(read_only=True)
    active_recommendation_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = TopicMastery
        fields = [
            "id",
            "topic",
            "mastery_score",
            "status",
            "recent_accuracy",
            "difficulty_score",
            "consistency_score",
            "independent_score",
            "total_questions_answered",
            "total_correct_answers",
            "total_points_earned",
            "total_points_possible",
            "first_attempted_at",
            "last_attempted_at",
            "last_recalculated_at",
            "active_recommendation_count",
        ]
        read_only_fields = fields


class TopicMasteryDetailSerializer(TopicMasteryListSerializer):
    last_score_change = serializers.SerializerMethodField()
    active_recommendations = serializers.SerializerMethodField()

    class Meta(TopicMasteryListSerializer.Meta):
        fields = TopicMasteryListSerializer.Meta.fields + [
            "last_score_change",
            "active_recommendations",
        ]

    @extend_schema_field(serializers.DecimalField(max_digits=5, decimal_places=2))
    def get_last_score_change(self, obj: TopicMastery):
        entry = obj.history.first()
        return entry.score_change if entry is not None else None

    @extend_schema_field(RecommendationSerializer(many=True))
    def get_active_recommendations(self, obj: TopicMastery):
        recommendations = selectors.student_topic_active_recommendations(obj.student, obj.topic_id)
        return RecommendationSerializer(recommendations, many=True).data


class MasteryHistorySerializer(serializers.ModelSerializer):
    quiz_attempt = serializers.IntegerField(source="quiz_attempt_id", read_only=True)
    quiz_title = serializers.CharField(source="quiz_attempt.quiz.title", read_only=True)

    class Meta:
        model = MasteryHistory
        fields = [
            "id",
            "quiz_attempt",
            "quiz_title",
            "previous_score",
            "new_score",
            "score_change",
            "reason",
            "created_at",
        ]
        read_only_fields = fields


class TrendItemSerializer(serializers.Serializer):
    attempt = serializers.IntegerField()
    score = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    passed = serializers.BooleanField(allow_null=True)
    submitted_at = serializers.DateTimeField()


class ProgressSummarySerializer(serializers.Serializer):
    overall_mastery_average = serializers.DecimalField(
        max_digits=5, decimal_places=2, allow_null=True
    )
    topics_attempted = serializers.IntegerField()
    topics_mastered = serializers.IntegerField()
    topics_needing_support = serializers.IntegerField()
    total_submitted_attempts = serializers.IntegerField()
    recent_performance_trend = TrendItemSerializer(many=True)
    trend_delta = serializers.DecimalField(max_digits=6, decimal_places=2, allow_null=True)
    last_activity_date = serializers.DateTimeField(allow_null=True)


class TopicAverageSerializer(serializers.Serializer):
    topic = TopicSummarySerializer()
    average_mastery = serializers.DecimalField(max_digits=5, decimal_places=2)


class TopicDistributionItemSerializer(serializers.Serializer):
    topic = TopicSummarySerializer()
    needs_support = serializers.IntegerField()
    developing = serializers.IntegerField()
    proficient = serializers.IntegerField()
    mastered = serializers.IntegerField()
    attempted_students = serializers.IntegerField()
    submitted_attempts = serializers.IntegerField()
    average_mastery = serializers.DecimalField(max_digits=5, decimal_places=2)


class ClassroomProgressSerializer(serializers.Serializer):
    classroom_id = serializers.IntegerField()
    class_average_mastery = serializers.DecimalField(
        max_digits=5, decimal_places=2, allow_null=True
    )
    attempted_topics = serializers.IntegerField()
    weakest_topics = TopicAverageSerializer(many=True)
    strongest_topics = TopicAverageSerializer(many=True)
    topic_distribution = TopicDistributionItemSerializer(many=True)


class SupportTopicSerializer(serializers.Serializer):
    topic = TopicSummarySerializer()
    mastery_score = serializers.DecimalField(max_digits=5, decimal_places=2)
    status = serializers.CharField()


class StudentSupportItemSerializer(serializers.Serializer):
    student = UserSummarySerializer()
    topics = SupportTopicSerializer(many=True)


class ClassroomTopicDistributionSerializer(serializers.Serializer):
    needs_support = serializers.IntegerField()
    developing = serializers.IntegerField()
    proficient = serializers.IntegerField()
    mastered = serializers.IntegerField()


class ClassroomTopicStudentItemSerializer(serializers.Serializer):
    student = UserSummarySerializer()
    mastery_score = serializers.DecimalField(max_digits=5, decimal_places=2)
    status = serializers.CharField()


class ClassroomTopicProgressSerializer(serializers.Serializer):
    topic = TopicSummarySerializer(allow_null=True)
    average_mastery = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    attempted_students = serializers.IntegerField()
    distribution = ClassroomTopicDistributionSerializer()
    students = ClassroomTopicStudentItemSerializer(many=True)


class TeacherStudentTopicItemSerializer(serializers.Serializer):
    topic = TopicSummarySerializer()
    mastery_score = serializers.DecimalField(max_digits=5, decimal_places=2)
    status = serializers.CharField()


class TeacherStudentProgressSerializer(serializers.Serializer):
    student = UserSummarySerializer()
    topics_attempted = serializers.IntegerField()
    topics_mastered = serializers.IntegerField()
    topics_needing_support = serializers.IntegerField()
    overall_mastery_average = serializers.DecimalField(
        max_digits=5, decimal_places=2, allow_null=True
    )
    topics = TeacherStudentTopicItemSerializer(many=True)


class StudentsNeedingSupportSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    students = StudentSupportItemSerializer(many=True)
