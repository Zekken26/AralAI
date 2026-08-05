from rest_framework import serializers

from apps.curriculum.models import CurriculumTopic, Subject


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ["id", "name", "code", "is_active"]
        read_only_fields = fields


class CurriculumTopicSerializer(serializers.ModelSerializer):
    subject = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = CurriculumTopic
        fields = [
            "id",
            "subject",
            "grade_level",
            "code",
            "title",
            "description",
            "sequence_order",
        ]
        read_only_fields = fields


class TopicDetailSerializer(CurriculumTopicSerializer):
    subject = SubjectSerializer(read_only=True)
