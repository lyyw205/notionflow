# NotionFlow 개선 계획 (Phase 0-6)

> "메모 → 변경 감지 → 구조화 → 분류/연결 → 액션(업데이트/알림/이슈생성)" 파이프라인

## 실행 순서

```
Phase 0 (기반 수정)     ━━━━━━ [완료]
  ↓
Phase 1 (큐 + diff)     ━━━━━━ 안정성 핵심
  ↓
Phase 2 (구조화)        ━━━━━━ AI 품질 핵심
  ↓
Phase 5 (HITL)          ━━━━━━ Phase 2와 병행 가능
  ↓
Phase 3 (자동 연결)     ━━━━━━ Phase 2 결과에 의존
  ↓
Phase 6 (검색 고도화)   ━━━━━━ 독립적, 언제든 가능
  ↓
Phase 4 (액션/알림)     ━━━━━━ Phase 2,3,5 완료 후
```

---

## Phase 0: 기반 안정화 [완료]

### 0-1: 미구현 콜백 엔드포인트 4개 구현 [완료]

- `POST /api/ai/trigger-recluster` — 전체 임베딩 반환 (6시간 주기 리클러스터용)
- `POST /api/ai/cluster-results` — 클러스터 결과 수신 → 카테고리 자동 생성/할당
- `GET /api/ai/changes` — 기간별 페이지 변경 목록 반환 (리포트 생성용)
- `POST /api/ai/report` — AI 생성 리포트 저장

**수정 파일:** `apps/web/src/server/routes/ai-callback.ts`

### 0-2: DB 마이그레이션 정합성 [완료]

- `drizzle/0001_fat_sunset_bain.sql` 생성 (databases, database_properties, database_records, database_views)
- `seed.ts`에서 중복 CREATE TABLE / ALTER TABLE 제거

### 0-3: diff-service 확인 [완료]

- `diff-service.ts` 존재 확인. Phase 1에서 활용 예정.

---

## Phase 1: 변경 감지 + 효율적 재처리 파이프라인

### 현재 문제

1. **Fire-and-forget HTTP**: `ai-trigger.ts`에서 `fetch()` 결과를 await하지 않음. AI 서비스 다운 시 처리 유실, 재시도 없음
2. **전체 재처리**: 매 저장마다 `plain_text` 전체를 AI에 보내 임베딩/요약/태깅 모두 재실행
3. **이벤트 기록 없음**: SSE는 메모리 브로드캐스트만, 클라이언트 재접속 시 누락 이벤트 복구 불가

### 1-1: 작업 큐 도입 (BullMQ + Redis)

**목표:** 안정적인 비동기 작업 처리, 실패 시 자동 재시도

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `docker-compose.yml` | Redis 컨테이너 추가 (port 6379) |
| `apps/web/package.json` | `bullmq`, `ioredis` 의존성 추가 |
| `apps/web/src/server/services/queue.ts` | **신규** — BullMQ 큐 설정 (ai-processing, project-analysis 두 큐) |
| `apps/web/src/server/services/workers.ts` | **신규** — 워커 정의: 큐에서 job 꺼내서 AI 서비스 호출, 실패 시 3회 재시도 (지수 백오프) |
| `apps/web/src/server/services/ai-trigger.ts` | `fetch()` 직접 호출 → 큐에 job 추가로 변경 |

**큐 설계:**

```
ai-processing 큐:
  job data: { pageId, plainText, callbackUrl }
  재시도: 3회, backoff: exponential (1s, 2s, 4s)
  timeout: 60s

project-analysis 큐:
  job data: { projectId }
  재시도: 3회, backoff: exponential
  디바운스: jobId = projectId (같은 프로젝트 중복 방지)
```

### 1-2: Diff 기반 스마트 재처리

**목표:** 변경량이 적으면 고비용 작업(임베딩, 요약) 스킵

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/web/src/server/services/page-service.ts` | `updatePage` 시 이전 `plainText`와 diff 계산 |
| `apps/web/src/server/services/ai-trigger.ts` | diff 결과에 따라 처리 레벨 결정 |
| `apps/ai/src/routers/process.py` | `processing_level` 파라미터 수용 |

**처리 레벨 분기:**

```
변경량 기준 (diff의 totalAdded + totalRemoved):
  < 3줄        → SKIP (아무것도 안 함)
  < 10줄       → TAGS_ONLY (키워드만 재추출)
  >= 10줄      → FULL (임베딩 + 요약 + 태깅 + 클러스터 전부)
