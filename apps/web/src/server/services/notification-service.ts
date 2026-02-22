import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}

export function createNotification(params: CreateNotificationParams) {
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);

  db.insert(notifications)
    .values({
      id,
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null,
      isRead: 0,
      createdAt: now,
    })
    .run();

  return { id, ...params, isRead: 0, createdAt: now };
}

export function listNotifications(userId: string, unreadOnly = false) {
  if (unreadOnly) {
    return db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, 0)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .all();
  }
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50)
    .all();
}

export function markAsRead(id: string): boolean {
  const existing = db
    .select()
    .from(notifications)
    .where(eq(notifications.id, id))
    .get();
  if (!existing) return false;

  db.update(notifications)
    .set({ isRead: 1 })
    .where(eq(notifications.id, id))
    .run();
  return true;
}

export function markAllAsRead(userId: string): number {
  const result = db
    .update(notifications)
    .set({ isRead: 1 })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, 0)
      )
    )
    .run();
  return result.changes;
}
