from rest_framework import serializers

from apps.accounts.models import User, UserRole


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    role = serializers.ChoiceField(
        choices=[UserRole.STUDENT, UserRole.TEACHER],
        default=UserRole.STUDENT,
    )

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_role(self, value: str) -> str:
        if value == UserRole.ADMIN:
            raise serializers.ValidationError("ADMIN accounts cannot be created publicly.")
        return value


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class UserSummarySerializer(serializers.ModelSerializer):
    """Non-sensitive user info for cross-domain responses (student lists, authors)."""

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name"]
        read_only_fields = fields
