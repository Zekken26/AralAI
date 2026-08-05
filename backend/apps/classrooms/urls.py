from django.urls import path

from apps.classrooms.views import (
    ClassroomDetailView,
    ClassroomJoinView,
    ClassroomListCreateView,
    ClassroomStudentsView,
)

urlpatterns = [
    path("classrooms/join/", ClassroomJoinView.as_view(), name="classroom-join"),
    path("classrooms/", ClassroomListCreateView.as_view(), name="classroom-list"),
    path("classrooms/<int:pk>/", ClassroomDetailView.as_view(), name="classroom-detail"),
    path("classrooms/<int:pk>/students/", ClassroomStudentsView.as_view(), name="classroom-students"),
]
