from rest_framework import serializers

from apps.accounts.serializers import UserSummarySerializer
from apps.lessons.models import Lesson


class LessonCreateSerializer(serializers.Serializer):
    topic = serializers.IntegerField()
    classroom = serializers.IntegerField()
    title = serializers.CharField(max_length=200, allow_blank=True)
    summary = serializers.CharField(required=False, allow_blank=True)
    learning_objectives = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )
    content = serializers.CharField(required=False, allow_blank=True)


class LessonUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, required=False, allow_blank=True)
    summary = serializers.CharField(required=False, allow_blank=True)
    learning_objectives = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )
    content = serializers.CharField(required=False, allow_blank=True)


class LessonSerializer(serializers.ModelSerializer):
    author = UserSummarySerializer(read_only=True)
    topic = serializers.IntegerField(source="topic_id", read_only=True)
    classroom = serializers.IntegerField(source="classroom_id", read_only=True)

    class Meta:
        model = Lesson
        fields = [
            "id",
            "topic",
            "classroom",
            "author",
            "title",
            "summary",
            "learning_objectives",
            "content",
            "status",
            "version",
            "published_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "author",
            "status",
            "version",
            "published_at",
            "created_at",
            "updated_at",
        ]
