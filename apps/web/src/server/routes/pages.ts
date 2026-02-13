import { Hono } from "hono";
import { z } from "zod";
import {
  createPage,
  updatePage,
  deletePage,
  getPage,
  listPages,
} from "../services/page-service";
import { triggerAIProcessing, triggerProjectAnalysis } from "../services/ai-trigger";

const app = new Hono();

const createPageSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  authorId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  milestoneId: z.string().uuid().optional(),
});

const updatePageSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  milestoneId: z.string().uuid().nullable().optional(),
});

app.get("/", async (c) => {
  const categoryId = c.req.query("categoryId");
  const result = await listPages(categoryId || undefined);
  return c.json(result);
});

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const page = await getPage(id);
  if (!page) {
    return c.json({ error: "Page not found" }, 404);
  }
  return c.json(page);
});

app.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createPageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const page = await createPage(parsed.data);
  return c.json(page, 201);
});

app.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updatePageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const result = await updatePage(id, parsed.data);
  if (!result) {
    return c.json({ error: "Page not found" }, 404);
  }

  // Trigger AI processing asynchronously
  if (parsed.data.content && result.plainText) {
    triggerAIProcessing(id, result.plainText);
  }

  // Trigger project analysis if page belongs to a project
  if (result.projectId) {
    triggerProjectAnalysis(result.projectId);
  }

  return c.json(result);
});

app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const deleted = await deletePage(id);
  if (!deleted) {
    return c.json({ error: "Page not found" }, 404);
  }
  return c.json({ success: true });
});

export default app;
