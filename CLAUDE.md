# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

HTML5 Canvas + Vanilla JS 기반 테트리스 게임과 FastAPI 백엔드가 함께 있는 프로젝트.
프론트엔드는 nginx 컨테이너에서 서빙하고, 사용자 인증과 점수 저장은 FastAPI 백엔드가 SQLAlchemy를 통해 MySQL에 저장한다.

기본 개발 환경은 Docker Compose로 frontend, backend, mysql 컨테이너를 함께 실행한다. 테스트는 `DATABASE_URL`을 테스트용 SQLite로 주입해 실제 MySQL 데이터에 영향을 주지 않는다.

## Git 규칙

리모트에 push할 때 충돌이 발생하면 **rebase가 아닌 merge**를 사용한다.

```bash
git pull --no-rebase origin main   # merge 방식으로 pull
git push origin main
```

## 실행 방법

```bash
# tetris/ 디렉토리에서 실행
docker compose up -d --build
```

접속 URL:

- 랜딩 페이지: http://localhost:8080
- 게임 페이지: http://localhost:8080/game
- API 문서: http://localhost:8080/docs
- 백엔드 직접 접속: http://localhost:8000/docs

WSL2에서 Windows 브라우저를 열 때:

```bash
cmd.exe /c start "" "http://localhost:8080"
```

## 파일 구조

```
tetris/
├── backend/
│   ├── main.py           ← FastAPI 앱, 정적 파일 서빙, 라우터 등록
│   ├── database.py       ← SQLAlchemy 엔진/session, DATABASE_URL 처리
│   ├── models.py         ← User, GameRecord ORM 모델
│   ├── schemas.py        ← Pydantic 요청/응답 스키마
│   ├── auth.py           ← JWT, 비밀번호 해싱 유틸
│   ├── routers/          ← auth, scores API 라우터
│   └── tests/            ← API 시나리오 테스트와 단위 테스트
├── css/
│   ├── landing.css       ← MD3 다크 테마 (Roboto, 반응형)
│   └── game.css          ← 게임 UI 스타일
├── js/
│   ├── api.js            ← 백엔드 API 호출
│   ├── landing.js        ← 리플 효과, 스크롤 앱바 그림자
│   └── game.js           ← 게임 전체 로직
├── Dockerfile            ← FastAPI 백엔드 컨테이너 이미지
├── Dockerfile.frontend   ← nginx 프론트엔드 컨테이너 이미지
├── nginx.conf            ← 정적 파일 서빙 + `/api` 백엔드 프록시
├── docker-compose.yml    ← frontend + backend + MySQL 개발 환경
├── requirements.txt      ← Python 의존성
├── index.html            ← 랜딩 페이지 진입점
└── game.html             ← 게임 페이지
```

## 아키텍처

### 백엔드 (`backend/`)

- FastAPI 앱은 `backend/main.py`에서 생성한다.
- 앱 시작 시 `models.Base.metadata.create_all(bind=engine)`으로 테이블을 자동 생성한다.
- 컨테이너 실행 시 DB URL은 `mysql+pymysql://tetris:tetris@mysql:3306/tetris?charset=utf8mb4`이다.
- 로컬 Python 실행 시 기본 DB URL은 `mysql+pymysql://tetris:tetris@127.0.0.1:3306/tetris?charset=utf8mb4`이다.
- `DATABASE_URL` 환경변수로 DB 연결을 바꿀 수 있다.
- `SECRET_KEY` 환경변수로 JWT 서명 키를 바꿀 수 있다.
- 인증이 필요한 API는 `Authorization: Bearer <JWT_TOKEN>` 헤더를 사용한다.

### Docker Compose

`docker-compose.yml`은 nginx 프론트엔드, FastAPI 백엔드, MySQL 8.4 컨테이너를 함께 제공한다.

| 항목 | 값 |
|------|----|
| frontend URL | http://localhost:8080 |
| backend URL | http://localhost:8000 |
| API proxy (프론트 컨테이너 내부) | http://backend:8000 |
| DB host (컨테이너 내부) | mysql |
| DB host (호스트 PC) | 127.0.0.1 |
| DB port | 3306 |
| database | tetris |
| user | tetris |
| password | tetris |

데이터는 `mysql-data` 볼륨에 저장된다. 초기화가 필요하면 `docker compose down -v` 후 다시 `docker compose up -d --build`를 실행한다.

### API

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| POST | /api/auth/register | 불필요 | 회원가입 |
| POST | /api/auth/login | 불필요 | 로그인, JWT 발급 |
| GET | /api/auth/me | 필요 | 현재 사용자 조회 |
| POST | /api/scores | 필요 | 게임 기록 저장 |
| GET | /api/scores/top | 불필요 | TOP 3 랭킹 |
| GET | /api/scores/me | 필요 | 내 최근 기록 조회 |

### 게임 루프 (`js/game.js`)

`requestAnimationFrame` 기반 루프. 흐름:

```
startGame() → gameLoop(timestamp)
                └─ moveDown() → lockPiece() → clearLines()
                                             └─ collides() → GAME OVER
```

- **board**: `ROWS×COLS` 2D 배열. 셀 값은 `0`(빈칸) 또는 테트로미노 color ID(1–7).
- **piece / nextPiece**: `{ id, shape, x, y }` 객체.
- `collides(p, b)`: piece와 board 간 충돌 검사. 이동·회전 시도 후 충돌 시 원복.
- `lockPiece()`: piece를 board에 merge → 줄 클리어 → 다음 piece 세팅 → 게임오버 검사.
- `dropInterval`: 레벨 당 `800 - (level-1) * 70` ms, 최소 100ms.

### 점수 공식

```
score += cleared * 100 * cleared  // 1줄=100, 2줄=400, 3줄=900, 4줄=1600
level  = floor(totalLines / 10) + 1
```

### 디자인 시스템 (`css/landing.css`)

Material Design 3 다크 테마. CSS 변수(`--primary`, `--surface-*`, `--on-surface` 등)로 토큰화되어 있으며 `html { font-size: 110% }`로 기본 대비 10% 확대.

반응형 브레이크포인트:
- `≤ 599px`: 1열, 폰트 105%, 게임 캔버스 `scale(0.82)`
- `600–959px`: 2열 그리드
- `≥ 960px`: 4열 그리드

### 리플 효과

`css/landing.css`의 `.md-ripple` + `.ripple` 클래스와 `js/landing.js`의 클릭 핸들러가 쌍으로 동작한다. 새 버튼에 리플을 추가하려면 HTML에 `class="btn-filled md-ripple"`만 붙이면 된다.

## 테스트

상세 테스트 전략과 체크리스트는 `TESTING.md`에서 관리한다.

```bash
pytest backend/tests/ -v
pytest backend/tests/unit -q
```

`backend/tests/conftest.py`는 `DATABASE_URL`을 테스트용 SQLite로 설정한 뒤 앱을 import한다. 이 덕분에 Docker Compose MySQL을 실행하지 않아도 테스트 DB를 격리해서 사용할 수 있다.
