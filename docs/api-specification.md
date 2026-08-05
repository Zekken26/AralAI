1. API Overview

Base path:

/api/v1

Data format:

application/json

Authenticated routes require a valid session or access token.

2. Standard Response Format
Success
{
  "data": {},
  "message": "Request completed successfully."
}
Validation Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The submitted data is invalid.",
    "fields": {
      "email": ["Enter a valid email address."]
    }
  }
}
Authorization Error
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action."
  }
}
3. Authentication Endpoints
Register
POST /api/v1/auth/register

Request:

{
  "email": "student@example.com",
  "password": "secure-password",
  "first_name": "Juan",
  "last_name": "Dela Cruz",
  "role": "STUDENT"
}
Login
POST /api/v1/auth/login

Request:

{
  "email": "student@example.com",
  "password": "secure-password"
}
Current User
GET /api/v1/auth/me
Refresh Session
POST /api/v1/auth/refresh
Logout
POST /api/v1/auth/logout
4. Classroom Endpoints
List User Classrooms
GET /api/v1/classrooms
Create Classroom

Teacher only.

POST /api/v1/classrooms

Request:

{
  "name": "Grade 8 Mathematics",
  "section": "Section A",
  "school_year": "2026-2027"
}
Classroom Details
GET /api/v1/classrooms/{classroom_id}
Join Classroom

Student only.

POST /api/v1/classrooms/join

Request:

{
  "join_code": "ABCD1234"
}
List Classroom Students

Teacher who owns the classroom only.

GET /api/v1/classrooms/{classroom_id}/students
5. Curriculum Endpoints
GET /api/v1/subjects
GET /api/v1/subjects/{subject_id}/topics
GET /api/v1/topics/{topic_id}

Example topic response:

{
  "data": {
    "id": "topic_123",
    "code": "M8AL-Ia-1",
    "title": "Linear Equations",
    "grade_level": 8,
    "sequence_order": 1
  }
}
6. Lesson Endpoints
List Published Lessons
GET /api/v1/lessons?topic_id={topic_id}
Lesson Details
GET /api/v1/lessons/{lesson_id}

Students may retrieve only published lessons they are authorized to access.

Create Lesson

Teacher only.

POST /api/v1/lessons
Update Lesson

Lesson author or authorized teacher only.

PATCH /api/v1/lessons/{lesson_id}
Publish Lesson
POST /api/v1/lessons/{lesson_id}/publish
Archive Lesson
POST /api/v1/lessons/{lesson_id}/archive
7. Quiz Endpoints
Create Quiz
POST /api/v1/quizzes
Add Question
POST /api/v1/quizzes/{quiz_id}/questions
Publish Quiz
POST /api/v1/quizzes/{quiz_id}/publish

The server must reject publication when the quiz contains unapproved AI-generated questions.

Get Quiz
GET /api/v1/quizzes/{quiz_id}

Before submission, the response must not include correct answers or private explanations.

8. Quiz Attempt Endpoints
Start Attempt
POST /api/v1/quizzes/{quiz_id}/attempts

Response:

{
  "data": {
    "attempt_id": "attempt_123",
    "status": "IN_PROGRESS",
    "started_at": "2026-08-04T10:00:00Z"
  }
}
Save Answer
PUT /api/v1/attempts/{attempt_id}/answers/{question_id}

Request:

{
  "answer": "4"
}
Submit Attempt
POST /api/v1/attempts/{attempt_id}/submit
Attempt Results
GET /api/v1/attempts/{attempt_id}/results
9. Progress Endpoints
Student Progress
GET /api/v1/students/me/progress
Student Recommendations
GET /api/v1/students/me/recommendations
Classroom Analytics

Teacher only.

GET /api/v1/classrooms/{classroom_id}/analytics
Student Classroom Progress

Teacher only.

GET /api/v1/classrooms/{classroom_id}/students/{student_id}/progress
10. AI Tutor Endpoints
Create Conversation
POST /api/v1/tutor/conversations

Request:

{
  "lesson_id": "lesson_123",
  "mode": "HINT"
}
Send Message
POST /api/v1/tutor/conversations/{conversation_id}/messages

Request:

{
  "message": "What should I do first when solving 2x + 4 = 12?"
}

Response:

{
  "data": {
    "message_id": "message_456",
    "content": "Start by identifying the operation applied to 2x. What operation can undo adding 4?",
    "references": [
      {
        "lesson_id": "lesson_123",
        "section": "Inverse Operations"
      }
    ]
  }
}
Tutor Feedback
POST /api/v1/tutor/messages/{message_id}/feedback

Request:

{
  "helpful": true
}
11. AI Quiz Generation Endpoints
Generate Draft Questions

Teacher only.

POST /api/v1/quizzes/{quiz_id}/generate-questions

Request:

{
  "lesson_id": "lesson_123",
  "question_type": "MULTIPLE_CHOICE",
  "difficulty": 2,
  "count": 5
}

Response:

{
  "data": {
    "job_id": "job_123",
    "status": "PENDING"
  }
}
Check Generation Job
GET /api/v1/ai/jobs/{job_id}
Approve Generated Question
POST /api/v1/questions/{question_id}/approve
12. HTTP Status Codes
200 OK — successful request.
201 Created — resource created.
204 No Content — successful operation with no response body.
400 Bad Request — invalid request.
401 Unauthorized — authentication required.
403 Forbidden — authenticated but not permitted.
404 Not Found — resource does not exist or is not visible to the user.
409 Conflict — duplicate enrollment or conflicting state.
422 Unprocessable Entity — valid JSON but invalid business rules.
429 Too Many Requests — rate limit exceeded.
500 Internal Server Error — unexpected server failure.
503 Service Unavailable — temporary dependency or AI provider failure.
13. API Security Rules
Every protected endpoint must perform server-side authorization.
Query parameters must never bypass classroom ownership checks.
The API must not expose correct quiz answers before submission.
Authentication endpoints must be rate-limited.
AI endpoints must have student and teacher usage limits.
Pagination must be used for large collections.
Request bodies must be validated.
Audit logs must be created for publishing, archiving, approvals, and important role changes.