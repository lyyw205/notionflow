import { db } from "@/lib/db";
import { projects, milestones, pages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function createProject(params: {
  name: string;
  description?: string;
  status?: string;
  ownerId: string;
  startDate?: number;
  endDate?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const id = randomUUID();

  db.insert(projects)
    .values({
      id,
      name: params.name,
      description: params.description || null,
      status: params.status || "planned",
      ownerId: params.ownerId,
      startDate: params.startDate || null,
      endDate: params.endDate || null,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return getProject(id);
}

export async function updateProject(
  id: string,
  params: {
    name?: string;
    description?: string | null;
    status?: string;
    startDate?: number | null;
    endDate?: number | null;
  }
) {
  const existing = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!existing) return null;

  const now = Math.floor(Date.now() / 1000);

  db.update(projects)
    .set({
      name: params.name ?? existing.name,
      description:
        params.description !== undefined
          ? params.description
          : existing.description,
      status: params.status ?? existing.status,
      startDate:
        params.startDate !== undefined
          ? params.startDate
          : existing.startDate,
      endDate:
        params.endDate !== undefined ? params.endDate : existing.endDate,
      updatedAt: now,
    })
    .where(eq(projects.id, id))
    .run();

  return getProject(id);
}

export async function deleteProject(id: string) {
  const existing = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!existing) return false;

  // Unlink pages from this project
  db.update(pages)
    .set({ projectId: null, milestoneId: null })
    .where(eq(pages.projectId, id))
    .run();

  // Delete milestones
  db.delete(milestones).where(eq(milestones.projectId, id)).run();

  // Delete project
  db.delete(projects).where(eq(projects.id, id)).run();

  return true;
}

export async function getProject(id: string) {
  const project = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) return null;

  const projectMilestones = db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, id))
    .orderBy(milestones.sortOrder)
    .all();

  const projectPages = db
    .select()
    .from(pages)
    .where(eq(pages.projectId, id))
    .orderBy(desc(pages.updatedAt))
    .all();

  return {
    ...project,
    milestones: projectMilestones,
    pages: projectPages.map((p) => ({
      id: p.id,
      title: p.title,
      summary: p.summary,
      milestoneId: p.milestoneId,
      updatedAt: p.updatedAt,
    })),
  };
}

export async function listProjects(ownerId?: string) {
  const allProjects = ownerId
    ? db
        .select()
        .from(projects)
        .where(eq(projects.ownerId, ownerId))
        .orderBy(desc(projects.updatedAt))
        .all()
    : db.select().from(projects).orderBy(desc(projects.updatedAt)).all();

  const results = [];
  for (const project of allProjects) {
    const milestoneCount = db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, project.id))
      .all().length;

    const pageCount = db
      .select()
      .from(pages)
      .where(eq(pages.projectId, project.id))
      .all().length;

    results.push({
      ...project,
      milestoneCount,
      pageCount,
    });
  }

  return results;
}

// Milestone CRUD

export async function createMilestone(params: {
  projectId: string;
  title: string;
  description?: string;
  status?: string;
  startDate?: number;
  endDate?: number;
  sortOrder?: number;
}) {
  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .get();
  if (!project) return null;

  const now = Math.floor(Date.now() / 1000);
  const id = randomUUID();

  // Auto sort order if not provided
  const existingMilestones = db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, params.projectId))
    .all();
  const sortOrder =
    params.sortOrder ?? existingMilestones.length;

  db.insert(milestones)
    .values({
      id,
      projectId: params.projectId,
      title: params.title,
      description: params.description || null,
      status: params.status || "pending",
      startDate: params.startDate || null,
      endDate: params.endDate || null,
      sortOrder,
      aiProgress: 0,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  // Update project updatedAt
  db.update(projects)
    .set({ updatedAt: now })
    .where(eq(projects.id, params.projectId))
    .run();

  return db.select().from(milestones).where(eq(milestones.id, id)).get();
}

export async function updateMilestone(
  id: string,
  params: {
    title?: string;
    description?: string | null;
    status?: string;
    startDate?: number | null;
    endDate?: number | null;
    sortOrder?: number;
  }
) {
  const existing = db
    .select()
    .from(milestones)
    .where(eq(milestones.id, id))
    .get();
  if (!existing) return null;

  const now = Math.floor(Date.now() / 1000);

  db.update(milestones)
    .set({
      title: params.title ?? existing.title,
      description:
        params.description !== undefined
          ? params.description
          : existing.description,
      status: params.status ?? existing.status,
      startDate:
        params.startDate !== undefined
          ? params.startDate
          : existing.startDate,
      endDate:
        params.endDate !== undefined ? params.endDate : existing.endDate,
      sortOrder: params.sortOrder ?? existing.sortOrder,
      updatedAt: now,
    })
    .where(eq(milestones.id, id))
    .run();

  // Update project updatedAt
  db.update(projects)
    .set({ updatedAt: now })
    .where(eq(projects.id, existing.projectId))
    .run();

  return db.select().from(milestones).where(eq(milestones.id, id)).get();
}

export async function deleteMilestone(id: string) {
  const existing = db
    .select()
    .from(milestones)
    .where(eq(milestones.id, id))
    .get();
  if (!existing) return false;

  const now = Math.floor(Date.now() / 1000);

  // Unlink pages from this milestone
  db.update(pages)
    .set({ milestoneId: null })
    .where(eq(pages.milestoneId, id))
    .run();

  db.delete(milestones).where(eq(milestones.id, id)).run();

  // Update project updatedAt
  db.update(projects)
    .set({ updatedAt: now })
    .where(eq(projects.id, existing.projectId))
    .run();

  return true;
}

// Page linking

export async function linkPageToProject(
  pageId: string,
  projectId: string,
  milestoneId?: string
) {
  const page = db.select().from(pages).where(eq(pages.id, pageId)).get();
  if (!page) return null;

  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();
  if (!project) return null;

  if (milestoneId) {
    const milestone = db
      .select()
      .from(milestones)
      .where(eq(milestones.id, milestoneId))
      .get();
    if (!milestone || milestone.projectId !== projectId) {
      return null;
    }
  }

  const now = Math.floor(Date.now() / 1000);

  db.update(pages)
    .set({
      projectId,
      milestoneId: milestoneId || null,
      updatedAt: now,
    })
    .where(eq(pages.id, pageId))
    .run();

  db.update(projects)
    .set({ updatedAt: now })
    .where(eq(projects.id, projectId))
    .run();

  return db.select().from(pages).where(eq(pages.id, pageId)).get();
}

export async function unlinkPageFromProject(pageId: string) {
  const page = db.select().from(pages).where(eq(pages.id, pageId)).get();
  if (!page) return false;

  const now = Math.floor(Date.now() / 1000);

  const projectId = page.projectId;

  db.update(pages)
    .set({ projectId: null, milestoneId: null, updatedAt: now })
    .where(eq(pages.id, pageId))
    .run();

  if (projectId) {
    db.update(projects)
      .set({ updatedAt: now })
      .where(eq(projects.id, projectId))
      .run();
  }

  return true;
}
