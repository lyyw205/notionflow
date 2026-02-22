import { db } from "@/lib/db";
import { pageEvents } from "@/lib/db/schema";
import { lt } from "drizzle-orm";
import { randomUUID } from "crypto";

type SSEClient = {
  controller: ReadableStreamDefaultController;
  id: string;
};

class SSEManager {
  private clients: Set<SSEClient> = new Set();

  addClient(client: SSEClient) {
    this.clients.add(client);
  }

  removeClient(client: SSEClient) {
    this.clients.delete(client);
  }

  broadcast(event: string, data: unknown) {
    const eventId = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Persist event to DB for replay on reconnect
    db.insert(pageEvents)
      .values({
        id: eventId,
        eventType: event,
        payload: JSON.stringify(data),
        createdAt: now,
      })
      .run();

    const message = `id: ${eventId}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);

    Array.from(this.clients).forEach((client) => {
      try {
        client.controller.enqueue(encoded);
      } catch {
        this.clients.delete(client);
      }
    });
  }

  getClientCount() {
    return this.clients.size;
  }
}

export const sseManager = new SSEManager();

export function cleanupOldEvents(daysOld = 7) {
  const cutoff = Math.floor(Date.now() / 1000) - daysOld * 86400;
  db.delete(pageEvents).where(lt(pageEvents.createdAt, cutoff)).run();
}
