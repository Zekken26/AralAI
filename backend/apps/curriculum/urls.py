from django.urls import path

from apps.curriculum.views import SubjectListView, SubjectTopicsView, TopicDetailView

urlpatterns = [
    path("subjects/", SubjectListView.as_view(), name="subject-list"),
    path("subjects/<int:pk>/topics/", SubjectTopicsView.as_view(), name="subject-topics"),
    path("topics/<int:pk>/", TopicDetailView.as_view(), name="topic-detail"),
]
