"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface SSEEvent {
  type: string;
  data: unknown;
  timestamp: number;
}

export function useSSE(eventTypes: string[]) {
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventTypesRef = useRef(eventTypes);

  useEffect(() => {
    eventTypesRef.current = eventTypes;
  }, [eventTypes]);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource("/api/sse");
    eventSourceRef.current = es;

    es.onopen = () => {
      retryCountRef.current = 0;
    };

    for (const eventType of eventTypesRef.current) {
      es.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setLastEvent({
            type: eventType,
            data,
            timestamp: Date.now(),
          });
        } catch {
          setLastEvent({
            type: eventType,
            data: e.data,
            timestamp: Date.now(),
          });
        }
      });
    }

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;

      const backoff = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
      retryCountRef.current += 1;

      retryTimeoutRef.current = setTimeout(() => {
        connect();
      }, backoff);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [connect]);

  return lastEvent;
}
