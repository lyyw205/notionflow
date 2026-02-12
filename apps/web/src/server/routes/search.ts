import { Hono } from "hono";
import { db } from "@/lib/db";
import { pages, categories, pageTags, tags } from "@/lib/db/schema";
import { like, eq, desc } from "drizzle-orm";

const app = new Hono();

app.get("/", async (c) => {
  const q = c.req.query("q");
  if (!q || q.trim().length === 0) {
    return c.json({ error: "Query parameter 'q' is required" }, 400);
  }

  const searchPattern = `%${q}%`;

  const matchedPages = db
    .select()
    .from(pages)
    .where(like(pages.plainText, searchPattern))
    .orderBy(desc(pages.updatedAt))
    .all();

  const results = [];
  for (const page of matchedPages) {
    const category = page.categoryId
      ? db
          .select()
          .from(categories)
          .where(eq(categories.id, page.categoryId))
          .get()
      : null;

    const pageTagRows = db
      .select()
      .from(pageTags)
      .innerJoin(tags, eq(pageTags.tagId, tags.id))
      .where(eq(pageTags.pageId, page.id))
      .all();

    results.push({
      id: page.id,
      title: page.title,
      summary: page.summary,
      category: category ? { id: category.id, name: category.name } : null,
      tags: pageTagRows.map((row) => ({
        id: row.tags.id,
        name: row.tags.name,
      })),
      updatedAt: page.updatedAt,
    });
  }

  return c.json(results);
});

export default app;
