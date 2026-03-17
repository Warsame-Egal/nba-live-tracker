"""Tests for key moments detection (parse_clock, detect_*)."""

from app.services.key_moments import (
    detect_game_tying_shot,
    detect_lead_change,
    detect_scoring_run,
    detect_clutch_play,
    detect_big_shot,
    parse_clock,
)


# ─── parse_clock ───────────────────────────────────────────────────────────────


def test_parse_clock_iso_format():
    assert parse_clock("PT12M00S") == (12, 0)


def test_parse_clock_mm_ss_format():
    assert parse_clock("02:30") == (2, 30)


def test_parse_clock_empty_string():
    assert parse_clock("") is None


def test_parse_clock_invalid():
    assert parse_clock("garbage") is None


# ─── detect_game_tying_shot ────────────────────────────────────────────────────


def test_game_tying_shot_detected():
    play = {"action_type": "2pt shot"}
    assert detect_game_tying_shot(play, 54, 52, 54, 54) is True


def test_game_tying_shot_not_detected_when_already_tied():
    play = {"action_type": "2pt shot"}
    assert detect_game_tying_shot(play, 54, 54, 56, 54) is False


def test_game_tying_shot_not_detected_for_non_scoring_play():
    play = {"action_type": "turnover"}
    assert detect_game_tying_shot(play, 54, 52, 54, 54) is False


def test_game_tying_shot_free_throw():
    play = {"action_type": "free throw"}
    assert detect_game_tying_shot(play, 70, 69, 70, 70) is True


# ─── detect_lead_change ────────────────────────────────────────────────────────


def test_lead_change_home_takes_lead():
    assert detect_lead_change(55, 56, 58, 56) is True


def test_lead_change_away_takes_lead():
    assert detect_lead_change(58, 56, 58, 59) is True


def test_no_lead_change_same_leader():
    assert detect_lead_change(56, 54, 58, 55) is False


def test_no_lead_change_from_tied_game():
    assert detect_lead_change(54, 54, 56, 54) is False


def test_no_lead_change_to_tied_game():
    assert detect_lead_change(54, 52, 54, 54) is False


# ─── detect_scoring_run ────────────────────────────────────────────────────────


def make_play(team: str, action_type: str) -> dict:
    return {"team_tricode": team, "action_type": action_type}


def test_scoring_run_8_unanswered():
    plays = [
        make_play("LAL", "2pt shot"),
        make_play("LAL", "2pt shot"),
        make_play("LAL", "free throw"),
        make_play("LAL", "3-pt shot"),
    ]
    assert detect_scoring_run(plays, "LAL", 3) is True


def test_scoring_run_broken_by_opponent():
    plays = [
        make_play("LAL", "2pt shot"),
        make_play("LAL", "2pt shot"),
        make_play("BOS", "2pt shot"),
        make_play("LAL", "2pt shot"),
        make_play("LAL", "2pt shot"),
    ]
    assert detect_scoring_run(plays, "LAL", 3) is False


def test_scoring_run_non_scoring_plays_ignored():
    # 2+2+2+1+2 = 9 unanswered (turnover and timeout do NOT break run)
    plays = [
        make_play("LAL", "2pt shot"),
        make_play("LAL", "turnover"),
        make_play("", "timeout"),
        make_play("LAL", "2pt shot"),
        make_play("LAL", "2pt shot"),
        make_play("LAL", "free throw"),
        make_play("LAL", "2pt shot"),
    ]
    assert detect_scoring_run(plays, "LAL", 3) is True


def test_scoring_run_not_enough_points():
    plays = [
        make_play("LAL", "2pt shot"),
        make_play("LAL", "2pt shot"),
    ]
    assert detect_scoring_run(plays, "LAL", 3) is False


# ─── detect_clutch_play ───────────────────────────────────────────────────────


def test_clutch_play_detected():
    play = {"action_type": "2pt shot"}
    assert detect_clutch_play(play, period=4, clock=(1, 30), home_score=88, away_score=86) is True


def test_clutch_play_not_in_4th_quarter():
    play = {"action_type": "2pt shot"}
    assert detect_clutch_play(play, period=3, clock=(1, 30), home_score=88, away_score=86) is False


def test_clutch_play_too_much_time_left():
    play = {"action_type": "2pt shot"}
    assert detect_clutch_play(play, period=4, clock=(3, 0), home_score=88, away_score=86) is False


def test_clutch_play_score_not_close():
    play = {"action_type": "2pt shot"}
    assert detect_clutch_play(play, period=4, clock=(1, 0), home_score=98, away_score=85) is False


def test_clutch_play_overtime():
    play = {"action_type": "free throw"}
    assert detect_clutch_play(play, period=5, clock=(0, 45), home_score=102, away_score=101) is True


# ─── detect_big_shot ──────────────────────────────────────────────────────────


def test_big_shot_extends_lead_to_double_digits():
    play = {"action_type": "3-pt shot", "team_tricode": "LAL"}
    assert detect_big_shot(play, 78, 71, 81, 71) is True


def test_big_shot_cuts_deficit_to_one_possession():
    play = {"action_type": "3-pt shot", "team_tricode": "LAL"}
    assert detect_big_shot(play, 70, 78, 73, 78) is True


def test_big_shot_not_a_3pointer():
    play = {"action_type": "2pt shot", "team_tricode": "LAL"}
    assert detect_big_shot(play, 78, 71, 80, 71) is False


def test_big_shot_no_meaningful_change():
    play = {"action_type": "3-pt shot", "team_tricode": "LAL"}
    assert detect_big_shot(play, 75, 72, 78, 72) is False
