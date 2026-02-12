# HANDOFF

## Current [1770880237]
- **Task**: NotionFlow 자동 정리 워크스페이스 초기 구현
- **Completed**:
  - pnpm 모노레포 + Next.js 14 + Hono API + Drizzle/SQLite 전체 스택 구축 (73파일)
  - Auth.js v5 Credentials 인증 (JWT, bcrypt)
  - BlockNote 에디터 통합 (슬래시 커맨드, 2초 디바운스 자동저장)
  - Hono API: pages CRUD, files, ai-callback, reports, sse, search
  - FastAPI AI 사이드카: KR-SBERT, YAKE, KoBART, HDBSCAN, APScheduler
  - Docker Compose (web + ai + yjs 3컨테이너)
  - SSE 실시간 대시보드 (통계카드, 태그클라우드, 카테고리트리, 최근활동)
  - 페이지 간 링크 기능 (슬래시 커맨드 `/Page Link` + breadcrumb 경로 추적)
  - Edge Runtime 미들웨어 호환 수정 (auth → getToken)
  - BlockNote 0.22→0.46 업그레이드 + Mantine v8
  - 로컬 dev 환경 전체 테스트 통과 (API, Auth, SSE, 에디터, 대시보드)
- **Next Steps**:
  - Docker 환경에서 `docker compose up` 통합 테스트
  - AI 사이드카 실제 모델 로딩 테스트 (Python 환경 필요)
  - Yjs 실시간 협업 편집 연동
  - 페이지 삭제 시 관련 embeddings/files 정리
  - 리포트 자동 생성 E2E 테스트
- **Blockers**: Docker 미설치 환경이라 컨테이너 통합 테스트 미완
- **Related Files**:
  - apps/web/src/lib/db/schema.ts (DB 스키마)
  - apps/web/src/server/index.ts (Hono API 진입점)
  - apps/web/src/components/editor/block-editor-inner.tsx (에디터 코어)
  - apps/ai/src/main.py (FastAPI 진입점)
  - docker-compose.yml
