from rest_framework import generics

from apps.curriculum.models import CurriculumTopic, Subject
from apps.curriculum.serializers import CurriculumTopicSerializer, SubjectSerializer, TopicDetailSerializer


class SubjectListView(generics.ListAPIView):
    """List active subjects. Read-only for API users; data is managed in Django Admin."""

    serializer_class = SubjectSerializer

    def get_queryset(self):
        return Subject.objects.filter(is_active=True)


class SubjectTopicsView(generics.ListAPIView):
    """List topics belonging to a subject."""

    serializer_class = CurriculumTopicSerializer

    def get_queryset(self):
        return CurriculumTopic.objects.filter(subject_id=self.kwargs["pk"], subject__is_active=True)


class TopicDetailView(generics.RetrieveAPIView):
    serializer_class = TopicDetailSerializer

    def get_queryset(self):
        return CurriculumTopic.objects.filter(subject__is_active=True)
