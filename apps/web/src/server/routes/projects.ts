import { Hono } from "hono";
import { z } from "zod";
import {
  createProject,
  updateProject,
  deleteProject,
  getProject,
  listProjects,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  linkPageToProject,
  unlinkPageFromProject,
} from "../services/project-service";
import { sseManager } from "../services/sse-manager";

const app = new Hono();

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["planned", "active", "completed", "on_hold"]).optional(),
  ownerId: z.string().uuid(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["planned", "active", "completed", "on_hold"]).optional(),
  startDate: z.number().nullable().optional(),
  endDate: z.number().nullable().optional(),
});

const createMilestoneSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
  sortOrder: z.number().optional(),
});

const updateMilestoneSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  startDate: z.number().nullable().optional(),
  endDate: z.number().nullable().optional(),
  sortOrder: z.number().optional(),
});

const linkPageSchema = z.object({
  pageId: z.string().uuid(),
  milestoneId: z.string().uuid().optional(),
});

// Project CRUD

app.get("/", async (c) => {
  const ownerId = c.req.query("ownerId");
  const result = await listProjects(ownerId || undefined);
  return c.json(result);
});

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const project = await getProject(id);
  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }
  return c.json(project);
});

app.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const project = await createProject(parsed.data);
  sseManager.broadcast("project-created", { projectId: project!.id });
  return c.json(project, 201);
});

app.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const result = await updateProject(id, parsed.data);
  if (!result) {
    return c.json({ error: "Project not found" }, 404);
  }

  sseManager.broadcast("project-updated", { projectId: id });
  return c.json(result);
});

app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const deleted = await deleteProject(id);
  if (!deleted) {
    return c.json({ error: "Project not found" }, 404);
  }

  sseManager.broadcast("project-deleted", { projectId: id });
  return c.json({ success: true });
});

// Milestones

app.post("/:id/milestones", async (c) => {
  const projectId = c.req.param("id");
  const body = await c.req.json();
  const parsed = createMilestoneSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const milestone = await createMilestone({ ...parsed.data, projectId });
  if (!milestone) {
    return c.json({ error: "Project not found" }, 404);
  }

  sseManager.broadcast("project-updated", { projectId });
  return c.json(milestone, 201);
});

app.put("/:id/milestones/:mid", async (c) => {
  const mid = c.req.param("mid");
  const projectId = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateMilestoneSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const result = await updateMilestone(mid, parsed.data);
  if (!result) {
    return c.json({ error: "Milestone not found" }, 404);
  }

  sseManager.broadcast("project-updated", { projectId });
  return c.json(result);
});

app.delete("/:id/milestones/:mid", async (c) => {
  const mid = c.req.param("mid");
  const projectId = c.req.param("id");
  const deleted = await deleteMilestone(mid);
  if (!deleted) {
    return c.json({ error: "Milestone not found" }, 404);
  }

  sseManager.broadcast("project-updated", { projectId });
  return c.json({ success: true });
});

// Page linking

app.post("/:id/pages", async (c) => {
  const projectId = c.req.param("id");
  const body = await c.req.json();
  const parsed = linkPageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const result = await linkPageToProject(
    parsed.data.pageId,
    projectId,
    parsed.data.milestoneId
  );
  if (!result) {
    return c.json({ error: "Page or project not found" }, 404);
  }

  sseManager.broadcast("project-updated", { projectId });
  return c.json(result);
});

app.delete("/:id/pages/:pageId", async (c) => {
  const pageId = c.req.param("pageId");
  const projectId = c.req.param("id");
  const unlinked = await unlinkPageFromProject(pageId);
  if (!unlinked) {
    return c.json({ error: "Page not found" }, 404);
  }

  sseManager.broadcast("project-updated", { projectId });
  return c.json({ success: true });
});

export default app;
