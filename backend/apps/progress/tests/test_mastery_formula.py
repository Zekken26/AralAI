from decimal import Decimal

from apps.progress.mastery import (
    consistency_score,
    difficulty_performance,
    mastery_score,
    mastery_status,
    recent_accuracy,
)
from apps.progress.models import MasteryStatus


def test_recent_accuracy_perfect_high_sample_is_100():
    assert recent_accuracy(5, 5) == Decimal("100.00")


def test_recent_accuracy_zero_is_zero():
    assert recent_accuracy(0, 5) == Decimal("0.00")


def test_recent_accuracy_empty_sample_is_zero():
    assert recent_accuracy(0, 0) == Decimal("0.00")


def test_recent_accuracy_small_sample_scaled_by_n_over_5():
    assert recent_accuracy(1, 1) == Decimal("20.00")
    assert recent_accuracy(2, 2) == Decimal("40.00")
    assert recent_accuracy(3, 3) == Decimal("60.00")
    assert recent_accuracy(4, 4) == Decimal("80.00")
    assert recent_accuracy(2, 4) == Decimal("40.00")
    assert recent_accuracy(3, 5) == Decimal("60.00")


def test_recent_accuracy_exact_half():
    assert recent_accuracy(10, 20) == Decimal("50.00")


def test_difficulty_performance_full_credit():
    assert difficulty_performance(Decimal("200"), Decimal("200")) == Decimal("100.00")


def test_difficulty_performance_no_credit():
    assert difficulty_performance(Decimal("0"), Decimal("200")) == Decimal("0.00")


def test_difficulty_performance_partial():
    assert difficulty_performance(Decimal("60"), Decimal("100")) == Decimal("60.00")


def test_difficulty_performance_empty_is_zero():
    assert difficulty_performance(Decimal("0"), Decimal("0")) == Decimal("0.00")


def test_difficulty_weights_are_linear():
    from apps.progress.mastery import DIFFICULTY_WEIGHTS

    assert DIFFICULTY_WEIGHTS[1] == Decimal("20")
    assert DIFFICULTY_WEIGHTS[3] == Decimal("60")
    assert DIFFICULTY_WEIGHTS[5] == Decimal("100")


def test_consistency_single_attempt_equals_its_accuracy():
    assert consistency_score([100]) == Decimal("100.00")
    assert consistency_score([0]) == Decimal("0.00")


def test_consistency_stable_performance_keeps_mean():
    assert consistency_score([100, 100]) == Decimal("100.00")
    assert consistency_score([60, 60, 60]) == Decimal("60.00")


def test_consistency_erratic_performance_is_penalized_to_zero():
    assert consistency_score([100, 0]) == Decimal("0.00")
    assert consistency_score([100, 0, 100]) == Decimal("0.00")


def test_consistency_mild_variation_reduces_score():
    score = consistency_score([80, 90, 100])
    assert score == Decimal("23.33")


def test_consistency_empty_is_zero():
    assert consistency_score([]) == Decimal("0.00")


def test_mastery_score_uses_weighted_components():
    score = mastery_score(
        Decimal("40"), Decimal("100"), Decimal("100"), independent=Decimal("100")
    )
    assert score == Decimal("64.00")


def test_mastery_score_zero_recent():
    score = mastery_score(
        Decimal("0"), Decimal("0"), Decimal("0"), independent=Decimal("100")
    )
    assert score == Decimal("10.00")


def test_mastery_score_default_independent_completion():
    score = mastery_score(Decimal("100"), Decimal("100"), Decimal("100"))
    assert score == Decimal("100.00")


def test_mastery_status_boundaries():
    assert mastery_status(Decimal("0")) == MasteryStatus.NEEDS_SUPPORT
    assert mastery_status(Decimal("39.99")) == MasteryStatus.NEEDS_SUPPORT
    assert mastery_status(Decimal("40")) == MasteryStatus.DEVELOPING
    assert mastery_status(Decimal("69.99")) == MasteryStatus.DEVELOPING
    assert mastery_status(Decimal("70")) == MasteryStatus.PROFICIENT
    assert mastery_status(Decimal("84.99")) == MasteryStatus.PROFICIENT
    assert mastery_status(Decimal("85")) == MasteryStatus.MASTERED
    assert mastery_status(Decimal("100")) == MasteryStatus.MASTERED
