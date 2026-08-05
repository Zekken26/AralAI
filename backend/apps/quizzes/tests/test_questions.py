import pytest
from rest_framework import status

from apps.curriculum.models import CurriculumTopic
from apps.quizzes.models import Question, QuestionType, ReviewStatus


def _q_payload(topic_id, **overrides):
    payload = {
        "topic": topic_id,
        "question_type": QuestionType.MULTIPLE_CHOICE,
        "prompt": "What is the value of x?",
        "difficulty": 2,
        "points": 5,
    }
    payload.update(overrides)
    return payload


@pytest.fixture
def other_subject_topic(subject, db):
    from apps.curriculum.models import Subject

    science = Subject.objects.create(name="Science", code="SCI8", is_active=True)
    return CurriculumTopic.objects.create(
        subject=science,
        grade_level=8,
        code="S8MT-I-1",
        title="Science Topic",
        sequence_order=9,
    )


@pytest.mark.django_db
def test_mc_question_requires_at_least_two_choices(auth_client, teacher_user, quiz, topic):
    client = auth_client(teacher_user)
    created = client.post(
        f"/api/v1/quizzes/{quiz.id}/questions/",
        _q_payload(topic.id),
        format="json",
    )
    qid = created.json()["id"]
    client.post(f"/api/v1/questions/{qid}/choices/", {"text": "Only choice"}, format="json")
    response = client.post(f"/api/v1/questions/{qid}/approve/")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert response.json().get("code") == "INVALID_QUESTION_CONFIGURATION"


@pytest.mark.django_db
def test_mc_question_requires_one_correct_choice(auth_client, teacher_user, quiz, topic):
    client = auth_client(teacher_user)
    created = client.post(
        f"/api/v1/quizzes/{quiz.id}/questions/",
        _q_payload(topic.id),
        format="json",
    )
    qid = created.json()["id"]
    client.post(f"/api/v1/questions/{qid}/choices/", {"text": "A", "is_correct": False}, format="json")
    client.post(f"/api/v1/questions/{qid}/choices/", {"text": "B", "is_correct": False}, format="json")
    response = client.post(f"/api/v1/questions/{qid}/approve/")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.django_db
def test_numeric_question_requires_numeric_answer(auth_client, teacher_user, quiz, topic):
    client = auth_client(teacher_user)
    created = client.post(
        f"/api/v1/quizzes/{quiz.id}/questions/",
        _q_payload(topic.id, question_type=QuestionType.NUMERIC),
        format="json",
    )
    qid = created.json()["id"]
    response = client.post(f"/api/v1/questions/{qid}/approve/")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.django_db
def test_negative_numeric_tolerance_rejected(auth_client, teacher_user, quiz, topic):
    client = auth_client(teacher_user)
    response = client.post(
        f"/api/v1/quizzes/{quiz.id}/questions/",
        _q_payload(
            topic.id,
            question_type=QuestionType.NUMERIC,
            numeric_answer=4,
            numeric_tolerance=-0.5,
        ),
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_difficulty_must_be_between_1_and_5(auth_client, teacher_user, quiz, topic):
    client = auth_client(teacher_user)
    for bad in (0, 6):
        response = client.post(
            f"/api/v1/quizzes/{quiz.id}/questions/",
            _q_payload(topic.id, difficulty=bad),
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_points_must_be_positive(auth_client, teacher_user, quiz, topic):
    client = auth_client(teacher_user)
    for bad in (0, -3):
        response = client.post(
            f"/api/v1/quizzes/{quiz.id}/questions/",
            _q_payload(topic.id, points=bad),
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_topic_must_match_lesson_or_same_curriculum(
    auth_client, teacher_user, quiz, topic, other_subject_topic
):
    client = auth_client(teacher_user)
    response = client.post(
        f"/api/v1/quizzes/{quiz.id}/questions/",
        _q_payload(other_subject_topic.id),
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_topic_in_same_subject_allowed(auth_client, teacher_user, quiz, topic):
    from apps.curriculum.models import Subject

    subject = Subject.objects.create(name="Math More", code="MATH9", is_active=True)
    from apps.curriculum.models import CurriculumTopic

    same_curriculum_topic = CurriculumTopic.objects.create(
        subject=topic.subject,
        grade_level=8,
        code="M8AL-Ib-3",
        title="Word Problems",
        sequence_order=6,
    )
    client = auth_client(teacher_user)
    response = client.post(
        f"/api/v1/quizzes/{quiz.id}/questions/",
        _q_payload(same_curriculum_topic.id),
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
def test_only_quiz_owner_can_add_or_edit_questions(
    auth_client, teacher_user, second_teacher, quiz, topic
):
    client = auth_client(second_teacher)
    assert (
        client.post(
            f"/api/v1/quizzes/{quiz.id}/questions/",
            _q_payload(topic.id),
            format="json",
        ).status_code
        == status.HTTP_404_NOT_FOUND
    )

    owner = auth_client(teacher_user)
    created = owner.post(
        f"/api/v1/quizzes/{quiz.id}/questions/",
        _q_payload(topic.id),
        format="json",
    )
    qid = created.json()["id"]

    intruder = auth_client(second_teacher)
    assert (
        intruder.patch(
            f"/api/v1/questions/{qid}/",
            {"prompt": "Hacked"},
            format="json",
        ).status_code
        == status.HTTP_404_NOT_FOUND
    )


@pytest.mark.django_db
def test_student_cannot_add_or_edit_questions(
    auth_client, student_user, quiz, topic, enrollment
):
    client = auth_client(student_user)
    assert (
        client.post(
            f"/api/v1/quizzes/{quiz.id}/questions/",
            _q_payload(topic.id),
            format="json",
        ).status_code
        == status.HTTP_403_FORBIDDEN
    )


@pytest.mark.django_db
def test_correct_answer_configuration_hidden_from_students(
    auth_client, student_user, enrollment, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(student_user)
    body = client.get(f"/api/v1/quizzes/{quiz.id}/").json()
    for question in body["questions"]:
        assert "numeric_answer" not in question
        assert "numeric_tolerance" not in question
        assert "explanation" not in question
        assert "review_status" not in question
        assert "is_correct" not in question
        for choice in question["choices"]:
            assert "is_correct" not in choice


@pytest.mark.django_db
def test_teacher_sees_full_answer_configuration(
    auth_client, teacher_user, published_quiz_data
):
    quiz, mc, wrong, right, numeric = published_quiz_data
    client = auth_client(teacher_user)
    body = client.get(f"/api/v1/quizzes/{quiz.id}/").json()
    questions = {q["id"]: q for q in body["questions"]}
    mc_payload = questions[mc.id]
    assert any(c["is_correct"] for c in mc_payload["choices"])
    assert mc_payload["numeric_answer"] is None
    assert "review_status" in mc_payload