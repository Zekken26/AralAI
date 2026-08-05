"""Deterministic, explainable mastery formula.

All functions are pure and use Decimal arithmetic. The source of truth for
mastery is the set of StudentAnswer rows belonging to SUBMITTED attempts,
using the topic snapshot recorded on each answer at submission time.
"""
from decimal import Decimal

from apps.progress.models import MasteryStatus

DIFFICULTY_WEIGHTS = {
    1: Decimal("20"),
    2: Decimal("40"),
    3: Decimal("60"),
    4: Decimal("80"),
    5: Decimal("100"),
}

RECENT_ANSWERS_WINDOW = 20
MIN_ANSWERS_FOR_FULL_CONFIDENCE = 5
CONSISTENCY_ATTEMPTS_WINDOW = 5

RECENT_WEIGHT = Decimal("0.6")
DIFFICULTY_WEIGHT = Decimal("0.2")
CONSISTENCY_WEIGHT = Decimal("0.1")
INDEPENDENT_WEIGHT = Decimal("0.1")

MASTERED_THRESHOLD = Decimal("85")
PROFICIENT_THRESHOLD = Decimal("70")
DEVELOPING_THRESHOLD = Decimal("40")

TWO_PLACES = Decimal("0.01")


def _quantize(value: Decimal) -> Decimal:
    return Decimal(value).quantize(TWO_PLACES)


def recent_accuracy(correct: int, answered: int) -> Decimal:
    """Recent accuracy 0-100 with a low-sample confidence adjustment.

    Rule: raw accuracy = correct / answered * 100. When fewer than 5 answers
    exist the accuracy is scaled by answered / 5 so a small sample cannot push
    mastery unrealistically high (e.g. one perfect answer -> 20.00).
    """
    if answered <= 0:
        return Decimal("0")
    raw = Decimal(correct) / Decimal(answered) * Decimal("100")
    if answered < MIN_ANSWERS_FOR_FULL_CONFIDENCE:
        raw = raw * Decimal(answered) / Decimal(MIN_ANSWERS_FOR_FULL_CONFIDENCE)
    return _quantize(raw)


def difficulty_performance(weighted_correct: Decimal, weighted_total: Decimal) -> Decimal:
    """Difficulty-weighted performance over the recent answer window.

    Correct answers contribute the weight of their question difficulty
    (1->20, 2->40, 3->60, 4->80, 5->100); incorrect answers contribute zero.
    Normalized to 0-100.
    """
    if weighted_total <= 0:
        return Decimal("0")
    return _quantize(weighted_correct / weighted_total * Decimal("100"))


def consistency_score(per_attempt_accuracies: list) -> Decimal:
    """Stability across recent attempts, normalized to 0-100.

    Rule: mean of per-attempt topic accuracies minus the variance of those
    accuracies, clamped to 0. Stable or improving performance is rewarded
    (low variance keeps the score near the mean); erratic performance is
    penalized. A single attempt has zero variance so its score equals its
    own accuracy.
    """
    if not per_attempt_accuracies:
        return Decimal("0")
    values = [Decimal(v) for v in per_attempt_accuracies]
    mean = sum(values) / Decimal(len(values))
    variance = sum((v - mean) ** 2 for v in values) / Decimal(len(values))
    score = mean - variance
    return _quantize(max(Decimal("0"), score))


def mastery_score(
    recent: Decimal,
    difficulty: Decimal,
    consistency: Decimal,
    independent: Decimal = Decimal("100"),
) -> Decimal:
    """Weighted mastery score: 60% recent accuracy, 20% difficulty,
    10% consistency, 10% independent completion."""
    total = (
        RECENT_WEIGHT * recent
        + DIFFICULTY_WEIGHT * difficulty
        + CONSISTENCY_WEIGHT * consistency
        + INDEPENDENT_WEIGHT * independent
    )
    return _quantize(total)


def mastery_status(score: Decimal) -> str:
    """Map a 0-100 score to a mastery status using inclusive upper boundaries.

    0-39.99 -> NEEDS_SUPPORT, 40-69.99 -> DEVELOPING,
    70-84.99 -> PROFICIENT, 85-100 -> MASTERED.
    """
    score = Decimal(score)
    if score < DEVELOPING_THRESHOLD:
        return MasteryStatus.NEEDS_SUPPORT
    if score < PROFICIENT_THRESHOLD:
        return MasteryStatus.DEVELOPING
    if score < MASTERED_THRESHOLD:
        return MasteryStatus.PROFICIENT
    return MasteryStatus.MASTERED
