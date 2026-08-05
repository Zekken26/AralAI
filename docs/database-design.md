1. Database Purpose

The database stores user accounts, classroom relationships, learning materials, assessments, student performance, progress, AI activity, and audit information.

2. Main Entities
User

Stores shared account information.

Important fields:

id
email
password
first_name
last_name
role
is_active
created_at
updated_at

Use a custom Django user model from the beginning.

StudentProfile

Stores student-specific data.

Important fields:

user_id
grade_level
preferred_language
onboarding_completed
TeacherProfile

Stores teacher-specific data.

Important fields:

user_id
employee_identifier, when required
school_name
specialization
Classroom

Represents a class managed by a teacher.

Important fields:

id
teacher_id
name
section
school_year
join_code
is_active
created_at
Enrollment

Connects students to classrooms.

Important fields:

id
classroom_id
student_id
status
joined_at

Unique constraint:

classroom_id + student_id
Subject

Important fields:

id
name
code
is_active
CurriculumTopic

Important fields:

id
subject_id
grade_level
code
title
description
sequence_order
prerequisite_topic_id
Lesson

Important fields:

id
topic_id
author_id
title
summary
content
status
version
published_at
created_at
updated_at

Statuses:

DRAFT
PUBLISHED
ARCHIVED
LessonChunk

Stores searchable lesson sections.

Important fields:

id
lesson_id
content
section_title
sequence_order
embedding
metadata
created_at

Only chunks from published, approved lesson versions may be used by the student tutor.

Quiz

Important fields:

id
lesson_id
author_id
title
instructions
status
attempt_limit
time_limit_minutes
available_from
available_until
created_at
Question

Important fields:

id
quiz_id
topic_id
question_type
prompt
difficulty
correct_answer
explanation
is_ai_generated
review_status
sequence_order

Supported initial question types:

MULTIPLE_CHOICE
NUMERIC
Choice

Important fields:

id
question_id
text
sequence_order

Do not expose a client-facing is_correct field before quiz submission.

QuizAttempt

Important fields:

id
quiz_id
student_id
status
score
maximum_score
started_at
submitted_at

Statuses:

IN_PROGRESS
SUBMITTED
EXPIRED
StudentAnswer

Important fields:

id
attempt_id
question_id
submitted_answer
is_correct
score_awarded
answered_at

Unique constraint:

attempt_id + question_id
TopicMastery

Important fields:

id
student_id
topic_id
mastery_score
attempt_count
correct_count
last_practiced_at
updated_at

Unique constraint:

student_id + topic_id
TutorConversation

Important fields:

id
student_id
lesson_id
mode
created_at
updated_at
TutorMessage

Important fields:

id
conversation_id
role
content
lesson_references
prompt_version
provider
model
token_usage
created_at
AIJob

Important fields:

id
requested_by_id
job_type
status
provider
model
input_reference
error_code
created_at
completed_at
AuditLog

Important fields:

id
actor_id
action
entity_type
entity_id
metadata
ip_address
created_at
3. Relationship Summary
Teacher 1 ─── many Classrooms
Student many ─── many Classrooms through Enrollment

Subject 1 ─── many CurriculumTopics
CurriculumTopic 1 ─── many Lessons
Lesson 1 ─── many LessonChunks
Lesson 1 ─── many Quizzes

Quiz 1 ─── many Questions
Question 1 ─── many Choices
Quiz 1 ─── many QuizAttempts
QuizAttempt 1 ─── many StudentAnswers

Student 1 ─── many TopicMastery records
Student 1 ─── many TutorConversations
TutorConversation 1 ─── many TutorMessages
4. Data Integrity Rules
User email must be unique.
A student may only be enrolled once in the same classroom.
Only published lessons may be accessed by students.
Only approved questions may appear in a published quiz.
Submitted attempts cannot be edited by students.
Quiz scores must be calculated on the server.
Mastery scores must remain between 0 and 100.
Deleting lessons with historical attempts should be restricted.
Important academic records should use soft deletion or archival where appropriate.
5. Indexes

Add indexes for:

User email.
Classroom join code.
Enrollment classroom and student.
Curriculum topic grade and subject.
Lesson topic and status.
Quiz lesson and status.
Quiz attempt student and quiz.
Topic mastery student and topic.
Tutor message conversation and creation date.
Audit log actor and creation date.