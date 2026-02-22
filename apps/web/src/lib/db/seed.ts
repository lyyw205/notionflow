import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import { randomUUID } from "crypto";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./data/notionflow.db";
const resolvedPath = path.resolve(dbPath);

fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const sqlite = new Database(resolvedPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite, { schema });

const existingAdmin = db
  .select()
  .from(schema.users)
  .where(eq(schema.users.email, "admin@notionflow.local"))
  .get();

let adminId: string;

if (!existingAdmin) {
  adminId = randomUUID();
  const passwordHash = hashSync("admin123", 10);
  db.insert(schema.users)
    .values({
      id: adminId,
      email: "admin@notionflow.local",
      name: "Admin",
      passwordHash,
      role: "admin",
      createdAt: Math.floor(Date.now() / 1000),
    })
    .run();
  console.log("Seeded admin user: admin@notionflow.local / admin123");
} else {
  adminId = existingAdmin.id;
  console.log("Admin user already exists, skipping seed.");
}

// --- 샘플 데이터 ---
const existingProjects = db.select().from(schema.projects).all();

if (existingProjects.length === 0) {
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;

  // 프로젝트 1: NotionFlow v2 개발
  const proj1Id = randomUUID();
  db.insert(schema.projects).values({
    id: proj1Id,
    name: "NotionFlow v2 개발",
    description: "차세대 NotionFlow 플랫폼 개발 프로젝트. AI 자동 정리, 실시간 협업, 프로젝트 관리 기능 포함.",
    status: "active",
    ownerId: adminId,
    startDate: now - 30 * day,
    endDate: now + 60 * day,
    aiSummary: "AI 기반 페이지 자동 분류와 실시간 협업 기능 개발이 진행 중입니다. 백엔드 API 구현이 완료되었고 프론트엔드 작업이 활발히 이루어지고 있습니다.",
    progress: 45,
    createdAt: now - 30 * day,
    updatedAt: now,
  }).run();

  const ms1_1 = randomUUID();
  const ms1_2 = randomUUID();
  const ms1_3 = randomUUID();

  db.insert(schema.milestones).values([
    {
      id: ms1_1,
      projectId: proj1Id,
      title: "백엔드 API 설계 및 구현",
      description: "Hono 기반 REST API, Drizzle ORM, SQLite DB 스키마 설계",
      status: "completed",
      startDate: now - 30 * day,
      endDate: now - 10 * day,
      sortOrder: 0,
      aiProgress: 100,
      aiSummary: "API 라우트, 서비스 레이어, DB 스키마 구현 완료. 페이지 CRUD, 파일 업로드, AI 콜백 엔드포인트 포함.",
      createdAt: now - 30 * day,
      updatedAt: now - 10 * day,
    },
    {
      id: ms1_2,
      projectId: proj1Id,
      title: "프론트엔드 UI 개발",
      description: "Next.js 14 + BlockNote 에디터 + Mantine UI 기반 워크스페이스",
      status: "in_progress",
      startDate: now - 15 * day,
      endDate: now + 30 * day,
      sortOrder: 1,
      aiProgress: 55,
      aiSummary: "대시보드, 에디터, 사이드바 구현 완료. 프로젝트 관리 페이지 작업 중.",
      createdAt: now - 15 * day,
      updatedAt: now,
    },
    {
      id: ms1_3,
      projectId: proj1Id,
      title: "AI 사이드카 통합",
      description: "KR-SBERT 임베딩, KoBART 요약, YAKE 키워드, HDBSCAN 클러스터링",
      status: "pending",
      startDate: now + 15 * day,
      endDate: now + 60 * day,
      sortOrder: 2,
      aiProgress: 0,
      aiSummary: "",
      createdAt: now - 10 * day,
      updatedAt: now,
    },
  ]).run();

  // 프로젝트 2: 사내 위키 마이그레이션
  const proj2Id = randomUUID();
  db.insert(schema.projects).values({
    id: proj2Id,
    name: "사내 위키 마이그레이션",
    description: "기존 Confluence 위키를 NotionFlow로 이전하는 프로젝트",
    status: "planned",
    ownerId: adminId,
    startDate: now + 14 * day,
    endDate: now + 90 * day,
    progress: 0,
    createdAt: now - 5 * day,
    updatedAt: now - 5 * day,
  }).run();

  const ms2_1 = randomUUID();
  const ms2_2 = randomUUID();

  db.insert(schema.milestones).values([
    {
      id: ms2_1,
      projectId: proj2Id,
      title: "데이터 추출 및 변환",
      description: "Confluence API로 기존 문서 추출 후 BlockNote JSON으로 변환",
      status: "pending",
      startDate: now + 14 * day,
      endDate: now + 45 * day,
      sortOrder: 0,
      aiProgress: 0,
      createdAt: now - 5 * day,
      updatedAt: now - 5 * day,
    },
    {
      id: ms2_2,
      projectId: proj2Id,
      title: "검증 및 사용자 교육",
      description: "이전된 문서 검증, 팀별 사용자 교육 세션 진행",
      status: "pending",
      startDate: now + 45 * day,
      endDate: now + 90 * day,
      sortOrder: 1,
      aiProgress: 0,
      createdAt: now - 5 * day,
      updatedAt: now - 5 * day,
    },
  ]).run();

  // 프로젝트 3: 디자인 시스템 구축
  const proj3Id = randomUUID();
  db.insert(schema.projects).values({
    id: proj3Id,
    name: "디자인 시스템 구축",
    description: "통일된 UI 컴포넌트 라이브러리와 디자인 가이드라인 수립",
    status: "active",
    ownerId: adminId,
    startDate: now - 20 * day,
    endDate: now + 40 * day,
    aiSummary: "색상, 타이포그래피, 컴포넌트 가이드라인 정의가 완료되었고 Storybook 문서화가 진행 중입니다.",
    progress: 65,
    createdAt: now - 20 * day,
    updatedAt: now - 1 * day,
  }).run();

  const ms3_1 = randomUUID();
  const ms3_2 = randomUUID();

  db.insert(schema.milestones).values([
    {
      id: ms3_1,
      projectId: proj3Id,
      title: "디자인 토큰 정의",
      description: "색상, 타이포그래피, 스페이싱, 브레이크포인트 토큰 정의",
      status: "completed",
      startDate: now - 20 * day,
      endDate: now - 5 * day,
      sortOrder: 0,
      aiProgress: 100,
      aiSummary: "brand, neutral, semantic 색상 팔레트 및 heading/body 타이포그래피 스케일 정의 완료.",
      createdAt: now - 20 * day,
      updatedAt: now - 5 * day,
    },
    {
      id: ms3_2,
      projectId: proj3Id,
      title: "공통 컴포넌트 개발",
      description: "Button, Input, Modal, Card 등 기본 컴포넌트 구현 및 Storybook 문서화",
      status: "in_progress",
      startDate: now - 5 * day,
      endDate: now + 40 * day,
      sortOrder: 1,
      aiProgress: 40,
      aiSummary: "Button, Input 컴포넌트 완료. Modal, Card 작업 진행 중.",
      createdAt: now - 5 * day,
      updatedAt: now - 1 * day,
    },
  ]).run();

  // 샘플 페이지 생성 (프로젝트에 연결)
  const samplePages = [
    {
      id: randomUUID(),
      title: "API 엔드포인트 설계 문서",
      plainText: "페이지 CRUD, 파일 업로드, AI 콜백 등 전체 API 엔드포인트 명세를 정리합니다.",
      projectId: proj1Id,
      milestoneId: ms1_1,
    },
    {
      id: randomUUID(),
      title: "DB 스키마 설계 노트",
      plainText: "SQLite 기반 스키마 설계. users, pages, categories, tags, embeddings 테이블 구조.",
      projectId: proj1Id,
      milestoneId: ms1_1,
    },
    {
      id: randomUUID(),
      title: "대시보드 UI 와이어프레임",
      plainText: "대시보드 레이아웃: 통계 카드, 최근 활동, 태그 클라우드, 카테고리 트리 구성.",
      projectId: proj1Id,
      milestoneId: ms1_2,
    },
    {
      id: randomUUID(),
      title: "에디터 컴포넌트 구현 가이드",
      plainText: "BlockNote v0.46 기반 블록 에디터 구현. 슬래시 커맨드, 페이지 링크, 자동 저장 포함.",
      projectId: proj1Id,
      milestoneId: ms1_2,
    },
    {
      id: randomUUID(),
      title: "Confluence 데이터 구조 분석",
      plainText: "Confluence REST API로 추출 가능한 데이터 포맷 분석. Space, Page, Attachment 매핑.",
      projectId: proj2Id,
      milestoneId: ms2_1,
    },
    {
      id: randomUUID(),
      title: "색상 팔레트 정의서",
      plainText: "Primary: brand-50~900, Neutral: gray-50~900, Semantic: success/warning/error 색상 정의.",
      projectId: proj3Id,
      milestoneId: ms3_1,
    },
    {
      id: randomUUID(),
      title: "Button 컴포넌트 스펙",
      plainText: "variant: solid/outline/ghost, size: sm/md/lg, 상태: default/hover/active/disabled.",
      projectId: proj3Id,
      milestoneId: ms3_2,
    },
    {
      id: randomUUID(),
      title: "주간 회의록 - 2월 첫째 주",
      plainText: "이번 주 진행 사항 공유. API 개발 완료, 프론트엔드 대시보드 작업 시작. 다음 주 목표: 에디터 완성.",
      projectId: null,
      milestoneId: null,
    },
    {
      id: randomUUID(),
      title: "개발 환경 설정 가이드",
      plainText: "pnpm 설치, 환경변수 설정, Docker Compose 실행 방법, 개발 서버 시작 순서 정리.",
      projectId: null,
      milestoneId: null,
    },
  ];

  for (const p of samplePages) {
    const content = JSON.stringify([
      {
        id: randomUUID(),
        type: "paragraph",
        props: { textColor: "default", backgroundColor: "default", textAlignment: "left" },
        content: [{ type: "text", text: p.plainText, styles: {} }],
        children: [],
      },
    ]);

    db.insert(schema.pages).values({
      id: p.id,
      title: p.title,
      content,
      plainText: p.plainText,
      summary: p.plainText.slice(0, 80),
      authorId: adminId,
      projectId: p.projectId,
      milestoneId: p.milestoneId,
      createdAt: now - Math.floor(Math.random() * 20) * day,
      updatedAt: now - Math.floor(Math.random() * 5) * day,
    }).run();

    db.insert(schema.pageVersions).values({
      id: randomUUID(),
      pageId: p.id,
      version: 1,
      content,
      plainText: p.plainText,
      createdAt: now,
    }).run();
  }

  console.log("Seeded sample data: 3 projects, 7 milestones, 9 pages");
} else {
  console.log("Projects already exist, skipping sample data.");
}

sqlite.close();
console.log("Seed complete.");
