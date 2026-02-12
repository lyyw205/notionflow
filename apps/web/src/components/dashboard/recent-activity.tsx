"use client";

import { useRouter } from "next/navigation";

interface RecentPage {
  id: string;
  title: string;
  authorName: string;
  updatedAt: number;
  tags: string[];
}

interface RecentActivityProps {
  pages: RecentPage[];
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RecentActivity({ pages }: RecentActivityProps) {
  const router = useRouter();

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {pages.length === 0 && (
          <p className="px-5 py-4 text-sm text-gray-400">No recent activity</p>
        )}
        {pages.map((page) => (
          <button
            key={page.id}
            onClick={() => router.push(`/pages/${page.id}`)}
            className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-gray-50"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {page.title || "Untitled"}
              </p>
              <p className="text-xs text-gray-500">
                {page.authorName} &middot; {timeAgo(page.updatedAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {page.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
