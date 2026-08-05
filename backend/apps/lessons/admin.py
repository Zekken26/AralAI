from django.contrib import admin

from apps.lessons.models import Lesson


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ("title", "topic", "classroom", "author", "status", "version", "published_at")
    list_filter = ("status", "topic__subject")
    search_fields = ("title", "author__email", "classroom__name")
    readonly_fields = ("version", "published_at", "created_at", "updated_at")