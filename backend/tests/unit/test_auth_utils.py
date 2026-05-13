'Unit tests for backend/auth.py pure functions.'

from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from backend.auth import (
    SECRET_KEY, ALGORITHM,
    verify_password, get_password_hash,
    create_access_token, decode_token,
)

# ── verify_password / get_password_hash ─────────────────────────────────────

def test_hash_and_verify_success():
    hashed = get_password_hash("mypassword")
    assert verify_password("mypassword", hashed) is True


def test_verify_wrong_password():
    hashed = get_password_hash("mypassword")
    assert verify_password("wrongpassword", hashed) is False


def test_hash_is_not_plaintext():
    password = "mypassword"
    assert get_password_hash(password) != password


def test_hash_different_each_time():
    """bcrypt은 매번 다른 salt를 사용하므로 동일 입력이라도 결과가 달라야 한다."""
    h1 = get_password_hash("same")
    h2 = get_password_hash("same")
    assert h1 != h2


def test_verify_unicode_password():
    password = "비밀번호123!"
    hashed = get_password_hash(password)
    assert verify_password(password, hashed) is True
    assert verify_password("비밀번호123", hashed) is False


# ── create_access_token / decode_token ──────────────────────────────────────

def test_create_and_decode_token():
    token = create_access_token({"user_id": 42, "username": "테스터"})
    payload = decode_token(token)
    assert payload is not None
    assert payload["user_id"] == 42
    assert payload["username"] == "테스터"
    assert "exp" in payload


def test_decode_expired_token():
    expired_payload = {
        "user_id": 1,
        "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
    }
    token = jwt.encode(expired_payload, SECRET_KEY, algorithm=ALGORITHM)
    assert decode_token(token) is None


def test_decode_tampered_token():
    token = create_access_token({"user_id": 1})
    tampered = token[:-4] + "XXXX"
    assert decode_token(tampered) is None


def test_decode_empty_string():
    assert decode_token("") is None


def test_decode_wrong_secret():
    token = jwt.encode({"user_id": 1}, "wrong-secret", algorithm=ALGORITHM)
    assert decode_token(token) is None
