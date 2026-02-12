"use client";

import { useSSE } from "@/hooks/use-sse";
import { useEffect, useState } from "react";

interface AISidebarProps {
  pageId: string;
  initialSummary?: string;
  initialTags?: { id: string; name: string; confidence: number }[];
  initialCategory?: { id: string; name: string } | null;
}

export function AISidebar({
  pageId,
  initialSummary,
  initialTags,
  initialCategory,
}: AISidebarProps) {
  const [summary, setSummary] = useState(initialSummary || "");
  const [tags, setTags] = useState(initialTags || []);
  const [category, setCategory] = useState(initialCategory || null);
  const [processing, setProcessing] = useState(false);

  const sseEvent = useSSE(["page-updated"]);

  useEffect(() => {
    if (!sseEvent || sseEvent.type !== "page-updated") return;
    const eventData = sseEvent.data as { pageId?: string };
    if (eventData.pageId !== pageId) return;

    fetchAIData();
  }, [sseEvent, pageId]);

  async function fetchAIData() {
    setProcessing(true);
    try {
      const res = await fetch(`/api/pages/${pageId}`);
      if (res.ok) {
        const page = await res.json();
        setSummary(page.summary || "");
        setTags(page.tags ?? []);
        setCategory(page.category ?? null);
      }
    } catch {
      // Ignore
    } finally {
      setProcessing(false);
    }
  }

  async function handleRemoveTag(tagId: string) {
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    try {
      await fetch(`/api/pages/${pageId}/tags/${tagId}`, {
        method: "DELETE",
      });
    } catch {
      // Ignore
    }
  }

  return (
    <aside className="w-[300px] shrink-0 border-l border-gray-200 bg-gray-50 overflow-y-auto">
      <div className="p-4">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">
          AI Analysis
        </h2>

        {processing && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-brand-50 px-3 py-2">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            <span className="text-sm text-brand-700">Processing...</span>
          </div>
        )}

        {/* Summary */}
        <section className="mb-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Summary
          </h3>
          {summary ? (
            <p className="text-sm leading-relaxed text-gray-700">{summary}</p>
          ) : (
            <p className="text-sm text-gray-400">
              No summary yet. Start writing to generate one.
            </p>
          )}
        </section>

        {/* Tags */}
        <section className="mb-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Tags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {tags.length === 0 && (
              <p className="text-sm text-gray-400">No tags</p>
            )}
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700"
              >
                {tag.name}
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  className="ml-0.5 text-blue-400 hover:text-blue-600"
                  aria-label={`Remove tag ${tag.name}`}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </section>

        {/* Category */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Category
          </h3>
          {category ? (
            <span className="inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
              {category.name}
            </span>
          ) : (
            <p className="text-sm text-gray-400">Uncategorized</p>
          )}
        </section>
      </div>
    </aside>
  );
}
