import { db } from "@/lib/db";
import { projects, milestones, pages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const WEB_CALLBACK_URL = process.env.WEB_CALLBACK_URL || "http://localhost:3000/api";

const projectAnalysisDebounce = new Map<string, number>();

export async function triggerAIProcessing(
  pageId: string,
  plainText: string
): Promise<void> {
  try {
    const callbackUrl = `${WEB_CALLBACK_URL}/ai/callback`;

    fetch(`${AI_SERVICE_URL}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page_id: pageId,
        plain_text: plainText,
        callback_url: callbackUrl,
      }),
    }).catch((err) => {
      console.error(`AI trigger failed for page ${pageId}:`, err.message);
    });
  } catch (err) {
    console.error(`AI trigger error for page ${pageId}:`, err);
  }
}

export function triggerProjectAnalysis(projectId: string): void {
  const now = Date.now();
  const lastTrigger = projectAnalysisDebounce.get(projectId);
  if (lastTrigger && now - lastTrigger < 10_000) {
    return;
  }
  projectAnalysisDebounce.set(projectId, now);

  try {
    const project = db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .get();
    if (!project) {
      return;
    }

    const projectMilestones = db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, projectId))
      .all();

    const projectPages = db
      .select()
      .from(pages)
      .where(eq(pages.projectId, projectId))
      .all();

    const payload = {
      project_id: projectId,
      project_name: project.name,
      callback_url: `${WEB_CALLBACK_URL}/ai/project-callback`,
      milestones: projectMilestones.map((m) => ({
        id: m.id,
        title: m.title,
        status: m.status,
      })),
      pages: projectPages.map((p) => ({
        id: p.id,
        title: p.title,
        content: p.summary || p.plainText.slice(0, 200),
        milestone_id: p.milestoneId,
      })),
    };

    fetch(`${AI_SERVICE_URL}/project/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.error(
        `AI project analysis trigger failed for project ${projectId}:`,
        err.message
      );
    });
  } catch (err) {
    console.error(
      `AI project analysis trigger error for project ${projectId}:`,
      err
    );
  }
}
