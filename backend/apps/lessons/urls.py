from django.urls import path

from apps.lessons.views import (
    LessonArchiveView,
    LessonDetailView,
    LessonListCreateView,
    LessonPublishView,
)

urlpatterns = [
    path("lessons/", LessonListCreateView.as_view(), name="lesson-list"),
    path("lessons/<int:pk>/", LessonDetailView.as_view(), name="lesson-detail"),
    path("lessons/<int:pk>/publish/", LessonPublishView.as_view(), name="lesson-publish"),
    path("lessons/<int:pk>/archive/", LessonArchiveView.as_view(), name="lesson-archive"),
]