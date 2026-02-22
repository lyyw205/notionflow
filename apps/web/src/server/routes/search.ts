import { Hono } from "hono";
import {
  keywordSearch,
  semanticSearch,
  hybridSearch,
} from "../services/search-service";

const app = new Hono();

app.get("/", async (c) => {
  const q = c.req.query("q");
  if (!q || q.trim().length === 0) {
    return c.json({ error: "Query parameter 'q' is required" }, 400);
  }

  const mode = c.req.query("mode") || "hybrid";
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = Math.min(parseInt(c.req.query("limit") || "20", 10), 50);
  const offset = (page - 1) * limit;

  let results;
  switch (mode) {
    case "keyword":
      results = await keywordSearch(q, limit, offset);
      break;
    case "semantic":
      results = await semanticSearch(q, limit);
      break;
    case "hybrid":
    default:
      results = await hybridSearch(q, limit, offset);
      break;
  }

  return c.json({
    results,
    page,
    limit,
    mode,
    total: results.length,
  });
});

export default app;
