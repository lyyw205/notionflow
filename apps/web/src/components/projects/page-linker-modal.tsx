"use client";

import { useState, useEffect } from "react";

interface PageItem {
  id: string;
  title: string;
}

interface PageLinkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (pageId: string, milestoneId?: string) => void;
  milestones: { id: string; title: string }[];
}

export function PageLinkerModal({
  isOpen,
  onClose,
  onLink,
  milestones,
}: PageLinkerModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PageItem[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setSelectedPageId(null);
      setSelectedMilestoneId("");
      fetchPages();
    }
  }, [isOpen]);

  async function fetchPages(search?: string) {
    setLoading(true);
    try {
      const url = search
        ? `/api/search?q=${encodeURIComponent(search)}`
        : "/api/pages";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.pages ?? [];
        setResults(
          list.map((p: { id: string; title: string }) => ({
            id: p.id,
            title: p.title,
          }))
        );
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(value: string) {
    setQuery(value);
    if (value.length >= 2) {
      fetchPages(value);
    } else if (value.length === 0) {
      fetchPages();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Link Page to Project
        </h3>

        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
          placeholder="Search pages..."
          autoFocus
        />

        <div className="mb-4 max-h-48 overflow-y-auto rounded-md border border-gray-200">
          {loading && (
            <p className="p-3 text-center text-sm text-gray-400">Loading...</p>
          )}
          {!loading && results.length === 0 && (
            <p className="p-3 text-center text-sm text-gray-400">
              No pages found
            </p>
          )}
          {results.map((page) => (
            <button
              key={page.id}
              onClick={() => setSelectedPageId(page.id)}
              className={`block w-full truncate px-3 py-2 text-left text-sm ${
                selectedPageId === page.id
                  ? "bg-brand-50 font-medium text-brand-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {page.title || "Untitled"}
            </button>
          ))}
        </div>

        {milestones.length > 0 && (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Milestone (optional)
            </label>
            <select
              value={selectedMilestoneId}
              onChange={(e) => setSelectedMilestoneId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-400"
            >
              <option value="">No milestone</option>
              {milestones.map((ms) => (
                <option key={ms.id} value={ms.id}>
                  {ms.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedPageId) {
                onLink(selectedPageId, selectedMilestoneId || undefined);
                onClose();
              }
            }}
            disabled={!selectedPageId}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Link
          </button>
        </div>
      </div>
    </div>
  );
}