```

**로직:**
1. `page-service.ts`의 `updatePage`에서 `page_versions` 최신 버전의 `plainText` 가져옴
2. `computeDiff(oldPlainText, newPlainText)` 호출
3. `totalAdded + totalRemoved` 계산 → 처리 레벨 결정
4. AI 트리거 시 `processing_level: "skip" | "tags_only" | "full"` 전달

### 1-3: 이벤트 로그 테이블

**목표:** SSE 이벤트 영속화, 클라이언트 재접속 시 놓친 이벤트 복구

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/web/src/lib/db/schema.ts` | `page_events` 테이블 추가 |
| `apps/web/src/server/services/sse-manager.ts` | 브로드캐스트 시 이벤트 DB 저장 추가 |
| `apps/web/src/server/routes/sse.ts` | `?lastEventId=` 쿼리로 누락 이벤트 복구 |

**스키마:**
```sql
CREATE TABLE page_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,     -- 'page-updated', 'cluster-updated', 'report-created', ...
  payload TEXT NOT NULL,         -- JSON
  created_at INTEGER NOT NULL
);
-- 30일 이상 된 이벤트는 스케줄러로 정리
```

---

## Phase 2: 노트 이해/구조화 강화

### 현재 문제

1. AI 처리가 **범용적** (YAKE 키워드 + KoBART 요약 + HDBSCAN 클러스터)이라 노트의 "의미 구조"를 파악 못함
2. 회의록/할일/결정사항 같은 **노트 타입 분류** 없음
3. 사람, 날짜, 프로젝트명 같은 **엔티티 추출** 없음
4. AI 출력 형식이 자유롭고 **스키마 강제** 없음

### 2-1: 노트 타입 분류

**목표:** 각 페이지를 6가지 타입으로 자동 분류

**타입:** `meeting_note` | `todo` | `decision` | `idea` | `reference` | `log`

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/web/src/lib/db/schema.ts` | `pages.noteType` 컬럼 추가 (text, nullable) |
| `apps/ai/src/services/classifier.py` | **신규** — 노트 타입 분류 서비스 |
| `apps/ai/src/routers/process.py` | `process_page`에 분류 단계 추가 |
| `apps/web/src/server/routes/ai-callback.ts` | `/callback`에서 `noteType` 수신 → DB 저장 |

**분류 구현 방식:**
- **1차:** 규칙 기반 (키워드 패턴 매칭: "회의록", "TODO", "결정:", "아이디어" 등)
- **2차:** KR-SBERT 임베딩 + 타입별 프로토타입 벡터 유사도 (6개 프로토타입 사전 정의)
- 두 결과를 가중 합산하여 최종 타입 결정 (LLM 호출 없이 경량 처리)

### 2-2: 엔티티 추출

**목표:** 노트에서 구조화된 엔티티 추출 (사람, 날짜, URL, 프로젝트명)

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/web/src/lib/db/schema.ts` | `page_entities` 테이블 신설 |
| `apps/ai/src/services/entity_extractor.py` | **신규** — 정규식 + 패턴 기반 엔티티 추출 |
| `apps/ai/src/routers/process.py` | `process_page`에 엔티티 추출 단계 추가 |
| `apps/web/src/server/routes/ai-callback.ts` | `/callback`에서 `entities` 수신 → DB 저장 |

**스키마:**
```sql
CREATE TABLE page_entities (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id),
  entity_type TEXT NOT NULL,  -- 'person', 'date', 'url', 'project', 'deadline'
  value TEXT NOT NULL,
  metadata TEXT,              -- JSON (위치 정보, 정규화된 값 등)
  created_at INTEGER NOT NULL
);
```

**추출 방법 (LLM 없이):**
- **사람:** `@이름` 패턴, 한글 이름 패턴 (2-4자 한글)
- **날짜/기한:** 정규식 (`YYYY-MM-DD`, `MM/DD`, `~까지`, `마감:` 등)
- **URL:** URL 정규식
- **프로젝트명:** 기존 `projects` 테이블의 이름 목록과 매칭

