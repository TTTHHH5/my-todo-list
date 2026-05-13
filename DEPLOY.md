# 실행 가이드

이 앱은 Docker Compose로 **프론트엔드 nginx**, **FastAPI 백엔드**, **MySQL**을 함께 실행한다.
프론트엔드는 `/api` 요청을 Compose 내부 네트워크의 백엔드 컨테이너로 프록시한다.

---

## 사전 준비

- Docker / Docker Compose

---

## 1. 전체 앱 실행

`tetris/` 디렉토리에서 실행한다.

```bash
cd src/exercise/TTTHHH5/day02/tetris
docker compose up --build
```

백그라운드에서 실행하려면:

```bash
docker compose up -d --build
```

서버가 시작되면 아래 주소로 접근한다.

| 페이지 | URL |
|--------|-----|
| 랜딩 페이지 | http://localhost:8080 |
| 게임 페이지 | http://localhost:8080/game |
| API 문서 (Swagger) | http://localhost:8080/docs |
| 백엔드 직접 접속 | http://localhost:8000/docs |

---

## 2. 서비스 구성

Docker Compose는 세 서비스를 실행한다.

| 서비스 | 설명 | 포트 |
|--------|------|------|
| frontend | nginx 정적 파일 서버, `/api` 프록시 | 8080 -> 80 |
| backend | FastAPI API 서버 | 8000 |
| mysql | MySQL 8.4 DB | 3306 |

프론트엔드 컨테이너는 Compose 내부 네트워크에서 `backend:8000`으로 API 요청을 전달한다.
백엔드 컨테이너는 Compose 내부 네트워크에서 `mysql` 호스트로 DB에 연결한다.

기본 DB 연결 정보:

| 항목 | 값 |
|------|----|
| host | mysql |
| port | 3306 |
| database | tetris |
| user | tetris |
| password | tetris |

호스트 PC에서 DB에 직접 접속할 때는 `127.0.0.1:3306`을 사용한다.

---

## 3. 환경변수 (선택)

JWT 시크릿 키는 환경변수로 설정할 수 있다. 설정하지 않으면 개발용 기본값이 사용된다.

```bash
export SECRET_KEY="여기에_긴_임의_문자열_입력"
docker compose up -d --build
```

> 운영 환경에서는 반드시 설정할 것. 설정하지 않으면 소스코드가 공개될 경우 토큰 위조가 가능하다.

---

## 4. 로컬 개발 실행

Python으로 백엔드만 로컬에서 실행하고 DB만 Docker로 띄울 수도 있다.

```bash
pip install -r requirements.txt
docker compose up -d mysql
uvicorn backend.main:app --reload --port 8000
```

로컬 실행 시 기본 DB URL은 `mysql+pymysql://tetris:tetris@127.0.0.1:3306/tetris?charset=utf8mb4`이다.

---

## 5. WSL2 환경에서 브라우저 열기

WSL2에는 Linux용 브라우저가 없으므로 Windows 브라우저를 직접 실행한다.

```bash
cmd.exe /c start "" "http://localhost:8080"
```

---

## 6. 데이터베이스

MySQL 컨테이너가 실행된 상태에서 백엔드가 시작되면 테이블이 자동으로 만들어진다.  
별도 마이그레이션은 없다.

데이터를 초기화하려면 Docker 볼륨을 삭제하고 서버를 재시작한다.

```bash
docker compose down -v
docker compose up -d --build
```

---

## 7. API 엔드포인트 목록

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| POST | /api/auth/register | 불필요 | 회원가입 (이메일, 닉네임, 비밀번호) |
| POST | /api/auth/login | 불필요 | 로그인 → JWT 반환 |
| GET | /api/auth/me | 필요 | 현재 로그인 사용자 정보 |
| POST | /api/scores | 필요 | 게임 기록 저장 |
| GET | /api/scores/top | 불필요 | TOP 3 랭킹 조회 |
| GET | /api/scores/me | 필요 | 내 게임 기록 조회 |

인증이 필요한 요청은 HTTP 헤더에 토큰을 포함한다.

```
Authorization: Bearer <JWT_TOKEN>
```
