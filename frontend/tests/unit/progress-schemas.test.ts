import { describe, expect, it } from "vitest";

import {
  recommendationSchema,
  recommendationListSchema,
  progressSummarySchema,
  topicMasterySchema,
  topicMasteryListSchema,
} from "@/features/progress/schemas";

const validRecommendation = {
  id: 1,
  topic: { id: 3, title: "Linear Equations", code: "M8AL-Ia-1" },
  recommendation_type: "REVIEW_LESSON",
  priority: "HIGH",
  title: "Review linear equations",
  reason: "You scored below 70% on the last quiz.",
  status: "ACTIVE",
  target_lesson: { id: 10, title: "Solving Linear Equations" },
  target_quiz: null,
  generated_from_attempt: 1,
  completed_at: null,
  created_at: "2026-08-06T10:00:00Z",
  updated_at: "2026-08-06T10:00:00Z",
};

describe("recommendationSchema", () => {
  it("accepts a valid recommendation", () => {
    expect(recommendationSchema.safeParse(validRecommendation).success).toBe(true);
  });

  it("accepts a recommendation with no target lesson or quiz", () => {
    const result = recommendationSchema.safeParse({
      ...validRecommendation,
      target_lesson: null,
      target_quiz: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("recommendationListSchema (DRF pagination)", () => {
  it("accepts a valid paginated response", () => {
    expect(
      recommendationListSchema.safeParse({
        count: 1,
        next: null,
        previous: null,
        results: [validRecommendation],
      }),
    ).toBeTruthy();
  });
});

describe("progressSummarySchema", () => {
  it("accepts a valid progress summary", () => {
    expect(
      progressSummarySchema.safeParse({
        overallMasteryAverage: "75.50",
        topicsAttempted: 3,
        topicsMastered: 1,
        topicsNeedingSupport: 1,
        totalSubmittedAttempts: 5,
        recentPerformanceTrend: [
          { attempt: 1, score: "60.00", passed: false, submittedAt: "2026-08-01T10:00:00Z" },
          { attempt: 2, score: "80.00", passed: true, submittedAt: "2026-08-05T10:00:00Z" },
        ],
        trendDelta: "20.00",
        lastActivityDate: "2026-08-05T10:00:00Z",
      }),
    ).toBeTruthy();
  });

  it("accepts null values for optional fields", () => {
    const result = progressSummarySchema.safeParse({
      overall_mastery_average: null,
      topics_attempted: 0,
      topics_mastered: 0,
      topics_needing_support: 0,
      total_submitted_attempts: 0,
      recent_performance_trend: [],
      trend_delta: null,
      last_activity_date: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("topicMasterySchema", () => {
  it("accepts a valid topic mastery", () => {
    expect(
      topicMasterySchema.safeParse({
        id: 1,
        topic: { id: 3, title: "Linear Equations", code: "M8AL-Ia-1" },
        masteryScore: "75.50",
        status: "DEVELOPING",
        recentAccuracy: "80.00",
        difficultyScore: "60.00",
        consistencyScore: "70.00",
        independentScore: "75.00",
        totalQuestionsAnswered: 10,
        totalCorrectAnswers: 8,
        totalPointsEarned: "8.00",
        totalPointsPossible: "10.00",
        firstAttemptedAt: "2026-08-01T10:00:00Z",
        lastAttemptedAt: "2026-08-05T10:00:00Z",
        lastRecalculatedAt: "2026-08-06T10:00:00Z",
        activeRecommendationCount: 1,
      }),
    ).toBeTruthy();
  });
});

describe("topicMasteryListSchema (DRF pagination)", () => {
  it("accepts a valid paginated response", () => {
    expect(
      topicMasteryListSchema.safeParse({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            topic: { id: 3, title: "Linear Equations", code: "M8AL-Ia-1" },
            masteryScore: "75.50",
            status: "DEVELOPING",
            recentAccuracy: "80.00",
            difficultyScore: null,
            consistencyScore: null,
            independentScore: null,
            totalQuestionsAnswered: 10,
            totalCorrectAnswers: 8,
            totalPointsEarned: "8.00",
            totalPointsPossible: "10.00",
            firstAttemptedAt: null,
            lastAttemptedAt: null,
            lastRecalculatedAt: "2026-08-06T10:00:00Z",
            activeRecommendationCount: 0,
          },
        ],
      }),
    ).toBeTruthy();
  });
});