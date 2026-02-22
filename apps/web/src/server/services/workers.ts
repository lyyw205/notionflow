import { Worker } from "bullmq";
import { connection } from "./queue";
import { db } from "@/lib/db";
import { projects, milestones, pages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const WEB_CALLBACK_URL =
  process.env.WEB_CALLBACK_URL || "http://localhost:3000/api";

const workerOpts = {
  connection,
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
};

export const aiProcessingWorker = new Worker(
  "ai-processing",
  async (job) => {
    const { pageId, plainText } = job.data as {
      pageId: string;
      plainText: string;
    };

    const callbackUrl = `${WEB_CALLBACK_URL}/ai/callback`;

    const res = await fetch(`${AI_SERVICE_URL}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page_id: pageId,
        plain_text: plainText,
        callback_url: callbackUrl,
      }),
    });

    if (!res.ok) {
      throw new Error(
        `AI service returned ${res.status}: ${await res.text()}`
      );
    }

    return { status: res.status };
  },
  workerOpts
);

export const projectAnalysisWorker = new Worker(
  "project-analysis",
  async (job) => {
    const { projectId } = job.data as { projectId: string };

    const project = db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .get();
    if (!project) {
      return { skipped: true, reason: "project not found" };
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

    const res = await fetch(`${AI_SERVICE_URL}/project/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(
        `AI project analysis returned ${res.status}: ${await res.text()}`
      );
    }

    return { status: res.status };
  },
  workerOpts
);

aiProcessingWorker.on("failed", (job, err) => {
  console.error(
    `AI processing job ${job?.id} failed (attempt ${job?.attemptsMade}):`,
    err.message
  );
});

projectAnalysisWorker.on("failed", (job, err) => {
  console.error(
    `Project analysis job ${job?.id} failed (attempt ${job?.attemptsMade}):`,
    err.message
  );
});

console.log("BullMQ workers started: ai-processing, project-analysis");
