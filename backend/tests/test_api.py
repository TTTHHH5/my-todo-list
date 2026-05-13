'E2E tests: DB init → register → login → me → scores → rankings'

# 테스트 전체가 하나의 시나리오 흐름을 공유한다.
# client fixture는 session 범위이므로 DB 상태가 테스트 간에 누적된다.

_EMAIL    = "e2e@test.com"
_USERNAME = "테스터"
_PASSWORD = "secret123"
_token: str = ""  # 로그인 후 저장


# ── 회원가입 ────────────────────────────────────────────────────────────────

def test_register_success(client):
    res = client.post("/api/auth/register", json={
        "email": _EMAIL, "username": _USERNAME, "password": _PASSWORD,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == _EMAIL
    assert data["username"] == _USERNAME
    assert "id" in data


def test_register_duplicate_email(client):
    res = client.post("/api/auth/register", json={
        "email": _EMAIL, "username": "다른유저", "password": _PASSWORD,
    })
    assert res.status_code == 400
    assert "이메일" in res.json()["detail"]


def test_register_short_password(client):
    res = client.post("/api/auth/register", json={
        "email": "short@test.com", "username": "유저", "password": "12345",
    })
    assert res.status_code == 422  # Pydantic validation error


# ── 로그인 ─────────────────────────────────────────────────────────────────

def test_login_success(client):
    global _token
    res = client.post("/api/auth/login", json={"email": _EMAIL, "password": _PASSWORD})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    _token = data["access_token"]


def test_login_wrong_password(client):
    res = client.post("/api/auth/login", json={"email": _EMAIL, "password": "wrongpass"})
    assert res.status_code == 401


# ── 내 정보 ────────────────────────────────────────────────────────────────

def test_get_me_authenticated(client):
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {_token}"})
    assert res.status_code == 200
    assert res.json()["username"] == _USERNAME


def test_get_me_unauthenticated(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401


# ── 점수 저장 ──────────────────────────────────────────────────────────────

def test_save_score_success(client):
    res = client.post(
        "/api/scores",
        json={"score": 1600, "level": 4, "lines": 16},
        headers={"Authorization": f"Bearer {_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["score"] == 1600
    assert data["level"] == 4
    assert data["lines"] == 16


def test_save_score_negative(client):
    res = client.post(
        "/api/scores",
        json={"score": -100, "level": 1, "lines": 0},
        headers={"Authorization": f"Bearer {_token}"},
    )
    assert res.status_code == 422  # Pydantic validation error


def test_save_score_unauthenticated(client):
    res = client.post("/api/scores", json={"score": 100, "level": 1, "lines": 1})
    assert res.status_code == 401


# ── 랭킹 ───────────────────────────────────────────────────────────────────

def test_get_top_scores(client):
    res = client.get("/api/scores/top")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    top = data[0]
    assert top["rank"] == 1
    assert top["username"] == _USERNAME
    assert top["score"] == 1600


# ── 내 기록 ────────────────────────────────────────────────────────────────

def test_get_my_scores(client):
    res = client.get("/api/scores/me", headers={"Authorization": f"Bearer {_token}"})
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["score"] == 1600
