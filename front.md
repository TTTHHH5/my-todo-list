# Todo List Frontend

## Overview

HTML, CSS, JavaScript만 사용한 단일 파일 Todo List 앱입니다.

구현 파일:

- `index.html`

## Features

- 할 일 추가
- 할 일 완료 체크
- 할 일 삭제
- Supabase 저장 및 새로고침 후 복원
- 우선순위 배지 버튼 표시
  - 높음
  - 보통
  - 낮음
- 우선순위 순서대로 자동 정렬
  - 높음 -> 보통 -> 낮음
- 드래그 앤 드롭으로 같은 우선순위 내 순서 변경
- 다른 우선순위 위치로 드래그하면 드롭 위치 기준으로 우선순위 자동 변경

## Run

현재 정적 서버 실행 주소:

```text
http://127.0.0.1:8010/index.html
```

서버 없이도 `index.html` 파일을 브라우저에서 직접 열어 실행할 수 있습니다.

## Supabase Setup

`index.html`의 아래 값을 Supabase 프로젝트 값으로 교체합니다.

```js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Supabase SQL Editor에서 아래 SQL을 실행합니다.

```sql
create table if not exists public.todos (
  id bigint primary key,
  text text not null,
  priority text not null default 'normal'
    check (priority in ('high', 'normal', 'low')),
  order_index integer not null default 0,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.todos enable row level security;

create policy "Allow anonymous todo access"
on public.todos
for all
to anon
using (true)
with check (true);

grant select, insert, update, delete on public.todos to anon;
```

이 정책은 수업/데모용 공개 접근 설정입니다. 운영 서비스에서는 사용자 인증과 사용자별 데이터 정책을 추가해야 합니다.

## Storage Shape

Supabase `public.todos` 테이블에 저장합니다.

```json
[
  {
    "id": 1715500000000,
    "text": "예시 할 일",
    "priority": "normal",
    "order_index": 0,
    "completed": false,
    "created_at": "2026-05-12T00:00:00Z"
  }
]
```