### 2-3: 할일 자동 추출

**목표:** 노트 내 할일 아이템을 구조화하여 추출

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/web/src/lib/db/schema.ts` | `tasks` 테이블 신설 |
| `apps/ai/src/services/todo_extractor.py` | **신규** — 할일 추출 서비스 |
| `apps/ai/src/routers/process.py` | `process_page`에 할일 추출 단계 추가 |
| `apps/web/src/server/routes/ai-callback.ts` | `/callback`에서 `todos` 수신 → DB 저장 |

**스키마:**
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo',    -- 'backlog', 'todo', 'in_progress', 'done'
  priority TEXT DEFAULT 'medium',          -- 'low', 'medium', 'high', 'urgent'
  due_date INTEGER,                        -- Unix epoch
  source_page_id TEXT REFERENCES pages(id),
  project_id TEXT REFERENCES projects(id),
  milestone_id TEXT REFERENCES milestones(id),
  assignee TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**추출 방법:**
- BlockNote JSON에서 체크박스 블록 (`checkListItem`) 파싱
- `plain_text`에서 "TODO:", "- [ ]", "~해야 함", "~필요", "~할 것" 패턴 매칭
- 추출된 할일에서 기한 키워드 연결 (Phase 2-2 엔티티 활용)

### 2-4: AI 출력 스키마 강제

**목표:** 모든 AI 출력을 고정 JSON Schema로 표준화

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/ai/src/models/schemas.py` | **신규** — Pydantic 모델 정의 |
| `apps/ai/src/routers/process.py` | 결과를 Pydantic 모델로 검증 후 콜백 |
| `apps/web/src/server/routes/ai-callback.ts` | 확장된 콜백 스키마 (Zod) |

**통합 AI 결과 스키마:**
```python
class AIProcessingResult(BaseModel):
    page_id: str
    note_type: Literal["meeting_note", "todo", "decision", "idea", "reference", "log"]
    tags: list[TagResult]        # name, score
    summary: str
    embedding: list[float]
    cluster_id: int | None
    entities: list[EntityResult] # type, value, metadata
    todos: list[TodoResult]      # title, priority, due_date
    confidence: float            # 전체 처리 신뢰도
```

---

## Phase 3: 프로젝트 자동 연결

### 현재 문제

1. 페이지 → 프로젝트 연결이 **수동 링크만** 가능 (`project-selector.tsx`)
2. 검색이 `LIKE '%query%'` **서브스트링 매칭**만 (임베딩 저장되지만 검색에 안 씀)
3. 프로젝트 상태가 `ai_summary` + `progress`뿐, 구조화된 상태 DB 없음

### 3-1: 하이브리드 검색 (FTS5 + 벡터)

**목표:** 키워드 검색 + 시맨틱 검색 결합

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/web/src/lib/db/schema.ts` | FTS5 가상 테이블 정의 (또는 마이그레이션에서 raw SQL) |
| `apps/web/drizzle/` | FTS5 마이그레이션 추가 |
| `apps/web/src/server/services/search-service.ts` | **신규** — 하이브리드 검색 서비스 |
| `apps/web/src/server/routes/search.ts` | `mode` 파라미터 추가 (keyword / semantic / hybrid) |

**구현:**
```sql
-- FTS5 가상 테이블
CREATE VIRTUAL TABLE pages_fts USING fts5(
  title, plain_text, content='pages', content_rowid='rowid'
);

-- 동기화 트리거
CREATE TRIGGER pages_fts_insert AFTER INSERT ON pages BEGIN
  INSERT INTO pages_fts(rowid, title, plain_text) VALUES (new.rowid, new.title, new.plain_text);
END;
-- UPDATE, DELETE 트리거도 동일
```

**하이브리드 점수 계산:**
```
final_score = α * BM25_score + β * cosine_similarity + γ * recency_score
  α = 0.4, β = 0.5, γ = 0.1
