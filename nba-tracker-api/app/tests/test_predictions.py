"""Tests for predictions service (calculate_win_probability, predict_score)."""

from app.services.predictions import calculate_win_probability, predict_score


def test_win_probability_home_favored():
    prob = calculate_win_probability(0.70, 0.40)
    assert prob > 0.5


def test_win_probability_home_court_advantage_applied():
    prob = calculate_win_probability(0.5, 0.5)
    assert prob > 0.5
    assert prob < 0.6


def test_win_probability_bounded():
    prob = calculate_win_probability(1.0, 0.0)
    assert prob <= 0.95
    prob2 = calculate_win_probability(0.0, 1.0)
    assert prob2 >= 0.05


def test_win_probability_net_rating_adjustment():
    prob_with = calculate_win_probability(0.5, 0.5, home_net_rating=8.0, away_net_rating=0.0)
    prob_without = calculate_win_probability(0.5, 0.5)
    assert prob_with > prob_without


def test_predict_score_winner_scores_more():
    home_score = predict_score(0.75)
    away_score = predict_score(0.25)
    assert home_score > away_score


def test_predict_score_close_game():
    home_score = predict_score(0.52)
    away_score = predict_score(0.48)
    assert abs(home_score - away_score) < 5
