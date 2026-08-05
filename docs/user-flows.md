1. Student Registration and Classroom Enrollment
Open application
    ↓
Select Student Registration
    ↓
Enter account details
    ↓
Validate submitted information
    ↓
Create account
    ↓
Verify email if enabled
    ↓
Log in
    ↓
Enter classroom join code
    ↓
Validate code
    ↓
Join classroom
    ↓
Open student dashboard
Error Cases
Email is already registered.
Password does not meet requirements.
Join code does not exist.
Join code has expired.
Student is already enrolled.
Classroom is no longer accepting students.
2. Student Lesson Flow
Student logs in
    ↓
Open dashboard
    ↓
Select assigned or recommended topic
    ↓
Open published lesson
    ↓
Read lesson sections
    ↓
Complete knowledge check
    ↓
Ask AI tutor when assistance is needed
    ↓
Continue to practice quiz
3. Student Quiz Flow
Open available quiz
    ↓
Review instructions
    ↓
Start attempt
    ↓
Answer questions
    ↓
Submit attempt
    ↓
Server validates submission
    ↓
Score objective questions
    ↓
Store student answers
    ↓
Update topic mastery
    ↓
Generate recommendations
    ↓
Display results and explanations
Quiz Submission Rules
Only enrolled students may access a classroom quiz.
A student cannot submit the same completed attempt twice.
Answers must be scored by the server.
The server must enforce quiz availability and attempt limits.
Students must not receive unpublished questions.
4. AI Tutor Flow
Student opens lesson
    ↓
Select Explain, Hint, Practice, or Mistake Review
    ↓
Enter question
    ↓
Backend validates access and rate limit
    ↓
Retrieve relevant approved lesson sections
    ↓
Send grounded context to AI provider
    ↓
Validate AI response
    ↓
Store conversation
    ↓
Display response with lesson references
    ↓
Student provides helpfulness feedback
AI Failure Flow
AI request fails
    ↓
Retry when appropriate
    ↓
Use fallback explanation when available
    ↓
Tell student the tutor is temporarily unavailable
    ↓
Preserve the lesson and quiz functionality
5. Teacher Classroom Flow
Teacher logs in
    ↓
Open teacher dashboard
    ↓
Create classroom
    ↓
System generates join code
    ↓
Teacher shares join code
    ↓
Students request enrollment
    ↓
Teacher views enrolled students
6. Teacher Lesson Publishing Flow
Create lesson
    ↓
Select grade, subject, and curriculum topic
    ↓
Enter objectives and lesson content
    ↓
Save as draft
    ↓
Preview lesson
    ↓
Validate required information
    ↓
Publish lesson
    ↓
Lesson becomes available to authorized students
7. Teacher Quiz Generation Flow
Select approved lesson
    ↓
Choose question type, count, and difficulty
    ↓
Request AI generation
    ↓
Create background job
    ↓
AI generates structured draft
    ↓
System validates questions and answers
    ↓
Teacher reviews and edits questions
    ↓
Teacher approves questions
    ↓
Publish quiz

AI-generated questions must never be published automatically.

8. Teacher Analytics Flow
Open classroom dashboard
    ↓
Select class or student
    ↓
Retrieve quiz attempts and mastery records
    ↓
Display completion and performance metrics
    ↓
Highlight weak topics
    ↓
Teacher assigns additional lesson or practice