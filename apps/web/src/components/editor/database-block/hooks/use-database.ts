"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  Database,
  DatabaseProperty,
  DatabaseRecord,
  DatabaseView,
  PropertyType,
  ViewType,
} from "../types";

export function useDatabase(databaseId: string) {
  const [database, setDatabase] = useState<Database | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchDatabase = useCallback(async () => {
    if (!databaseId) return;
    try {
      const res = await fetch(`/api/databases/${databaseId}`);
      if (!res.ok) throw new Error("Failed to fetch database");
      const data = await res.json();
      setDatabase(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [databaseId]);

  // Initial fetch
  useEffect(() => {
    fetchDatabase();
  }, [fetchDatabase]);

  // SSE subscription
  useEffect(() => {
    if (!databaseId) return;

    const es = new EventSource("/api/sse");
    eventSourceRef.current = es;

    es.addEventListener("database-updated", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.databaseId === databaseId) {
          fetchDatabase();
        }
      } catch {
        // ignore parse errors
      }
    });

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [databaseId, fetchDatabase]);

  // Mutations

  const updateDatabaseName = useCallback(
    async (name: string) => {
      const res = await fetch(`/api/databases/${databaseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setDatabase((prev) => (prev ? { ...prev, name } : prev));
      }
    },
    [databaseId]
  );

  const addProperty = useCallback(
    async (name: string, type: PropertyType, config?: Record<string, unknown>) => {
      const res = await fetch(`/api/databases/${databaseId}/properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, config }),
      });
      if (res.ok) {
        const prop: DatabaseProperty = await res.json();
        setDatabase((prev) =>
          prev ? { ...prev, properties: [...prev.properties, prop] } : prev
        );
        return prop;
      }
      return null;
    },
    [databaseId]
  );

  const updateProperty = useCallback(
    async (
      propertyId: string,
      params: { name?: string; type?: string; config?: Record<string, unknown>; sortOrder?: number }
    ) => {
      const res = await fetch(
        `/api/databases/${databaseId}/properties/${propertyId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        }
      );
      if (res.ok) {
        const updated: DatabaseProperty = await res.json();
        setDatabase((prev) =>
          prev
            ? {
                ...prev,
                properties: prev.properties.map((p) =>
                  p.id === propertyId ? updated : p
                ),
              }
            : prev
        );
        return updated;
      }
      return null;
    },
    [databaseId]
  );

  const removeProperty = useCallback(
    async (propertyId: string) => {
      const res = await fetch(
        `/api/databases/${databaseId}/properties/${propertyId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setDatabase((prev) =>
          prev
            ? {
                ...prev,
                properties: prev.properties.filter((p) => p.id !== propertyId),
                records: prev.records.map((r) => {
                  const newValues = { ...r.values };
                  delete newValues[propertyId];
                  return { ...r, values: newValues };
                }),
              }
            : prev
        );
      }
    },
    [databaseId]
  );

  const addRecord = useCallback(
    async (values?: Record<string, unknown>) => {
      const res = await fetch(`/api/databases/${databaseId}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      if (res.ok) {
        const record: DatabaseRecord = await res.json();
        setDatabase((prev) =>
          prev ? { ...prev, records: [...prev.records, record] } : prev
        );
        return record;
      }
      return null;
    },
    [databaseId]
  );

  const updateRecord = useCallback(
    async (
      recordId: string,
      params: { values?: Record<string, unknown>; sortOrder?: number }
    ) => {
      const res = await fetch(
        `/api/databases/${databaseId}/records/${recordId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        }
      );
      if (res.ok) {
        const updated: DatabaseRecord = await res.json();
        setDatabase((prev) =>
          prev
            ? {
                ...prev,
                records: prev.records.map((r) =>
                  r.id === recordId ? updated : r
                ),
              }
            : prev
        );
        return updated;
      }
      return null;
    },
    [databaseId]
  );

  const removeRecord = useCallback(
    async (recordId: string) => {
      const res = await fetch(
        `/api/databases/${databaseId}/records/${recordId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setDatabase((prev) =>
          prev
            ? {
                ...prev,
                records: prev.records.filter((r) => r.id !== recordId),
              }
            : prev
        );
      }
    },
    [databaseId]
  );

  const addView = useCallback(
    async (name: string, type: ViewType, config?: Record<string, unknown>) => {
      const res = await fetch(`/api/databases/${databaseId}/views`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, config }),
      });
      if (res.ok) {
        const view: DatabaseView = await res.json();
        setDatabase((prev) =>
          prev ? { ...prev, views: [...prev.views, view] } : prev
        );
        return view;
      }
      return null;
    },
    [databaseId]
  );

  const updateView = useCallback(
    async (
      viewId: string,
      params: { name?: string; type?: string; config?: Record<string, unknown>; sortOrder?: number }
    ) => {
      const res = await fetch(
        `/api/databases/${databaseId}/views/${viewId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        }
      );
      if (res.ok) {
        const updated: DatabaseView = await res.json();
        setDatabase((prev) =>
          prev
            ? {
                ...prev,
                views: prev.views.map((v) =>
                  v.id === viewId ? updated : v
                ),
              }
            : prev
        );
        return updated;
      }
      return null;
    },
    [databaseId]
  );

  const removeView = useCallback(
    async (viewId: string) => {
      const res = await fetch(
        `/api/databases/${databaseId}/views/${viewId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setDatabase((prev) =>
          prev
            ? { ...prev, views: prev.views.filter((v) => v.id !== viewId) }
            : prev
        );
      }
    },
    [databaseId]
  );

  return {
    database,
    loading,
    error,
    refetch: fetchDatabase,
    updateDatabaseName,
    addProperty,
    updateProperty,
    removeProperty,
    addRecord,
    updateRecord,
    removeRecord,
    addView,
    updateView,
    removeView,
  };
}
