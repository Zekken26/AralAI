export type MasteryStatus = "NEEDS_SUPPORT" | "DEVELOPING" | "PROFICIENT" | "MASTERED";

export type RecommendationType =
  | "REVIEW_LESSON"
  | "EASY_PRACTICE"
  | "GUIDED_PRACTICE"
  | "MIXED_PRACTICE"
  | "ADVANCE_TOPIC"
  | "SPACED_REVIEW";

export type RecommendationPriority = "HIGH" | "MEDIUM" | "LOW";

export type RecommendationStatus = "ACTIVE" | "COMPLETED" | "DISMISSED" | "EXPIRED";

export interface TopicSummary {
  id: number;
  title: string;
  code: string;
}

export interface TargetLesson {
  id: number;
  title: string;
}

export interface TargetQuiz {
  id: number;
  title: string;
}

export interface Recommendation {
  id: number;
  topic: TopicSummary;
  recommendation_type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  reason: string;
  status: RecommendationStatus;
  target_lesson: TargetLesson | null;
  target_quiz: TargetQuiz | null;
  generated_from_attempt: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecommendationList {
  count: number;
  next: string | null;
  previous: string | null;
  results: Recommendation[];
}

export interface TrendItem {
  attempt: number;
  score: string | null;
  passed: boolean | null;
  submitted_at: string;
}

export interface ProgressSummary {
  overall_mastery_average: string | null;
  topics_attempted: number;
  topics_mastered: number;
  topics_needing_support: number;
  total_submitted_attempts: number;
  recent_performance_trend: TrendItem[];
  trend_delta: string | null;
  last_activity_date: string | null;
}

export interface TopicMastery {
  id: number;
  topic: TopicSummary;
  mastery_score: string;
  status: MasteryStatus;
  recent_accuracy: string | null;
  difficulty_score: string | null;
  consistency_score: string | null;
  independent_score: string | null;
  total_questions_answered: number;
  total_correct_answers: number;
  total_points_earned: string;
  total_points_possible: string;
  first_attempted_at: string | null;
  last_attempted_at: string | null;
  last_recalculated_at: string;
  active_recommendation_count: number;
}

export interface TopicMasteryList {
  count: number;
  next: string | null;
  previous: string | null;
  results: TopicMastery[];
}