from django.core.management.base import BaseCommand
from django.db import transaction

from apps.curriculum.models import CurriculumTopic, Subject

MATHEMATICS_CODE = "MATH8"

GRADE_8_TOPICS = [
    {"code": "M8AL-Ia-1", "title": "Linear Equations", "description": "Solving and graphing linear equations in one variable.", "sequence_order": 1},
    {"code": "M8AL-Ie-4", "title": "Systems of Linear Equations", "description": "Solving systems of linear equations in two variables.", "sequence_order": 2},
    {"code": "M8AL-IIa-1", "title": "Functions", "description": "Relations, functions, and function notation.", "sequence_order": 3},
    {"code": "M8AL-Ic-2", "title": "Laws of Exponents", "description": "Applying the laws of exponents to simplify expressions.", "sequence_order": 4},
    {"code": "M8SP-IVa-1", "title": "Basic Statistics", "description": "Collecting, organizing, and interpreting statistical data.", "sequence_order": 5},
]


class Command(BaseCommand):
    help = "Seed the initial Grade 8 Mathematics subjects and topics. Idempotent: safe to run repeatedly."

    @transaction.atomic
    def handle(self, *args, **options):
        subject, created = Subject.objects.get_or_create(
            code=MATHEMATICS_CODE,
            defaults={"name": "Mathematics", "is_active": True},
        )
        if created:
            self.stdout.write(f"Created subject: {subject.name} ({subject.code})")
        else:
            self.stdout.write(f"Subject already exists: {subject.name} ({subject.code})")

        topic_count = 0
        for item in GRADE_8_TOPICS:
            topic, created = CurriculumTopic.objects.get_or_create(
                code=item["code"],
                defaults={
                    "subject": subject,
                    "grade_level": 8,
                    "title": item["title"],
                    "description": item["description"],
                    "sequence_order": item["sequence_order"],
                },
            )
            if created:
                topic_count += 1
                self.stdout.write(f"Created topic: {topic.title} ({topic.code})")
            else:
                self.stdout.write(f"Topic already exists: {topic.title} ({topic.code})")

        self.stdout.write(self.style.SUCCESS(f"Seeding complete. {topic_count} new topic(s) created."))
