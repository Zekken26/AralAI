import { describe, expect, it } from "vitest";

import {
  describeScores,
  displayPercent,
  distributionDescription,
  masteryStatusLabel,
  masteryStatusRank,
  MASTERY_STATUS_ORDER,
  priorityLabel,
} from "@/features/analytics/utils/format";

describe("displayPercent", () => {
  it("formats numbers (progress transport) with one decimal place", () => {
    expect(displayPercent(31)).toBe("31.0%");
    expect(displayPercent(100)).toBe("100.0%");
    expect(displayPercent(12.5)).toBe("12.5%");
  });

  it("formats decimal strings (quiz transport)", () => {
    expect(displayPercent("88.89")).toBe("88.9%");
    expect(displayPercent("100")).toBe("100.0%");
  });

  it("renders nullish values as an em dash", () => {
    expect(displayPercent(null)).toBe("—");
    expect(displayPercent(undefined)).toBe("—");
  });

  it("passes through unparseable strings instead of showing NaN", () => {
    expect(displayPercent("abc")).toBe("abc");
  });
});

describe("mastery status helpers", () => {
  it("orders statuses from NEEDS_SUPPORT to MASTERED", () => {
    expect(MASTERY_STATUS_ORDER).toEqual([
      "NEEDS_SUPPORT",
      "DEVELOPING",
      "PROFICIENT",
      "MASTERED",
    ]);
    expect(masteryStatusRank("NEEDS_SUPPORT")).toBe(0);
    expect(masteryStatusRank("DEVELOPING")).toBe(1);
    expect(masteryStatusRank("PROFICIENT")).toBe(2);
    expect(masteryStatusRank("MASTERED")).toBe(3);
  });

  it("labels statuses in sentence case", () => {
    expect(masteryStatusLabel("NEEDS_SUPPORT")).toBe("Needs support");
    expect(masteryStatusLabel("DEVELOPING")).toBe("Developing");
    expect(masteryStatusLabel("PROFICIENT")).toBe("Proficient");
    expect(masteryStatusLabel("MASTERED")).toBe("Mastered");
  });
});

describe("priorityLabel", () => {
  it("formats recommendation priorities", () => {
    expect(priorityLabel("HIGH")).toBe("High priority");
    expect(priorityLabel("MEDIUM")).toBe("Medium priority");
    expect(priorityLabel("LOW")).toBe("Low priority");
  });
});

describe("distributionDescription", () => {
  it("summarizes non-zero buckets", () => {
    expect(
      distributionDescription({ needs_support: 1, developing: 2, proficient: 0, mastered: 3 }),
    ).toBe("3 mastered, 2 developing, 1 needing support");
  });

  it("handles a single bucket", () => {
    expect(
      distributionDescription({ needs_support: 0, developing: 0, proficient: 0, mastered: 5 }),
    ).toBe("5 mastered");
  });

  it("returns an empty-state sentence when nothing has been attempted", () => {
    expect(
      distributionDescription({ needs_support: 0, developing: 0, proficient: 0, mastered: 0 }),
    ).toBe("No students have attempted this yet.");
  });
});

describe("describeScores", () => {
  it("describes an empty list", () => {
    expect(describeScores([])).toBe("No mastery scores are available yet.");
  });

  it("describes a single score", () => {
    expect(describeScores([80])).toBe("All 1 topic score is 80.0%.");
  });

  it("describes identical scores", () => {
    expect(describeScores([50, 50, 50])).toBe("All 3 topic scores are 50.0%.");
  });

  it("describes a range", () => {
    expect(describeScores([10, 50, 90])).toBe(
      "Scores range from 10.0% to 90.0% across 3 topics.",
    );
  });
});