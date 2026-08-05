import logging

from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsStudent, IsTeacher
from apps.progress import selectors, services
from apps.progress.models import TopicMastery
from apps.progress.serializers import (
    ClassroomProgressSerializer,
    ClassroomTopicProgressSerializer,
    MasteryHistorySerializer,
    ProgressSummarySerializer,
    RecommendationSerializer,
    StudentsNeedingSupportSerializer,
    TeacherStudentProgressSerializer,
    TopicMasteryDetailSerializer,
    TopicMasteryListSerializer,
)

logger = logging.getLogger(__name__)

STUDENT_NOT_FOUND_DETAIL = "Progress data not found for this student."
CLASSROOM_NOT_FOUND_DETAIL = "Classroom not found."
TOPIC_PROGRESS_NOT_FOUND_DETAIL = "No progress recorded for this topic."


class StudentProgressSummaryView(generics.GenericAPIView):
    """Rolled-up progress summary for the authenticated student."""

    permission_classes = [IsStudent]
    serializer_class = ProgressSummarySerializer

    @extend_schema(responses={200: ProgressSummarySerializer})
    def get(self, request, *args, **kwargs):
        data = selectors.student_progress_summary_data(request.user)
        return Response(data)


class StudentTopicMasteryListView(generics.ListAPIView):
    """Mastery records for the authenticated student, optionally filtered by subject."""

    permission_classes = [IsStudent]
    serializer_class = TopicMasteryListSerializer
    queryset = TopicMastery.objects.none()

    def get_queryset(self):
        subject_id = self.request.query_params.get("subject")
        return selectors.student_mastery_list(
            self.request.user, subject_id=int(subject_id) if subject_id else None
        )


class StudentTopicMasteryDetailView(generics.GenericAPIView):
    """Mastery record for one topic, with its active recommendations and last change."""

    permission_classes = [IsStudent]
    serializer_class = TopicMasteryDetailSerializer

    def get_mastery(self):
        mastery = selectors.get_student_mastery(self.request.user, self.kwargs["topic_id"])
        if mastery is None:
            raise NotFound(TOPIC_PROGRESS_NOT_FOUND_DETAIL)
        return mastery

    @extend_schema(responses={200: TopicMasteryDetailSerializer})
    def get(self, request, *args, **kwargs):
        return Response(self.get_serializer(self.get_mastery()).data)


class StudentTopicMasteryHistoryView(generics.ListAPIView):
    """Chronological mastery-score changes for a topic the student has attempted."""

    permission_classes = [IsStudent]
    serializer_class = MasteryHistorySerializer
    queryset = TopicMastery.objects.none()

    def get_queryset(self):
        if not TopicMastery.objects.filter(
            student=self.request.user, topic_id=self.kwargs["topic_id"]
        ).exists():
            raise NotFound(TOPIC_PROGRESS_NOT_FOUND_DETAIL)
        return selectors.student_mastery_history(self.request.user, self.kwargs["topic_id"])


class StudentRecommendationListView(generics.ListAPIView):
    """Active recommendations for the authenticated student."""

    permission_classes = [IsStudent]
    serializer_class = RecommendationSerializer
    queryset = TopicMastery.objects.none()

    def get_queryset(self):
        return selectors.student_recommendations(self.request.user)


class StudentRecommendationHistoryView(generics.ListAPIView):
    """Completed and dismissed recommendations for the authenticated student."""

    permission_classes = [IsStudent]
    serializer_class = RecommendationSerializer
    queryset = TopicMastery.objects.none()

    def get_queryset(self):
        return selectors.student_recommendation_history(self.request.user)


