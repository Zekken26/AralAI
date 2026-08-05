from django.contrib import admin

from apps.classrooms.models import Classroom, Enrollment


@admin.register(Classroom)
class ClassroomAdmin(admin.ModelAdmin):
    list_display = ("name", "section", "school_year", "join_code", "teacher", "is_active", "created_at")
    list_filter = ("is_active", "school_year")
    search_fields = ("name", "section", "join_code", "teacher__email")
    readonly_fields = ("join_code", "created_at", "updated_at")


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ("classroom", "student", "status", "joined_at")
    list_filter = ("status",)
    search_fields = ("classroom__name", "student__email")