```

코사인 유사도는 JS에서 직접 계산 (SQLite에서 blob 꺼내서 Float32Array 변환 후 dot product).

### 3-2: 프로젝트 자동 매칭

**목표:** 새 페이지 저장 시 "이 페이지가 속할 프로젝트" Top-3 후보 자동 제안

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/ai/src/services/project_matcher.py` | **신규** — 프로젝트 매칭 서비스 |
| `apps/ai/src/routers/process.py` | `process_page`에 프로젝트 매칭 단계 추가 |
| `apps/web/src/server/routes/ai-callback.ts` | `/callback`에서 `project_suggestions` 수신 |

**매칭 알고리즘 (3단계 가중 합산):**
1. **키워드 매칭 (0.3):** 프로젝트명/마일스톤명이 페이지 텍스트에 포함
2. **임베딩 유사도 (0.5):** 프로젝트 소속 페이지들의 임베딩 평균(centroid)과 새 페이지 임베딩 코사인 유사도
3. **최근 문맥 (0.2):** 최근 24시간 내 편집한 프로젝트에 가중치 부여

결과는 Phase 5의 **HITL 제안 큐**로 전달 (자동 반영하지 않음).

### 3-3: 프로젝트 메모리 (구조화된 상태 DB)

**목표:** 프로젝트별 실시간 상태를 구조화하여 저장

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/web/src/lib/db/schema.ts` | `project_state` 테이블 신설 |
| `apps/web/src/server/services/project-service.ts` | 프로젝트 상태 갱신 로직 추가 |
| `apps/web/src/server/routes/ai-callback.ts` | 프로젝트 콜백 시 상태 갱신 |

**스키마:**
```sql
CREATE TABLE project_state (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE REFERENCES projects(id),
  goal TEXT,
  open_tasks_count INTEGER NOT NULL DEFAULT 0,
  completed_tasks_count INTEGER NOT NULL DEFAULT 0,
  blockers TEXT,              -- JSON array
  health_score INTEGER,       -- 0-100
  last_activity INTEGER,      -- Unix epoch
  updated_at INTEGER NOT NULL
);
```

---

## Phase 4: 액션 생성 + 알림

### 현재 문제

1. 프로젝트에 **개별 태스크/이슈** 없음 (마일스톤만)
2. 노트 내용 기반 **자동 상태 업데이트** 없음
3. SSE 브라우저 푸시만 있고 **외부 알림** 없음
4. 리포트가 **수동 트리거** 위주 (스케줄러 리포트는 Phase 0에서 수정됨)

### 4-1: 칸반 태스크 보드

**목표:** Phase 2-3에서 추출된 태스크를 칸반 뷰로 관리

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/web/src/server/routes/tasks.ts` | **신규** — 태스크 CRUD API |
| `apps/web/src/server/index.ts` | 태스크 라우트 마운트 |
| `apps/web/src/app/(workspace)/projects/[id]/tasks/` | **신규** — 칸반 보드 페이지 |
| `apps/web/src/components/tasks/kanban-board.tsx` | **신규** — DnD 칸반 컴포넌트 |

**API:**
- `GET /api/tasks?projectId=&status=` — 태스크 목록 (필터)
- `POST /api/tasks` — 태스크 생성
- `PUT /api/tasks/:id` — 상태/우선순위/마감일 변경
- `DELETE /api/tasks/:id`
- `PUT /api/tasks/:id/move` — 칸반 드래그 (상태 + 순서 변경)

### 4-2: 자동 상태 업데이트 제안

**목표:** 노트에서 "완료", "끝남" 등 키워드 감지 시 연결된 태스크 상태 변경 후보 생성

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/ai/src/services/status_detector.py` | **신규** — 상태 변경 키워드 감지 |
| `apps/ai/src/routers/process.py` | 감지 단계 추가 |
| `apps/web/src/server/routes/ai-callback.ts` | `status_updates` 수신 → HITL 제안 큐로 |

**감지 패턴:**
- "완료", "끝남", "done", "closed" → `todo/in_progress → done`
- "시작", "착수", "started" → `todo → in_progress`
- "보류", "대기", "blocked" → `→ backlog`

### 4-3: 리포트 개선

**목표:** 주간 리포트에 프로젝트별 구조화된 정보 포함

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/ai/src/jobs/report.py` | 프로젝트 상태 데이터 포함한 리포트 생성 |
| `apps/web/src/server/routes/ai-callback.ts` | `/changes`에서 프로젝트/태스크 통계 포함 |
| `apps/web/src/app/(workspace)/reports/[id]/page.tsx` | 리포트 뷰 개선 (프로젝트별 섹션) |

