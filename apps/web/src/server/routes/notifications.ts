import { Hono } from "hono";
import { getToken } from "next-auth/jwt";
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
} from "../services/notification-service";

const AUTH_SECRET =
  process.env.AUTH_SECRET || "notionflow-dev-secret-change-in-production";

const app = new Hono();

app.get("/", async (c) => {
  const token = await getToken({
    req: c.req.raw as any,
    secret: AUTH_SECRET,
  });
  if (!token?.id) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const unreadOnly = c.req.query("unread") === "true";
  const result = listNotifications(token.id as string, unreadOnly);
  return c.json(result);
});

app.post("/:id/read", async (c) => {
  const id = c.req.param("id");
  const success = markAsRead(id);
  if (!success) {
    return c.json({ error: "Notification not found" }, 404);
  }
  return c.json({ success: true });
});

app.post("/read-all", async (c) => {
  const token = await getToken({
    req: c.req.raw as any,
    secret: AUTH_SECRET,
  });
  if (!token?.id) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const count = markAllAsRead(token.id as string);
  return c.json({ success: true, count });
});

export default app;
