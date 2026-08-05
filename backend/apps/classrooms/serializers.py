from rest_framework import serializers

from apps.accounts.serializers import UserSummarySerializer
from apps.classrooms.models import Classroom, Enrollment


class ClassroomCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    section = serializers.CharField(required=False, allow_blank=True, max_length=100)
    school_year = serializers.CharField(required=False, allow_blank=True, max_length=50)


class ClassroomUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classroom
        fields = ["name", "section", "school_year", "is_active"]


class ClassroomSerializer(serializers.ModelSerializer):
    join_code = serializers.SerializerMethodField()

    class Meta:
        model = Classroom
        fields = [
            "id",
            "name",
            "section",
            "school_year",
            "join_code",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "join_code", "created_at", "updated_at"]

    def get_join_code(self, obj: Classroom) -> str | None:
        request = self.context.get("request")
        if request and request.user.is_authenticated and request.user.id == obj.teacher_id:
            return obj.join_code
        return None


class JoinClassroomSerializer(serializers.Serializer):
    join_code = serializers.CharField(max_length=16)


class EnrollmentSerializer(serializers.ModelSerializer):
    student = UserSummarySerializer(read_only=True)

    class Meta:
        model = Enrollment
        fields = ["id", "student", "status", "joined_at"]
        read_only_fields = fields