**확장 리포트 구조:**
```json
{
  "summary": "...",
  "total_changes": 15,
  "projects": [
    {
      "name": "프로젝트A",
      "progress_delta": "+12%",
      "completed_tasks": 3,
      "new_tasks": 2,
      "blockers": ["API 스펙 미확정"]
    }
  ],
  "changes": [...]
}
```

### 4-4: 알림 시스템

**목표:** 인앱 알림 + 웹훅 기반 외부 알림

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/web/src/lib/db/schema.ts` | `notifications`, `notification_channels` 테이블 추가 |
| `apps/web/src/server/services/notification-service.ts` | **신규** — 알림 생성/발송 서비스 |
| `apps/web/src/server/routes/notifications.ts` | **신규** — 알림 CRUD API |
| `apps/web/src/components/notifications/` | **신규** — 알림 벨 + 드롭다운 UI |

**스키마:**
```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,         -- 'ai_suggestion', 'task_update', 'report', 'mention'
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,                   -- 클릭 시 이동할 내부 경로
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE notification_channels (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  channel_type TEXT NOT NULL,  -- 'in_app', 'email', 'webhook'
  config TEXT,                 -- JSON (email address, webhook URL 등)
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
```

---

## Phase 5: 검수 레이어 (HITL — Human In The Loop)

### 현재 문제

1. AI 결과(태그, 카테고리, 요약)가 `/callback`에서 **즉시 DB에 반영**됨
2. 잘못된 분류/태깅을 사용자가 **인지하기 어려움** (AI 사이드바에 표시만)
3. 프로젝트 연결/태스크 생성 같은 **부작용 있는 액션**에 검증 단계 없음

### 5-1: AI 제안 큐

**목표:** "부작용 있는 AI 액션"을 즉시 반영 대신 제안 상태로 저장

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/web/src/lib/db/schema.ts` | `ai_suggestions` 테이블 신설 |
| `apps/web/src/server/routes/ai-callback.ts` | 분기: 안전한 액션(요약, 태그) → 즉시 반영, 위험한 액션(카테고리 변경, 프로젝트 연결, 태스크 생성) → 제안 큐 |
| `apps/web/src/server/routes/suggestions.ts` | **신규** — 제안 CRUD + 수락/거절 API |

**스키마:**
```sql
CREATE TABLE ai_suggestions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,          -- 'category_change', 'project_link', 'task_create', 'status_update'
  page_id TEXT REFERENCES pages(id),
  payload TEXT NOT NULL,       -- JSON (제안 내용)
  confidence REAL,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'accepted', 'rejected'
  reviewed_at INTEGER,
  created_at INTEGER NOT NULL
);
```

**분류 기준:**
| 액션 | 자동/제안 | 이유 |
|------|----------|------|
| 요약 업데이트 | 자동 반영 | 부작용 없음, 덮어쓰기 가능 |
| 태그 업데이트 | 자동 반영 | 부작용 없음 |
| 임베딩 저장 | 자동 반영 | 내부 데이터 |
| 카테고리 변경 | **제안** | 사용자 기존 분류 덮어쓸 수 있음 |
| 프로젝트 연결 | **제안** | 잘못된 연결은 혼란 유발 |
| 태스크 생성 | **제안** | 중복 태스크 방지 |
| 상태 변경 | **제안** | 잘못된 상태 전환 위험 |

### 5-2: 승인 UI

**목표:** 대시보드에 AI 제안 패널 추가

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/web/src/app/(workspace)/dashboard/page.tsx` | AI 제안 위젯 추가 |
| `apps/web/src/components/suggestions/suggestion-panel.tsx` | **신규** — 제안 목록 + 수락/거절 |
| `apps/web/src/components/suggestions/suggestion-card.tsx` | **신규** — 개별 제안 카드 (타입별 렌더링) |

**UI 구성:**
- 대시보드 상단에 "AI 제안 N건" 배지
- 클릭 시 제안 패널 열림: 타입별 아이콘 + 제안 내용 미리보기 + 수락/거절 버튼
- 수락 시 해당 액션 실제 DB 반영 (기존 콜백 로직 재사용)

### 5-3: 자동 승인 규칙

**목표:** confidence 기반 자동 승인/수동 승인 분기

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/web/src/server/services/suggestion-service.ts` | **신규** — 자동 승인 규칙 엔진 |

**기본 규칙:**
```
카테고리 변경: confidence > 0.9 → 자동 승인
프로젝트 연결: confidence > 0.95 → 자동 승인
태스크 생성: 항상 수동 승인
상태 변경: 항상 수동 승인
```

규칙은 향후 사용자 설정으로 커스터마이징 가능하게 확장 예정.

---

## Phase 6: 검색/RAG 품질 고도화

### 현재 문제

1. `GET /api/search`가 `LIKE '%query%'`만 사용 — 느리고 부정확
2. 임베딩이 저장되지만 **검색에 활용 안 됨**
3. 검색 결과에 **관련도 점수/하이라이트** 없음
4. **페이지네이션** 없음

### 6-1: SQLite FTS5 적용

**목표:** 전문 검색 인덱스로 키워드 검색 성능 향상

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/web/drizzle/` | FTS5 가상 테이블 + 동기화 트리거 마이그레이션 |
| `apps/web/src/server/services/search-service.ts` | **신규** — FTS5 쿼리 + BM25 랭킹 |
| `apps/web/src/server/routes/search.ts` | FTS5 기반 검색으로 교체 |

### 6-2: 시맨틱 검색

**목표:** 임베딩 기반 의미 유사도 검색

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/web/src/server/services/search-service.ts` | 쿼리 임베딩 → 코사인 유사도 Top-K |
| `apps/web/src/server/routes/search.ts` | `?mode=semantic` 파라미터 추가 |

**구현:**
1. 검색 쿼리를 AI 사이드카 `POST /embed`로 임베딩화
2. DB에서 전체 임베딩 로드 (또는 캐시)
3. JS에서 코사인 유사도 계산 후 Top-K 반환

(페이지 수 < 10,000이면 in-memory 계산이 충분히 빠름. 그 이상이면 sqlite-vss 등 벡터 인덱스 검토)

### 6-3: 하이브리드 점수 (RRF)

**목표:** FTS5 + 벡터 검색 결과를 Reciprocal Rank Fusion으로 결합

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/web/src/server/services/search-service.ts` | RRF 점수 계산 로직 |
| `apps/web/src/server/routes/search.ts` | `?mode=hybrid` 기본값 |

**RRF 공식:**
```
score(d) = Σ 1 / (k + rank_i(d))
  k = 60 (표준 상수)
  rank_i = FTS5 랭킹, 벡터 유사도 랭킹 각각
```

최신성 가중치 추가: `recency_boost = 1 / (1 + days_since_update * 0.01)`

### 6-4: 검색 UI 개선

**목표:** 검색 결과에 하이라이트, 스니펫, 페이지네이션 추가

**변경 사항:**

| 파일 | 변경 내용 |
|------|----------|
| `apps/web/src/server/routes/search.ts` | 페이지네이션 (`?page=&limit=`), 스니펫 생성 |
| `apps/web/src/components/search/` | **신규** — 검색 결과 컴포넌트 (하이라이트, 관련도 표시) |

---

## 외부 도구 도입 판단

| 도구 | 도입 시점 | 판단 |
|------|----------|------|
| **BullMQ + Redis** | Phase 1 | 도입. 현재 fire-and-forget이 가장 큰 안정성 리스크 |
| **LangGraph / LlamaIndex** | Phase 2 이후 재검토 | 현재 파이프라인이 선형적이라 과도함. 조건 분기 복잡해지면 검토 |
| **Unstructured** | 파일 파싱 필요 시 | 첨부 파일 내용 추출 기능 추가 시 도입 |
| **Plane/Taiga** | 도입 안 함 | 내부 태스크 관리 구축이 프로젝트 취지에 맞음 |
| **Ragas** | Phase 6 이후 | 검색 품질 평가에 활용. 수동 평가셋 10-30개로 시작 |
| **Mattermost** | Phase 4-4 이후 | 웹훅 기반 연동. 초기엔 인앱 알림 우선 |
