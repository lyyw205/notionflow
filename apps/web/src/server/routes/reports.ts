import { Hono } from "hono";
import { z } from "zod";
import { db } from "@/lib/db";
import { reports, pages } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { sseManager } from "../services/sse-manager";

const app = new Hono();

app.get("/", async (c) => {
  const allReports = db
    .select()
    .from(reports)
    .orderBy(desc(reports.createdAt))
    .all();
  return c.json(allReports);
});

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const report = db.select().from(reports).where(eq(reports.id, id)).get();
  if (!report) {
    return c.json({ error: "Report not found" }, 404);
  }
  return c.json(report);
});

const generateSchema = z.object({
  type: z.enum(["daily", "weekly"]),
  periodStart: z.number(),
  periodEnd: z.number(),
});

app.post("/generate", async (c) => {
  const body = await c.req.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { type, periodStart, periodEnd } = parsed.data;

  // Gather pages updated in the period
  const periodPages = db
    .select()
    .from(pages)
    .where(and(gte(pages.updatedAt, periodStart), lte(pages.updatedAt, periodEnd)))
    .all();

  const startDate = new Date(periodStart * 1000).toISOString().split("T")[0];
  const endDate = new Date(periodEnd * 1000).toISOString().split("T")[0];

  const reportContent = {
    period: { start: startDate, end: endDate },
    totalPages: periodPages.length,
    pages: periodPages.map((p) => ({
      id: p.id,
      title: p.title,
      summary: p.summary,
      updatedAt: p.updatedAt,
    })),
  };

  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const title = `${type === "daily" ? "Daily" : "Weekly"} Report: ${startDate} - ${endDate}`;

  db.insert(reports)
    .values({
      id,
      type,
      title,
      content: JSON.stringify(reportContent),
      periodStart,
      periodEnd,
      createdAt: now,
    })
    .run();

  const report = db.select().from(reports).where(eq(reports.id, id)).get();

  sseManager.broadcast("report-created", { reportId: id, title });

  return c.json(report, 201);
});

export default app;
