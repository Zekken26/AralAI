from django.core.management.base import BaseCommand

from apps.quizzes import services


class Command(BaseCommand):
    help = "Mark overdue IN_PROGRESS quiz attempts as EXPIRED."

    def handle(self, *args, **options):
        count = services.expire_overdue_attempts()
        self.stdout.write(self.style.SUCCESS(f"Expired {count} overdue attempt(s)."))