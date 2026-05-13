'Unit tests for backend/schemas.py Pydantic validation.'

import pytest
from pydantic import ValidationError

from backend.schemas import UserCreate, ScoreCreate


# ── UserCreate ───────────────────────────────────────────────────────────────

def test_user_create_valid():
    user = UserCreate(email="user@test.com", username="닉네임", password="secret123")
    assert user.email == "user@test.com"
    assert user.username == "닉네임"


def test_user_create_short_password():
    with pytest.raises(ValidationError) as exc:
        UserCreate(email="user@test.com", username="닉네임", password="12345")
    errors = exc.value.errors()
    assert any(e["loc"] == ("password",) for e in errors)


def test_user_create_invalid_email():
    with pytest.raises(ValidationError) as exc:
        UserCreate(email="not-an-email", username="닉네임", password="secret123")
    errors = exc.value.errors()
    assert any(e["loc"] == ("email",) for e in errors)


def test_user_create_empty_username():
    with pytest.raises(ValidationError) as exc:
        UserCreate(email="user@test.com", username="", password="secret123")
    errors = exc.value.errors()
    assert any(e["loc"] == ("username",) for e in errors)


def test_user_create_username_too_long():
    with pytest.raises(ValidationError):
        UserCreate(email="user@test.com", username="a" * 51, password="secret123")


# ── ScoreCreate ───────────────────────────────────────────────────────────────

def test_score_create_valid():
    score = ScoreCreate(score=1600, level=4, lines=16)
    assert score.score == 1600
    assert score.level == 4
    assert score.lines == 16


def test_score_create_zero_score():
    """score=0은 허용 (ge=0)."""
    score = ScoreCreate(score=0, level=1, lines=0)
    assert score.score == 0


def test_score_create_negative_score():
    with pytest.raises(ValidationError) as exc:
        ScoreCreate(score=-1, level=1, lines=0)
    errors = exc.value.errors()
    assert any(e["loc"] == ("score",) for e in errors)


def test_score_create_zero_level():
    """level=0은 불허 (ge=1)."""
    with pytest.raises(ValidationError) as exc:
        ScoreCreate(score=0, level=0, lines=0)
    errors = exc.value.errors()
    assert any(e["loc"] == ("level",) for e in errors)


def test_score_create_negative_lines():
    with pytest.raises(ValidationError) as exc:
        ScoreCreate(score=0, level=1, lines=-1)
    errors = exc.value.errors()
    assert any(e["loc"] == ("lines",) for e in errors)
