import { Queue } from "bullmq";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || "localhost",
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password || undefined,
    maxRetriesPerRequest: null,
  };
}

export const connection = parseRedisUrl(REDIS_URL);

let _aiProcessingQueue: Queue | null = null;
let _projectAnalysisQueue: Queue | null = null;

export function getAiProcessingQueue(): Queue {
  if (!_aiProcessingQueue) {
    _aiProcessingQueue = new Queue("ai-processing", { connection });
  }
  return _aiProcessingQueue;
}

export function getProjectAnalysisQueue(): Queue {
  if (!_projectAnalysisQueue) {
    _projectAnalysisQueue = new Queue("project-analysis", { connection });
  }
  return _projectAnalysisQueue;
}
