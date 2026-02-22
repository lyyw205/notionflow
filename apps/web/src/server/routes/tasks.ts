import { Hono } from "hono";
import { z } from "zod";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const app = new Hono();

const createTaskSchema = z.object({
  title: z.string().min(1),
  status: z.enum(["backlog", "todo", "in_progress", "done"]).optional().default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  dueDate: z.number().nullable().optional(),
  sourcePageId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  milestoneId: z.string().uuid().nullable().optional(),
  assignee: z.string().nullable().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(["backlog", "todo", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.number().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  milestoneId: z.string().uuid().nullable().optional(),
  assignee: z.string().nullable().optional(),
});

const moveTaskSchema = z.object({
  status: z.enum(["backlog", "todo", "in_progress", "done"]),
});

app.get("/", async (c) => {
  const projectId = c.req.query("projectId");
  const status = c.req.query("status");

  let query = db.select().from(tasks);

  if (projectId && status) {
    const result = query
      .where(and(eq(tasks.projectId, projectId), eq(tasks.status, status)))
      .orderBy(desc(tasks.updatedAt))
      .all();
    return c.json(result);
  }
  if (projectId) {
    const result = query
      .where(eq(tasks.projectId, projectId))
      .orderBy(desc(tasks.updatedAt))
      .all();
    return c.json(result);
  }
  if (status) {
    const result = query
      .where(eq(tasks.status, status))
      .orderBy(desc(tasks.updatedAt))
      .all();
    return c.json(result);
  }

  const result = query.orderBy(desc(tasks.updatedAt)).all();
  return c.json(result);
});

app.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const now = Math.floor(Date.now() / 1000);
  const id = randomUUID();

  db.insert(tasks)
    .values({
      id,
      ...parsed.data,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
  return c.json(task, 201);
});

app.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const existing = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!existing) {
    return c.json({ error: "Task not found" }, 404);
  }

  const now = Math.floor(Date.now() / 1000);
  db.update(tasks)
    .set({ ...parsed.data, updatedAt: now })
    .where(eq(tasks.id, id))
    .run();

  const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
  return c.json(task);
});

app.put("/:id/move", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = moveTaskSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const existing = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!existing) {
    return c.json({ error: "Task not found" }, 404);
  }

  const now = Math.floor(Date.now() / 1000);
  db.update(tasks)
    .set({ status: parsed.data.status, updatedAt: now })
    .where(eq(tasks.id, id))
    .run();

  const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
  return c.json(task);
});

app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!existing) {
    return c.json({ error: "Task not found" }, 404);
  }

  db.delete(tasks).where(eq(tasks.id, id)).run();
  return c.json({ success: true });
});

export default app;
