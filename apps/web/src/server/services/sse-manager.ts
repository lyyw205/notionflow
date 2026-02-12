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
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);

    for (const client of this.clients) {
      try {
        client.controller.enqueue(encoded);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  getClientCount() {
    return this.clients.size;
  }
}

export const sseManager = new SSEManager();
