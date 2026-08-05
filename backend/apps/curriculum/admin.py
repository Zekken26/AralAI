from django.contrib import admin

from apps.curriculum.models import CurriculumTopic, Subject


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "code")


@admin.register(CurriculumTopic)
class CurriculumTopicAdmin(admin.ModelAdmin):
    list_display = ("title", "code", "subject", "grade_level", "sequence_order")
    list_filter = ("subject", "grade_level")
    search_fields = ("title", "code")
    ordering = ("sequence_order",)
