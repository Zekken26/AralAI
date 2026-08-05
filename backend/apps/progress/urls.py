from django.urls import path

from apps.progress import views

urlpatterns = [
    path("students/me/progress/", views.StudentProgressSummaryView.as_view()),
    path("students/me/progress/topics/", views.StudentTopicMasteryListView.as_view()),
    path(
        "students/me/progress/topics/<int:topic_id>/",
        views.StudentTopicMasteryDetailView.as_view(),
    ),
    path(
        "students/me/progress/topics/<int:topic_id>/history/",
        views.StudentTopicMasteryHistoryView.as_view(),
    ),
    path("students/me/recommendations/", views.StudentRecommendationListView.as_view()),
    path(
        "students/me/recommendations/history/",
        views.StudentRecommendationHistoryView.as_view(),
    ),
    path(
        "students/me/recommendations/<int:pk>/complete/",
        views.RecommendationCompleteView.as_view(),
    ),
    path(
        "students/me/recommendations/<int:pk>/dismiss/",
        views.RecommendationDismissView.as_view(),
    ),
    path(
        "classrooms/<int:classroom_id>/progress/",
        views.ClassroomProgressView.as_view(),
    ),
    path(
        "classrooms/<int:classroom_id>/students-needing-support/",
        views.ClassroomStudentsNeedingSupportView.as_view(),
    ),
    path(
        "classrooms/<int:classroom_id>/topics/<int:topic_id>/progress/",
        views.ClassroomTopicProgressView.as_view(),
    ),
    path(
        "classrooms/<int:classroom_id>/students/<int:student_id>/progress/",
        views.TeacherStudentProgressView.as_view(),
    ),
]
