export type QuizStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type QuestionType = "MULTIPLE_CHOICE" | "NUMERIC";

export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";

export interface Quiz {
  id: number;
  lesson: number;
  classroom: number;
  title: string;
  instructions: string;
  status: QuizStatus;
  attempt_limit: number | null;
  time_limit_minutes: number | null;
  available_from: string | null;
  available_until: string | null;
  passing_score: string;
  randomize_questions: boolean;
  show_results_immediately: boolean;
  published_at: string | null;
  question_count: number;
}

export interface QuizList {
  count: number;
  next: string | null;
  previous: string | null;
  results: Quiz[];
}

export interface Question {
  id: number;
  topic: number;
  question_type: QuestionType;
  prompt: string;
  difficulty: number;
  points: string;
  sequence_order: number;
  choices: Choice[];
}

export interface Choice {
  id: number;
  text: string;
  sequence_order: number;
}

export interface Attempt {
  id: number;
  quiz: number;
  attempt_number: number;
  status: AttemptStatus;
  started_at: string;
  expires_at: string | null;
  submitted_at: string | null;
  answers: Answer[];
}

export interface Answer {
  question: number;
  selected_choice: number | null;
  numeric_response: string | null;
  answered_at: string;
}

export interface SavedAnswer {
  id: number;
  question: number;
  selected_choice: number | null;
  numeric_response: string | null;
  answered_at: string;
}

export interface QuestionResult {
  question: number;
  prompt: string;
  question_type: QuestionType;
  selected_choice: number | null;
  numeric_response: string | null;
  is_correct: boolean;
  points_awarded: string;
  correct_choice: number | null;
  numeric_answer: string | null;
  explanation: string;
}

export interface AttemptResult {
  id: number;
  quiz: number;
  quiz_title: string;
  attempt_number: number;
  status: "SUBMITTED";
  score: string;
  earned_points: string;
  maximum_points: string;
  passed: boolean;
  started_at: string;
  expires_at: string | null;
  submitted_at: string;
  questions: QuestionResult[];
}

export interface StudentQuizDetail extends Quiz {
  questions: Question[];
}