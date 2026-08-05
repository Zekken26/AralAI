from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsStudent, IsTeacher
from apps.classrooms import selectors, services
from apps.classrooms.models import Classroom, Enrollment
from apps.classrooms.serializers import (
    ClassroomCreateSerializer,
    ClassroomSerializer,
    ClassroomUpdateSerializer,
    EnrollmentSerializer,
    JoinClassroomSerializer,
)


class ClassroomListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ClassroomSerializer
    queryset = Classroom.objects.none()

    def get_queryset(self):
        return selectors.classrooms_for_user(self.request.user)

    def create(self, request, *args, **kwargs):
        if not request.user.is_teacher:
            raise PermissionDenied("Only teachers can create classrooms.")
        serializer = ClassroomCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        classroom = services.create_classroom(teacher=request.user, **serializer.validated_data)
        response_serializer = ClassroomSerializer(classroom, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class ClassroomDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ClassroomSerializer
    queryset = Classroom.objects.none()

    def get_queryset(self):
        return selectors.classrooms_for_user(self.request.user)

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return ClassroomUpdateSerializer
        return ClassroomSerializer

    def patch(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.teacher_id != request.user.id:
            raise PermissionDenied("Only the classroom owner can modify this classroom.")
        serializer = ClassroomUpdateSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        classroom = services.update_classroom(classroom=obj, data=serializer.validated_data)
        response_serializer = ClassroomSerializer(classroom, context={"request": request})
        return Response(response_serializer.data)


class ClassroomJoinView(generics.CreateAPIView):
    permission_classes = [IsStudent]
    serializer_class = JoinClassroomSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enrollment = services.join_classroom(
            student=request.user,
            join_code=serializer.validated_data["join_code"],
        )
        return Response(
            {"id": enrollment.id, "classroom": enrollment.classroom_id, "status": enrollment.status},
            status=status.HTTP_201_CREATED,
        )


class ClassroomStudentsView(generics.ListAPIView):
    permission_classes = [IsTeacher]
    serializer_class = EnrollmentSerializer
    queryset = Enrollment.objects.none()

    def get_queryset(self):
        classroom = selectors.get_classroom_for_user(self.request.user, self.kwargs["pk"])
        if classroom is None:
            raise NotFound("Classroom not found.")
        return selectors.enrolled_students(classroom)
