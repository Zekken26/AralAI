from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response

from apps.accounts.permissions import IsTeacher
from apps.lessons import selectors, services
from apps.lessons.models import Lesson
from apps.lessons.serializers import LessonCreateSerializer, LessonSerializer, LessonUpdateSerializer


class LessonListCreateView(generics.ListCreateAPIView):
    serializer_class = LessonSerializer
    queryset = Lesson.objects.none()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["classroom", "topic", "status"]

    def get_queryset(self):
        return selectors.lessons_for_user(
            self.request.user,
            classroom_id=self.request.query_params.get("classroom"),
            topic_id=self.request.query_params.get("topic"),
            status=self.request.query_params.get("status"),
        )

    def create(self, request, *args, **kwargs):
        if not request.user.is_teacher:
            raise PermissionDenied("Only teachers can create lessons.")
        serializer = LessonCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        lesson = services.create_lesson(
            author=request.user,
            topic_id=data.pop("topic"),
            classroom_id=data.pop("classroom"),
            **data,
        )
        response_serializer = LessonSerializer(lesson, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class LessonDetailView(generics.RetrieveAPIView):
    serializer_class = LessonSerializer
    queryset = Lesson.objects.none()

    def get_object(self):
        lesson = selectors.get_lesson_for_user(self.request.user, self.kwargs["pk"])
        if lesson is None:
            raise NotFound("Lesson not found.")
        return lesson

    def patch(self, request, *args, **kwargs):
        lesson = self.get_object()
        if lesson.author_id != request.user.id:
            raise PermissionDenied("Only the lesson author can edit this lesson.")
        serializer = LessonUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        lesson = services.update_lesson(lesson=lesson, author=request.user, data=serializer.validated_data)
        response_serializer = LessonSerializer(lesson, context={"request": request})
        return Response(response_serializer.data)


class LessonPublishView(generics.GenericAPIView):
    permission_classes = [IsTeacher]
    serializer_class = LessonSerializer
    queryset = Lesson.objects.none()

    def get_object(self):
        lesson = selectors.lessons_for_user(self.request.user).filter(pk=self.kwargs["pk"]).first()
        if lesson is None or lesson.author_id != self.request.user.id:
            raise NotFound("Lesson not found.")
        return lesson

    def post(self, request, *args, **kwargs):
        lesson = self.get_object()
        lesson = services.publish_lesson(lesson=lesson, author=request.user)
        return Response(LessonSerializer(lesson, context={"request": request}).data)


class LessonArchiveView(generics.GenericAPIView):
    permission_classes = [IsTeacher]
    serializer_class = LessonSerializer
    queryset = Lesson.objects.none()

    def get_object(self):
        lesson = selectors.lessons_for_user(self.request.user).filter(pk=self.kwargs["pk"]).first()
        if lesson is None or lesson.author_id != self.request.user.id:
            raise NotFound("Lesson not found.")
        return lesson

    def post(self, request, *args, **kwargs):
        lesson = self.get_object()
        lesson = services.archive_lesson(lesson=lesson, author=request.user)
        return Response(LessonSerializer(lesson, context={"request": request}).data)