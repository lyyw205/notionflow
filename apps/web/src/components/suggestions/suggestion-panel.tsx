"use client";

import { useCallback, useEffect, useState } from "react";
import { SuggestionCard } from "./suggestion-card";

interface Suggestion {
  id: string;
  type: string;
  pageId: string | null;
  payload: string;
  confidence: number | null;
  status: string;
  createdAt: number;
}

export function SuggestionPanel() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch("/api/suggestions?status=pending");
      if (res.ok) {
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleAccept = async (id: string) => {
    const res = await fetch(`/api/suggestions/${id}/accept`, { method: "POST" });
    if (res.ok) {
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleReject = async (id: string) => {
    const res = await fetch(`/api/suggestions/${id}/reject`, { method: "POST" });
    if (res.ok) {
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    }
  };

  if (loading) return null;
  if (suggestions.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-amber-800">
          AI Suggestions
          <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
            {suggestions.length}
          </span>
        </h3>
      </div>
      <div className="space-y-2">
        {suggestions.slice(0, 5).map((s) => (
          <SuggestionCard
            key={s.id}
            suggestion={s}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        ))}
        {suggestions.length > 5 && (
          <p className="text-xs text-amber-600 text-center pt-1">
            +{suggestions.length - 5} more suggestions
          </p>
        )}
      </div>
    </div>
  );
}
