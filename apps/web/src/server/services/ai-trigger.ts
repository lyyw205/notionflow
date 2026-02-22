import { getAiProcessingQueue, getProjectAnalysisQueue } from "./queue";

export async function triggerAIProcessing(
  pageId: string,
  plainText: string
): Promise<void> {
  await getAiProcessingQueue().add(
    "process-page",
    { pageId, plainText },
    {
      jobId: `page-${pageId}-${Date.now()}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    }
  );
}

export function triggerProjectAnalysis(projectId: string): void {
  getProjectAnalysisQueue()
    .add(
      "analyze-project",
      { projectId },
      {
        jobId: `project-${projectId}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
      }
    )
    .catch((err) => {
      // jobId duplicate means an analysis is already queued — safe to ignore
      if (!String(err).includes("duplicate")) {
        console.error(
          `Failed to queue project analysis for ${projectId}:`,
          err
        );
      }
    });
}
