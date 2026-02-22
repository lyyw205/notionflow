import { db } from "@/lib/db";
import {
  aiSuggestions,
  pages,
  categories,
  tasks,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

// Auto-approval thresholds
const AUTO_APPROVE_THRESHOLDS: Record<string, number> = {
  category_change: 0.9,
  project_link: 0.95,
  // task_create and status_update always require manual review
};

export type SuggestionType =
  | "category_change"
  | "project_link"
  | "task_create"
  | "status_update";

interface CreateSuggestionParams {
  type: SuggestionType;
  pageId: string;
  payload: Record<string, unknown>;
  confidence?: number;
}

/**
 * Creates a suggestion or auto-approves it based on confidence threshold.
 * Returns { autoApproved: boolean, suggestionId: string }.
 */
export function createSuggestion(params: CreateSuggestionParams): {
  autoApproved: boolean;
  suggestionId: string;
} {
  const { type, pageId, payload, confidence } = params;
  const now = Math.floor(Date.now() / 1000);
  const id = randomUUID();

  const threshold = AUTO_APPROVE_THRESHOLDS[type];
  const shouldAutoApprove =
    threshold !== undefined &&
    confidence !== undefined &&
    confidence >= threshold;

  db.insert(aiSuggestions)
    .values({
      id,
      type,
      pageId,
      payload: JSON.stringify(payload),
      confidence: confidence ?? null,
      status: shouldAutoApprove ? "accepted" : "pending",
      reviewedAt: shouldAutoApprove ? now : null,
      createdAt: now,
    })
    .run();

  if (shouldAutoApprove) {
    applySuggestion(id);
  }

  return { autoApproved: shouldAutoApprove, suggestionId: id };
}

/**
 * Apply a suggestion's action to the database.
 */
export function applySuggestion(suggestionId: string): boolean {
  const suggestion = db
    .select()
    .from(aiSuggestions)
    .where(eq(aiSuggestions.id, suggestionId))
    .get();

  if (!suggestion) return false;

  const payload = JSON.parse(suggestion.payload);
  const now = Math.floor(Date.now() / 1000);

  switch (suggestion.type) {
    case "category_change": {
      if (suggestion.pageId && payload.categoryId) {
        db.update(pages)
          .set({ categoryId: payload.categoryId })
          .where(eq(pages.id, suggestion.pageId))
          .run();
      }
      break;
    }
    case "project_link": {
      if (suggestion.pageId && payload.projectId) {
        db.update(pages)
          .set({
            projectId: payload.projectId,
            ...(payload.milestoneId
              ? { milestoneId: payload.milestoneId as string }
              : {}),
          })
          .where(eq(pages.id, suggestion.pageId))
          .run();
      }
      break;
    }
    case "task_create": {
      if (payload.title) {
        db.insert(tasks)
          .values({
            id: randomUUID(),
            title: payload.title as string,
            status: "todo",
            priority: (payload.priority as string) || "medium",
            dueDate: (payload.dueDate as number) || null,
            sourcePageId: suggestion.pageId,
            projectId: (payload.projectId as string) || null,
            milestoneId: (payload.milestoneId as string) || null,
            assignee: (payload.assignee as string) || null,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }
      break;
    }
    case "status_update": {
      if (payload.taskId && payload.newStatus) {
        db.update(tasks)
          .set({
            status: payload.newStatus as string,
            updatedAt: now,
          })
          .where(eq(tasks.id, payload.taskId as string))
          .run();
      }
      break;
    }
  }

  return true;
}

export function acceptSuggestion(id: string): boolean {
  const suggestion = db
    .select()
    .from(aiSuggestions)
    .where(eq(aiSuggestions.id, id))
    .get();

  if (!suggestion || suggestion.status !== "pending") return false;

  const now = Math.floor(Date.now() / 1000);

  db.update(aiSuggestions)
    .set({ status: "accepted", reviewedAt: now })
    .where(eq(aiSuggestions.id, id))
    .run();

  applySuggestion(id);
  return true;
}

export function rejectSuggestion(id: string): boolean {
  const suggestion = db
    .select()
    .from(aiSuggestions)
    .where(eq(aiSuggestions.id, id))
    .get();

  if (!suggestion || suggestion.status !== "pending") return false;

  const now = Math.floor(Date.now() / 1000);

  db.update(aiSuggestions)
    .set({ status: "rejected", reviewedAt: now })
    .where(eq(aiSuggestions.id, id))
    .run();

  return true;
}

export function listSuggestions(status?: string) {
  if (status) {
    return db
      .select()
      .from(aiSuggestions)
      .where(eq(aiSuggestions.status, status))
      .orderBy(desc(aiSuggestions.createdAt))
      .all();
  }
  return db
    .select()
    .from(aiSuggestions)
    .orderBy(desc(aiSuggestions.createdAt))
    .all();
}
