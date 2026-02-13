import { Hono } from "hono";
import { z } from "zod";
import {
  createDatabase,
  getDatabase,
  updateDatabase,
  deleteDatabase,
  createProperty,
  updateProperty,
  deleteProperty,
  createRecord,
  updateRecord,
  deleteRecord,
  createView,
  updateView,
  deleteView,
} from "../services/database-service";
import { sseManager } from "../services/sse-manager";

const app = new Hono();

// === Database CRUD ===

const createDatabaseSchema = z.object({
  pageId: z.string().uuid(),
  createdBy: z.string().uuid(),
  name: z.string().optional(),
});

const updateDatabaseSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

app.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createDatabaseSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const result = await createDatabase(parsed.data);
  sseManager.broadcast("database-updated", { databaseId: result?.id });
  return c.json(result, 201);
});

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await getDatabase(id);
  if (!result) {
    return c.json({ error: "Database not found" }, 404);
  }
  return c.json(result);
});

app.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateDatabaseSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const result = await updateDatabase(id, parsed.data);
  if (!result) {
    return c.json({ error: "Database not found" }, 404);
  }
  sseManager.broadcast("database-updated", { databaseId: id });
  return c.json(result);
});

app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const deleted = await deleteDatabase(id);
  if (!deleted) {
    return c.json({ error: "Database not found" }, 404);
  }
  sseManager.broadcast("database-updated", { databaseId: id });
  return c.json({ success: true });
});

// === Property CRUD ===

const createPropertySchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    "text",
    "number",
    "select",
    "multi_select",
    "date",
    "checkbox",
    "url",
    "email",
    "phone",
    "person",
    "relation",
    "formula",
  ]),
  config: z.record(z.unknown()).optional(),
});

const updatePropertySchema = z.object({
  name: z.string().min(1).optional(),
  type: z
    .enum([
      "text",
      "number",
      "select",
      "multi_select",
      "date",
      "checkbox",
      "url",
      "email",
      "phone",
      "person",
      "relation",
      "formula",
    ])
    .optional(),
  config: z.record(z.unknown()).optional(),
  sortOrder: z.number().optional(),
});

app.post("/:id/properties", async (c) => {
  const databaseId = c.req.param("id");
  const body = await c.req.json();
  const parsed = createPropertySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const result = await createProperty({ databaseId, ...parsed.data });
  sseManager.broadcast("database-updated", { databaseId });
  return c.json(result, 201);
});

app.put("/:id/properties/:pid", async (c) => {
  const pid = c.req.param("pid");
  const databaseId = c.req.param("id");
  const body = await c.req.json();
  const parsed = updatePropertySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const result = await updateProperty(pid, parsed.data);
  if (!result) {
    return c.json({ error: "Property not found" }, 404);
  }
  sseManager.broadcast("database-updated", { databaseId });
  return c.json(result);
});

app.delete("/:id/properties/:pid", async (c) => {
  const pid = c.req.param("pid");
  const databaseId = c.req.param("id");
  const deleted = await deleteProperty(pid);
  if (!deleted) {
    return c.json({ error: "Property not found" }, 404);
  }
  sseManager.broadcast("database-updated", { databaseId });
  return c.json({ success: true });
});

// === Record CRUD ===

const createRecordSchema = z.object({
  values: z.record(z.unknown()).optional(),
});

const updateRecordSchema = z.object({
  values: z.record(z.unknown()).optional(),
  sortOrder: z.number().optional(),
});

app.post("/:id/records", async (c) => {
  const databaseId = c.req.param("id");
  const body = await c.req.json();
  const parsed = createRecordSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const result = await createRecord({ databaseId, ...parsed.data });
  sseManager.broadcast("database-updated", { databaseId });
  return c.json(result, 201);
});

app.put("/:id/records/:rid", async (c) => {
  const rid = c.req.param("rid");
  const databaseId = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateRecordSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const result = await updateRecord(rid, parsed.data);
  if (!result) {
    return c.json({ error: "Record not found" }, 404);
  }
  sseManager.broadcast("database-updated", { databaseId });
  return c.json(result);
});

app.delete("/:id/records/:rid", async (c) => {
  const rid = c.req.param("rid");
  const databaseId = c.req.param("id");
  const deleted = await deleteRecord(rid);
  if (!deleted) {
    return c.json({ error: "Record not found" }, 404);
  }
  sseManager.broadcast("database-updated", { databaseId });
  return c.json({ success: true });
});

// === View CRUD ===

const createViewSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    "table",
    "board",
    "timeline",
    "calendar",
    "list",
    "gallery",
    "chart",
    "feed",
    "map",
  ]),
  config: z.record(z.unknown()).optional(),
});

const updateViewSchema = z.object({
  name: z.string().min(1).optional(),
  type: z
    .enum([
      "table",
      "board",
      "timeline",
      "calendar",
      "list",
      "gallery",
      "chart",
      "feed",
      "map",
    ])
    .optional(),
  config: z.record(z.unknown()).optional(),
  sortOrder: z.number().optional(),
});

app.post("/:id/views", async (c) => {
  const databaseId = c.req.param("id");
  const body = await c.req.json();
  const parsed = createViewSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const result = await createView({ databaseId, ...parsed.data });
  sseManager.broadcast("database-updated", { databaseId });
  return c.json(result, 201);
});

app.put("/:id/views/:vid", async (c) => {
  const vid = c.req.param("vid");
  const databaseId = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateViewSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const result = await updateView(vid, parsed.data);
  if (!result) {
    return c.json({ error: "View not found" }, 404);
  }
  sseManager.broadcast("database-updated", { databaseId });
  return c.json(result);
});

app.delete("/:id/views/:vid", async (c) => {
  const vid = c.req.param("vid");
  const databaseId = c.req.param("id");
  const deleted = await deleteView(vid);
  if (!deleted) {
    return c.json({ error: "View not found" }, 404);
  }
  sseManager.broadcast("database-updated", { databaseId });
  return c.json({ success: true });
});

export default app;
