"use client";

import { useRouter } from "next/navigation";

interface TagItem {
  name: string;
  count: number;
}

interface TagCloudProps {
  tags: TagItem[];
}

const colors = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-yellow-100 text-yellow-700",
];

export function TagCloud({ tags }: TagCloudProps) {
  const router = useRouter();
  const maxCount = Math.max(...tags.map((t) => t.count), 1);

  function handleTagClick(tagName: string) {
    router.push(`/dashboard?tag=${encodeURIComponent(tagName)}`);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Tags</h2>
      </div>
      <div className="flex flex-wrap gap-2 p-4">
        {tags.length === 0 && (
          <p className="text-sm text-gray-400">No tags yet</p>
        )}
        {tags.map((tag, i) => {
          const opacity = 0.5 + 0.5 * (tag.count / maxCount);
          const colorClass = colors[i % colors.length];
          return (
            <button
              key={tag.name}
              onClick={() => handleTagClick(tag.name)}
              style={{ opacity }}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium transition-opacity hover:opacity-100 ${colorClass}`}
            >
              {tag.name}
              <span className="text-xs opacity-70">{tag.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
