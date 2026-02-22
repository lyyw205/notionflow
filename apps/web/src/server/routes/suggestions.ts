import { Hono } from "hono";
import {
  listSuggestions,
  acceptSuggestion,
  rejectSuggestion,
} from "../services/suggestion-service";

const app = new Hono();

app.get("/", async (c) => {
  const status = c.req.query("status");
  const suggestions = listSuggestions(status || undefined);
  return c.json(suggestions);
});

app.post("/:id/accept", async (c) => {
  const id = c.req.param("id");
  const success = acceptSuggestion(id);
  if (!success) {
    return c.json({ error: "Suggestion not found or already reviewed" }, 404);
  }
  return c.json({ success: true });
});

app.post("/:id/reject", async (c) => {
  const id = c.req.param("id");
  const success = rejectSuggestion(id);
  if (!success) {
    return c.json({ error: "Suggestion not found or already reviewed" }, 404);
  }
  return c.json({ success: true });
});

export default app;
