# AralAI Problem Statement

## 1. Project Overview

AralAI is a web-based learning platform designed to support Grade 8 Mathematics students through structured lessons, quizzes, progress tracking, and AI-assisted explanations.

The platform allows teachers to publish learning materials, create assessments, monitor student performance, and identify topics that require additional instruction.

Students can access lessons, answer quizzes, review mistakes, receive personalized recommendations, and ask an AI tutor for guided explanations.

## 2. Background

Students learn Mathematics at different speeds and have different levels of understanding. However, teachers often need to deliver the same lesson to an entire class within limited class hours.

Some students hesitate to ask questions, forget lessons after class, or lack access to personalized tutoring. They may use search engines, videos, or general AI tools, but these sources may provide explanations that are too advanced, unrelated to the curriculum, or mathematically incorrect.

Teachers also spend significant time preparing learning materials, checking assessments, and manually identifying students who need additional support.

## 3. Problem Statement

Grade 8 students need a more accessible and personalized way to review Mathematics lessons, practice problems, and understand their mistakes outside normal classroom hours.

Teachers need a system that helps them:

* Organize curriculum-aligned lessons.
* Create and publish quizzes.
* Automatically score objective assessments.
* Monitor student progress.
* Identify weak topics.
* Provide additional learning support efficiently.

Existing general-purpose learning tools may not align with the teacher's lessons or the student's current grade level. General AI chatbots may also provide direct answers without encouraging the student to understand the solution process.

## 4. Proposed Solution

AralAI will provide:

* Grade 8 Mathematics lessons organized by topic.
* Teacher-managed learning content.
* Diagnostic and practice quizzes.
* Automatic scoring and feedback.
* Topic-level mastery tracking.
* Personalized practice recommendations.
* An AI tutor grounded in approved lesson content.
* Teacher analytics for class and student performance.

The AI tutor will prioritize hints, guided questions, and step-by-step explanations instead of immediately giving final answers.

## 5. Target Users

### Primary Users

* Grade 8 students.
* Grade 8 Mathematics teachers.

### Future Users

* Parents or guardians.
* School coordinators.
* School administrators.
* Students and teachers from other grade levels.

Future users are outside the first MVP scope.

## 6. Project Objectives

### General Objective

To develop a Grade 8 Mathematics learning platform that supports personalized learning, assessment, progress monitoring, and teacher-guided AI assistance.

### Specific Objectives

1. Allow teachers to create classrooms, lessons, quizzes, and assignments.
2. Allow students to join classrooms and access published learning materials.
3. Automatically score supported quiz question types.
4. Track student performance by Mathematics topic.
5. Recommend lessons and exercises based on student weaknesses.
6. Provide lesson-grounded AI explanations and progressive hints.
7. Provide teachers with class-level and student-level analytics.
8. Protect student data through secure authentication and server-side authorization.

## 7. Initial Scope

The first release will support:

* Grade 8 Mathematics.
* Student and teacher user roles.
* Five Mathematics topics.
* Lessons and quizzes.
* Multiple-choice and numeric questions.
* Quiz attempts and automatic scoring.
* Topic mastery tracking.
* Rule-based recommendations.
* Lesson-grounded AI tutoring.
* Teacher review of AI-generated quiz questions.

## 8. Out of Scope

The first release will not include:

* Parent accounts.
* Online payments.
* Native mobile applications.
* Video classes.
* Social networking.
* Scholarship recommendations.
* Career guidance.
* Full school enrollment management.
* AI essay grading.
* Mental-health assessment.
* Multiple school districts.
* Complete support for every subject and grade level.

## 9. Assumptions

* Students will mainly access the platform using mobile phones.
* Some students may have slow or unstable internet connections.
* Teachers will approve lessons and assessments before publication.
* AI-generated questions will remain drafts until reviewed by a teacher.
* The platform will not use the AI model as the official source of curriculum content.
* Teachers are responsible for confirming the accuracy of published materials.

## 10. Constraints

* Limited development budget.
* Possible limitations in free AI API usage.
* Limited access to pilot participants.
* Need to protect data belonging to minors.
* Need to provide usable performance on low-cost mobile devices.
* Need to limit AI usage and response length to control cost.

## 11. Success Criteria

The first pilot will be considered successful when:

* At least one teacher creates and publishes learning materials.
* At least 20 students use the system during the pilot.
* Students complete at least 80% of assigned quizzes.
* At least 70% of students rate AI explanations as helpful.
* Students demonstrate measurable improvement between diagnostic and follow-up quizzes.
* Teachers can identify weak student topics through the dashboard.
* No unauthorized user can access another classroom's protected data.
* Core student and teacher workflows pass automated end-to-end tests.