class RecommendationCompleteView(generics.GenericAPIView):
    """Mark a recommendation as completed. Only its owner can complete it."""

    permission_classes = [IsStudent]
    serializer_class = RecommendationSerializer

    def get_recommendation(self):
        recommendation = selectors.get_recommendation_for_student(
            self.request.user, self.kwargs["pk"]
        )
        if recommendation is None:
            raise NotFound("Recommendation not found.")
        return recommendation

    @extend_schema(
        request=None,
        responses={200: RecommendationSerializer},
        description=(
            "Completes an ACTIVE recommendation. Already-completed or dismissed "
            "recommendations are returned unchanged."
        ),
    )
    def post(self, request, *args, **kwargs):
        recommendation = self.get_recommendation()
        recommendation = services.complete_recommendation(
            recommendation=recommendation, student=request.user
        )
        return Response(RecommendationSerializer(recommendation).data)


class RecommendationDismissView(generics.GenericAPIView):
    """Dismiss a recommendation. Only its owner can dismiss it."""

    permission_classes = [IsStudent]
    serializer_class = RecommendationSerializer

    def get_recommendation(self):
        recommendation = selectors.get_recommendation_for_student(
            self.request.user, self.kwargs["pk"]
        )
        if recommendation is None:
            raise NotFound("Recommendation not found.")
        return recommendation

    @extend_schema(
        request=None,
        responses={200: RecommendationSerializer},
        description=(
            "Dismisses an ACTIVE recommendation. Already-completed or dismissed "
            "recommendations are returned unchanged."
        ),
    )
    def post(self, request, *args, **kwargs):
        recommendation = self.get_recommendation()
        recommendation = services.dismiss_recommendation(
            recommendation=recommendation, student=request.user
        )
        return Response(RecommendationSerializer(recommendation).data)


class ClassroomProgressView(generics.GenericAPIView):
    """Class-wide topic mastery overview for a classroom the teacher owns."""

    permission_classes = [IsTeacher]
    serializer_class = ClassroomProgressSerializer

    @extend_schema(responses={200: ClassroomProgressSerializer})
    def get(self, request, *args, **kwargs):
        data = selectors.classroom_progress_data(request.user, self.kwargs["classroom_id"])
        if data is None:
            raise NotFound(CLASSROOM_NOT_FOUND_DETAIL)
        return Response(data)


class ClassroomStudentsNeedingSupportView(generics.GenericAPIView):
    """Students with at least one topic in NEEDS_SUPPORT status in an owned classroom."""

    permission_classes = [IsTeacher]
    serializer_class = StudentsNeedingSupportSerializer

    @extend_schema(responses={200: StudentsNeedingSupportSerializer})
    def get(self, request, *args, **kwargs):
        data = selectors.classroom_students_needing_support_data(
            request.user, self.kwargs["classroom_id"]
        )
        if data is None:
            raise NotFound(CLASSROOM_NOT_FOUND_DETAIL)
        return Response({"count": len(data), "students": data})


class ClassroomTopicProgressView(generics.GenericAPIView):
    """Per-student mastery breakdown for one topic in an owned classroom."""

    permission_classes = [IsTeacher]
    serializer_class = ClassroomTopicProgressSerializer

    @extend_schema(responses={200: ClassroomTopicProgressSerializer})
    def get(self, request, *args, **kwargs):
        data = selectors.classroom_topic_progress_data(
            request.user, self.kwargs["classroom_id"], self.kwargs["topic_id"]
        )
        if data is None:
            raise NotFound(CLASSROOM_NOT_FOUND_DETAIL)
        return Response(data)


class TeacherStudentProgressView(generics.GenericAPIView):
    """One enrolled student's mastery over the topics taught in an owned classroom."""

    permission_classes = [IsTeacher]
    serializer_class = TeacherStudentProgressSerializer

    @extend_schema(responses={200: TeacherStudentProgressSerializer})
    def get(self, request, *args, **kwargs):
        data = selectors.teacher_student_progress_data(
            request.user, self.kwargs["classroom_id"], self.kwargs["student_id"]
        )
        if data is None:
            raise NotFound(STUDENT_NOT_FOUND_DETAIL)
        return Response(data)
