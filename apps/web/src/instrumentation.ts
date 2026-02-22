import { cleanupOldEvents } from "./server/services/sse-manager";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Start BullMQ workers
    await import("./server/services/workers");

    // Clean up old SSE events on startup
    cleanupOldEvents();

    // Schedule periodic cleanup every 24 hours
    setInterval(
      () => {
        cleanupOldEvents();
      },
      24 * 60 * 60 * 1000
    );
  }
}
