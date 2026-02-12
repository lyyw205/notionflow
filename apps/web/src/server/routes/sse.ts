import { Hono } from "hono";
import { randomUUID } from "crypto";
import { sseManager } from "../services/sse-manager";

const app = new Hono();

app.get("/", async (c) => {
  const clientId = randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      const client = { controller, id: clientId };
      sseManager.addClient(client);

      // Send initial connection event
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`)
      );

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
