import { Hono } from "hono";
import { randomUUID } from "crypto";
import { sseManager } from "../services/sse-manager";
import { db } from "@/lib/db";
import { pageEvents } from "@/lib/db/schema";
import { eq, gt, asc } from "drizzle-orm";

const app = new Hono();

app.get("/", async (c) => {
  const clientId = randomUUID();
  const lastEventId = c.req.header("last-event-id");

  const stream = new ReadableStream({
    start(controller) {
      const client = { controller, id: clientId };
      sseManager.addClient(client);

      const encoder = new TextEncoder();

      // Send initial connection event
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`
        )
      );

      // Replay missed events if client reconnected with Last-Event-ID
      if (lastEventId) {
        const lastEvent = db
          .select()
          .from(pageEvents)
          .where(eq(pageEvents.id, lastEventId))
          .get();

        if (lastEvent) {
          const missed = db
            .select()
            .from(pageEvents)
            .where(gt(pageEvents.createdAt, lastEvent.createdAt))
            .orderBy(asc(pageEvents.createdAt))
            .all();

          for (const evt of missed) {
            controller.enqueue(
              encoder.encode(
                `id: ${evt.id}\nevent: ${evt.eventType}\ndata: ${evt.payload}\n\n`
              )
            );
          }
        }
      }

      // Handle client disconnect via abort signal
      c.req.raw.signal.addEventListener("abort", () => {
        sseManager.removeClient(client);
        try {
          controller.close();
        } catch {
          // Stream already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

export default app;
