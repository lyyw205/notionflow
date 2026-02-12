"use client";

import { useEffect, useRef, useState } from "react";

interface PageItem {
  id: string;
  title: string;
}

interface PageLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (page: PageItem) => void;
  currentPageId: string;
}

export function PageLinkModal({
  isOpen,
  onClose,
  onSelect,
  currentPageId,
}: PageLinkModalProps) {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setSelectedIndex(0);
    fetch("/api/pages")
      .then((r) => r.json())
      .then((data) => {
        const list = (Array.isArray(data) ? data : data.pages ?? []) as PageItem[];
        setPages(list.filter((p) => p.id !== currentPageId));
      })
      .catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen, currentPageId]);

  if (!isOpen) return null;

  const filtered = query
    ? pages.filter((p) =>
        p.title.toLowerCase().includes(query.toLowerCase())
      )
    : pages;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      onSelect(filtered[selectedIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl">
        <div className="border-b border-gray-100 p-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Link to page..."
            className="w-full text-sm outline-none placeholder-gray-400"
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-400">
              {pages.length === 0 ? "No other pages" : "No matches"}
            </p>
          )}
          {filtered.map((page, i) => (
            <button
              key={page.id}
              onClick={() => onSelect(page)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                i === selectedIndex
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="text-gray-400">&#9654;</span>
              <span className="truncate">{page.title || "Untitled"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
