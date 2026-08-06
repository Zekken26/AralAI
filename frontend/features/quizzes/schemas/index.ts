import { z } from "zod";
import { paginatedSchema } from "@/types/pagination";

const quizStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const questionTypeSchema = z.enum(["MULTIPLE_CHOICE", "NUMERIC"]);
const attemptStatusSchema = z.enum(["IN_PROGRESS", "SUBMITTED", "EXPIRED"]);

export const quizSchema = z.object({
  id: z.number().int().positive(),
  lesson: z.number().int().positive(),
  classroom: z.number().int().positive(),
  title: z.string().max(200),
  instructions: z.string(),
  status: quizStatusSchema,
  attempt_limit: z.number().int().positive().nullable(),
  time_limit_minutes: z.number().int().positive().nullable(),
  available_from: z.string().datetime().nullable(),
  available_until: z.string().datetime().nullable(),
  passing_score: z.string().regex(/^\d+(\.\d{1,2})?$/),
  randomize_questions: z.boolean(),
  show_results_immediately: z.boolean(),
  published_at: z.string().datetime().nullable(),
  question_count: z.number().int().nonnegative(),
});

export const quizListSchema = paginatedSchema(quizSchema);

export const choiceSchema = z.object({
  id: z.number().int().positive(),
  text: z.string().max(500),
  sequence_order: z.number().int(),
});

export const questionSchema = z.object({
  id: z.number().int().positive(),
  topic: z.number().int().positive(),
  question_type: questionTypeSchema,
  prompt: z.string(),
  difficulty: z.number().int().min(1).max(5),
  points: z.string().regex(/^\d+(\.\d{1,2})?$/),
  sequence_order: z.number().int(),
  choices: z.array(choiceSchema),
});

export const answerSchema = z.object({
  question: z.number().int().positive(),
  selected_choice: z.number().int().positive().nullable(),
  numeric_response: z.string().nullable(),
  answered_at: z.string().datetime(),
});

export const savedAnswerSchema = z.object({
  id: z.number().int().positive(),
  question: z.number().int().positive(),
  selected_choice: z.number().int().positive().nullable(),
  numeric_response: z.string().nullable(),
  answered_at: z.string().datetime(),
});

export const questionResultSchema = z.object({
  question: z.number().int().positive(),
  prompt: z.string(),
  question_type: questionTypeSchema,
  selected_choice: z.number().int().positive().nullable(),
  numeric_response: z.string().nullable(),
  is_correct: z.boolean(),
  points_awarded: z.string().regex(/^\d+(\.\d{1,2})?$/),
  correct_choice: z.number().int().positive().nullable(),
  numeric_answer: z.string().nullable(),
  explanation: z.string(),
});

export const attemptResultSchema = z.object({
  id: z.number().int().positive(),
  quiz: z.number().int().positive(),
  quiz_title: z.string(),
  attempt_number: z.number().int().positive(),
  status: z.literal("SUBMITTED"),
  score: z.string().regex(/^\d+(\.\d{1,2})?$/),
  earned_points: z.string().regex(/^\d+(\.\d{1,2})?$/),
  maximum_points: z.string().regex(/^\d+(\.\d{1,2})?$/),
  passed: z.boolean(),
  started_at: z.string().datetime(),
  expires_at: z.string().datetime().nullable(),
  submitted_at: z.string().datetime(),
  questions: z.array(questionResultSchema),
});

export const attemptSerializerSchema = z.object({
  id: z.number().int().positive(),
  quiz: z.number().int().positive(),
  attempt_number: z.number().int().positive(),
  status: attemptStatusSchema,
  started_at: z.string().datetime(),
  expires_at: z.string().datetime().nullable(),
  submitted_at: z.string().datetime().nullable(),
  answers: z.array(answerSchema),
});

export const studentQuizDetailSchema = quizSchema.extend({
  questions: z.array(questionSchema),
});

export type Quiz = z.infer<typeof quizSchema>;
export type QuizList = z.infer<typeof quizListSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Choice = z.infer<typeof choiceSchema>;
export type Attempt = z.infer<typeof attemptSerializerSchema>;
export type Answer = z.infer<typeof answerSchema>;
export type SavedAnswer = z.infer<typeof savedAnswerSchema>;
export type QuestionResult = z.infer<typeof questionResultSchema>;
export type AttemptResult = z.infer<typeof attemptResultSchema>;
export type StudentQuizDetail = z.infer<typeof studentQuizDetailSchema>;