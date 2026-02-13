# HANDOFF

## Current [1770961604]
- **Task**: 노션 스타일 인라인 데이터베이스 기능 구현 (Phase 1-5)
- **Completed**:
  - DB 스키마 4개 테이블 추가 (databases, database_properties, database_records, database_views)
  - seed.ts에 CREATE TABLE 추가 (`values` 예약어 이슈 수정 - 따옴표 처리)
  - database-service.ts 서비스 레이어 (DB/속성/레코드/뷰 CRUD)
  - databases.ts 라우트 (13개 API 엔드포인트 + SSE broadcast)
  - server/index.ts에 /databases 라우트 등록
  - page-service.ts deletePage cascade 삭제 추가
  - BlockNote 커스텀 `database` 블록 + `/database` 슬래시 커맨드
  - block-editor-inner.tsx 커스텀 스키마 + userId prop 전달 체인
  - 타입 시스템 (types.ts: 12종 PropertyType, 9종 ViewType)
  - use-database 훅 (fetch + mutation + SSE 구독)
  - 셀 렌더러/에디터 (12종 타입별 컴포넌트)
  - formula-engine.ts (expr-eval 기반)
  - database-container.tsx (React.lazy 뷰 전환)
  - database-toolbar.tsx, property-editor.tsx, record-editor.tsx
  - 9종 뷰: table, board, list, calendar, timeline, gallery, chart, feed, map
  - npm 의존성 설치 (@dnd-kit, date-fns, recharts, react-leaflet, leaflet, expr-eval)
  - 빌드 성공 확인 (타입 에러 모두 해결)
- **Next Steps**:
  - 키보드 네비게이션 (Table 뷰: 화살표키 이동, Enter 편집, Escape 취소)
  - 뷰별 config 설정 UI (Board의 kanbanProperty 선택, Calendar의 dateProperty 선택 등)
  - 필터/정렬 기능 구현
  - Drizzle 마이그레이션 생성 (pnpm db:generate)
  - E2E 테스트
- **Blockers**: None
- **Related Files**:
  - `apps/web/src/lib/db/schema.ts`
  - `apps/web/src/lib/db/seed.ts`
  - `apps/web/src/server/services/database-service.ts`
  - `apps/web/src/server/routes/databases.ts`
  - `apps/web/src/server/index.ts`
  - `apps/web/src/server/services/page-service.ts`
  - `apps/web/src/components/editor/block-editor-inner.tsx`
  - `apps/web/src/components/editor/database-block/` (전체 디렉토리 ~20개 파일)
  - `apps/web/src/app/(workspace)/pages/[id]/page.tsx`
  - `apps/web/src/app/(workspace)/pages/[id]/page-client.tsx`

## Past 1 [1770880237]
- **Task**: NotionFlow 자동 정리 워크스페이스 초기 구현
- **Completed**: pnpm 모노레포 + Next.js 14 + Hono API + Drizzle/SQLite 전체 스택 구축. Auth.js, BlockNote 에디터, FastAPI AI 사이드카, Docker Compose, SSE 대시보드, 페이지 링크 기능 포함 73파일 구현.
- **Note**: 로컬 dev 환경 전체 테스트 통과. Docker 통합 테스트 미완.
