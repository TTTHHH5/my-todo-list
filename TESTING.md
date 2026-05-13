# 테스트 가이드

이 문서는 백엔드 테스트 전략, 파일 구조, 실행 명령, DB 격리 방식, 앞으로 추가할 유닛 테스트 범위를 한 곳에서 관리한다.

---

## 테스트 전략

테스트는 세 계층으로 나눈다.

| 종류 | 목적 | 실행 대상 |
|------|------|-----------|
| Unit | 순수 함수, 스키마, 라우터 메소드의 작은 동작 검증 | `backend/tests/unit/` |
| API Scenario | 회원가입부터 점수 저장까지 HTTP API 흐름 검증 | `backend/tests/test_api.py` |
| Integration | Docker Compose의 frontend → backend → mysql 연결 검증 | 수동 체크 |

기본 개발 환경은 Docker Compose의 frontend, backend, mysql 컨테이너이다. 테스트는 개발 DB 데이터를 보호하기 위해 `DATABASE_URL`을 테스트용 SQLite로 주입한다.

Docker 검증은 일반 pytest에 포함하지 않는다. Docker 데몬 권한, 이미지 다운로드, 포트 충돌에 영향을 받기 때문에 필요한 시점에 수동 체크로 확인한다.

---

## 파일 구조

```
backend/
└── tests/
    ├── __init__.py
    ├── conftest.py              # 테스트 DB 초기화 + TestClient fixture
    ├── test_api.py              # API 시나리오 테스트
    └── unit/
        ├── test_auth_utils.py   # JWT/비밀번호 유틸 단위 테스트
        └── test_schemas.py      # Pydantic 스키마 단위 테스트
```

추가 예정인 유닛 테스트 파일:

```
backend/tests/unit/
├── test_database.py
├── test_auth_router.py
└── test_scores_router.py
```

---

## 실행 방법

```bash
# tetris/ 디렉토리에서
pip install -r requirements.txt
pytest backend/tests/ -v
```

단위 테스트만 빠르게 확인할 때:

```bash
pytest backend/tests/unit -q
```

API 시나리오만 확인할 때:

```bash
pytest backend/tests/test_api.py -v
```

Docker Compose 실행 경로를 확인할 때:

```bash
docker compose config
docker compose up -d --build
docker compose ps
docker compose exec -T frontend wget -qO- http://127.0.0.1/ | head -5
docker compose exec -T frontend wget -qO- http://127.0.0.1/api/scores/top
```

`/api/scores/top`은 JSON 배열을 반환해야 한다. 데이터가 없으면 `[]`가 정상 응답이다.

---

## DB 격리

`backend/tests/conftest.py`는 앱 import 전에 테스트 DB URL을 설정한다.

```python
_TEST_DB_PATH = "./test_tetris.db"
_TEST_DB_URL = f"sqlite:///{_TEST_DB_PATH}"
os.environ.setdefault("DATABASE_URL", _TEST_DB_URL)
```

그 다음 FastAPI의 `get_db` 의존성을 오버라이드한다.

```python
app.dependency_overrides[get_db] = override_get_db
```

이 방식 때문에 API 시나리오 테스트는 Docker Compose MySQL을 실행하지 않아도 동작하고, 개발용 MySQL 컨테이너 데이터에 영향을 주지 않는다.

---

## API 시나리오 테스트

`backend/tests/test_api.py`는 FastAPI TestClient를 사용해 실행 중인 서버 없이 전체 API 흐름을 검증한다.

테스트는 순서대로 하나의 시나리오 흐름을 구성한다. `client` fixture가 `session` 범위이므로 테스트 간 DB 상태가 유지되고, 로그인 테스트에서 발급받은 JWT를 이후 인증 테스트에서 재사용한다.

### 회원가입

| 테스트 | 입력 | 기대 결과 |
|--------|------|-----------|
| `test_register_success` | 정상 이메일, 닉네임, 비밀번호 | 200, id/email/username 반환 |
| `test_register_duplicate_email` | 동일 이메일 재가입 | 400 |
| `test_register_short_password` | 비밀번호 5자 | 422 |

### 로그인

| 테스트 | 입력 | 기대 결과 |
|--------|------|-----------|
| `test_login_success` | 정상 이메일, 비밀번호 | 200, access_token 반환 |
| `test_login_wrong_password` | 틀린 비밀번호 | 401 |

### 내 정보 조회

| 테스트 | 조건 | 기대 결과 |
|--------|------|-----------|
| `test_get_me_authenticated` | Authorization 헤더 포함 | 200, username 일치 |
| `test_get_me_unauthenticated` | 헤더 없음 | 401 |

### 점수 저장

| 테스트 | 입력 | 기대 결과 |
|--------|------|-----------|
| `test_save_score_success` | score=1600, level=4, lines=16 | 200, 저장된 값 반환 |
| `test_save_score_negative` | score=-100 | 422 |
| `test_save_score_unauthenticated` | 토큰 없음 | 401 |

### 랭킹 / 내 기록

| 테스트 | 조건 | 기대 결과 |
|--------|------|-----------|
| `test_get_top_scores` | 점수 저장 후 조회 | 1위 username/score 일치 |
| `test_get_my_scores` | Authorization 헤더 포함 | 저장한 기록 포함 |

---

## 유닛 테스트 추가 방향

라우터 메소드는 HTTP 요청을 통하지 않고 함수로 직접 호출한다. DB는 Mock보다 임시 SQLite 세션을 우선 사용한다. 이렇게 하면 쿼리, commit, rollback, 정렬, limit 같은 실제 동작을 검증하면서도 Docker MySQL 의존성을 피할 수 있다.

### `test_database.py`

확인할 항목:

- `DATABASE_URL` 기본값이 MySQL URL인지
- SQLite URL일 때만 `check_same_thread=False`가 적용되는지
- `get_db()`가 세션을 yield하고 finally에서 close하는지

### `test_auth_router.py`

확인할 항목:

- `register()` 성공 시 사용자 생성
- 중복 이메일 시 rollback 후 400 예외
- `login()` 성공 시 bearer token 반환
- 잘못된 비밀번호 또는 없는 이메일 시 401 예외
- `get_current_user()`가 토큰 없음, 잘못된 토큰, 삭제된 사용자에 대해 401을 반환

### `test_scores_router.py`

확인할 항목:

- `create_score()`가 현재 사용자에게 점수를 저장
- `get_top_scores()`가 유저별 최고점만 집계
- `get_top_scores()`가 상위 3명만 반환
- `get_my_scores()`가 최신순으로 최대 10개만 반환

---

## 작성 규칙

- 새 테스트는 실패 이유가 분명하게 드러나는 이름을 쓴다.
- API 흐름 검증은 `test_api.py`에 둔다.
- 순수 함수와 라우터 메소드 직접 호출 테스트는 `backend/tests/unit/`에 둔다.
- 개발용 MySQL에 의존하는 테스트는 일반 유닛 테스트에 넣지 않는다.
- Docker Compose 구동 검증은 일반 pytest에 넣지 않고 `docker_install.md`의 수동 체크 명령으로 확인한다.
- DB가 필요한 유닛 테스트는 테스트별 임시 SQLite 세션을 만든다.
- 테스트 데이터는 각 테스트 안에서 명시적으로 만든다.

---

## 현재 확인된 상태

최근 확인 결과:

```bash
pytest backend/tests/unit -q
```

결과:

```text
20 passed
```

현재 실행 환경에서는 FastAPI `TestClient` 요청이 완료되지 않는 현상이 있어 전체 API 시나리오 테스트 결과는 확인하지 못했다. 앱 import와 백엔드 문법 검증은 통과했다.
