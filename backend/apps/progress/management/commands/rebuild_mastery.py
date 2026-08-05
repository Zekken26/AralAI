from django.core.management.base import BaseCommand

from apps.progress.models import MasteryHistory
from apps.progress.services import rebuild_student_mastery


class Command(BaseCommand):
    help = (
        "Idempotently rebuild topic mastery, mastery history and recommendations for "
        "all students (or a single student) from submitted quiz attempts."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--student-id",
            type=int,
            help="Only rebuild mastery for this student id.",
        )

    def handle(self, *args, **options):
        processed = rebuild_student_mastery(student_id=options["student_id"])
        history_rows = MasteryHistory.objects.count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Processed {processed} topic/attempt pair(s). "
                f"MasteryHistory now has {history_rows} row(s)."
            )
        )