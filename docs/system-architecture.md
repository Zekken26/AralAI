1. Architecture Overview

AralAI will initially use a modular-monolith architecture.

┌───────────────────────────┐
│ Next.js Web Application  │
│ Student and Teacher UI   │
└─────────────┬─────────────┘
              │ HTTPS / JSON
┌─────────────▼─────────────┐
│ Django REST API          │
│ Authentication          │
│ Curriculum              │
│ Lessons                 │
│ Quizzes                 │
│ Progress                │
│ Tutoring                │
└───────┬─────────┬────────┘
        │         │
┌───────▼──────┐  │      ┌───────────────────┐
│ PostgreSQL   │  └─────▶│ Redis             │
│ Relational   │         │ Cache and Queue   │
│ Data         │         └─────────┬─────────┘
│ pgvector     │                   │
└──────────────┘         ┌─────────▼─────────┐
                         │ Celery Workers     │
                         │ AI Generation      │
                         │ Embeddings         │
                         │ Reports            │
                         └─────────┬─────────┘
                                   │
                         ┌─────────▼─────────┐
                         │ AI Provider       │
                         │ Gemini/OpenAI/    │
                         │ Ollama            │
                         └───────────────────┘
2. Main Components
Next.js Frontend

Responsibilities:

Authentication screens.
Student and teacher dashboards.
Lesson presentation.
Quiz interactions.
AI tutor interface.
Progress charts.
Form validation.
Mobile and accessibility support.
Django REST API

Responsibilities:

Authentication and authorization.
Business rules.
Database access.
Classroom enrollment.
Curriculum and lesson management.
Quiz scoring.
Mastery calculations.
Recommendation generation.
AI request orchestration.
Audit logging.
PostgreSQL

Stores:

Accounts.
Classrooms.
Curriculum topics.
Lessons.
Quizzes and questions.
Attempts and answers.
Progress and mastery.
Tutor conversations.
Audit events.
AI usage records.
pgvector

Stores embeddings for approved lesson sections and supports retrieval for lesson-grounded AI responses.

Redis

Used for:

Celery message broker.
Temporary caching.
Rate-limit counters.
Short-lived job state.

Redis must not be treated as the permanent source of student records.

Celery

Runs asynchronous tasks such as:

AI quiz generation.
Lesson embedding creation.
Teacher report generation.
Email delivery.
AI request retries.
Content-processing jobs.
3. Backend Modules
accounts
classrooms
curriculum
lessons
quizzes
assessments
progress
tutoring
ai
notifications
audit

Modules must communicate through defined service functions instead of directly modifying unrelated domain data.

4. Authentication and Authorization

The backend must enforce:

Student and teacher roles.
Classroom ownership.
Enrollment checks.
Lesson publication status.
Quiz availability.
Attempt limits.
Teacher access only to owned classrooms.
Student access only to enrolled classrooms.
Administrative access only to authorized personnel.

Frontend role checks are for usability only and must not be considered security controls.

5. AI Architecture
User request
    ↓
Authentication and rate-limit check
    ↓
Retrieve approved lesson context
    ↓
Build versioned prompt
    ↓
Call configured AI provider
    ↓
Validate structured response
    ↓
Apply safety and mathematical checks
    ↓
Store usage and result
    ↓
Return response

The AI provider will be accessed through an abstraction so the system can switch between Gemini, OpenAI, Ollama, or a mock provider.

6. Security Requirements
All production traffic must use HTTPS.
Passwords must use Django's supported password hashing.
Secrets must come from environment variables or a secret manager.
Refresh tokens must not be stored in browser local storage.
Authentication cookies must be HttpOnly, Secure, and appropriately restricted.
API permissions must be tested.
Sensitive values must not appear in logs.
AI prompts must not expose unrelated student information.
Rate limits must be applied to authentication and AI endpoints.
Database backups must be enabled.
Uploaded content must be validated and restricted.
7. Deployment Environments
Development
Next.js.
Django.
PostgreSQL.
Redis.
Celery.
Local mail-testing service.
Optional Ollama provider.
Staging
Separate database and Redis instance.
Test AI credentials.
Staging domain.
Production-like configuration.
Synthetic or anonymized data.
Production
Managed PostgreSQL.
Managed Redis.
Automated backups.
Error monitoring.
Structured logging.
Uptime monitoring.
AI budget limits.
Secure secret storage.
8. Architectural Decisions
Begin as a modular monolith instead of microservices.
Use Django REST Framework for the API.
Use Next.js for the interactive frontend.
Use PostgreSQL for relational and vector data.
Use Celery for long-running tasks.
Keep the core platform functional when AI is unavailable.
Require teacher approval for generated educational content.