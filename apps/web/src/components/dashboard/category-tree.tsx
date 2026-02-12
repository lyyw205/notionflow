"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface CategoryPage {
  id: string;
  title: string;
}

interface CategoryNode {
  id: string;
  name: string;
  pages: CategoryPage[];
}

interface CategoryTreeProps {
  categories: CategoryNode[];
  uncategorizedPages: CategoryPage[];
}

export function CategoryTree({
  categories,
  uncategorizedPages,
}: CategoryTreeProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Categories</h2>
      </div>
      <div className="p-3">
        {categories.map((cat) => (
          <div key={cat.id} className="mb-1">
            <button
              onClick={() => toggle(cat.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50"
            >
              <span className="w-4 text-xs text-gray-400">
                {expanded.has(cat.id) ? "\u25BC" : "\u25B6"}
              </span>
              <span className="flex-1 text-left font-medium text-gray-700">
                {cat.name}
              </span>
              <span className="text-xs text-gray-400">
                {cat.pages.length}
              </span>
            </button>
            {expanded.has(cat.id) && cat.pages.length > 0 && (
              <div className="ml-6 space-y-0.5">
                {cat.pages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => router.push(`/pages/${page.id}`)}
                    className="block w-full truncate rounded px-2 py-1 text-left text-sm text-gray-600 hover:bg-gray-50"
                  >
                    {page.title || "Untitled"}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {uncategorizedPages.length > 0 && (
          <div className="mb-1">
            <button
              onClick={() => toggle("__uncategorized")}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50"
            >
              <span className="w-4 text-xs text-gray-400">
                {expanded.has("__uncategorized") ? "\u25BC" : "\u25B6"}
              </span>
              <span className="flex-1 text-left font-medium text-gray-500">
                Uncategorized
              </span>
              <span className="text-xs text-gray-400">
                {uncategorizedPages.length}
              </span>
            </button>
            {expanded.has("__uncategorized") && (
              <div className="ml-6 space-y-0.5">
                {uncategorizedPages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => router.push(`/pages/${page.id}`)}
                    className="block w-full truncate rounded px-2 py-1 text-left text-sm text-gray-600 hover:bg-gray-50"
                  >
                    {page.title || "Untitled"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {categories.length === 0 && uncategorizedPages.length === 0 && (
          <p className="px-2 py-2 text-sm text-gray-400">No categories yet</p>
        )}
      </div>
    </div>
  );
}
