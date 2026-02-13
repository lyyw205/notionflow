"use client";

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startDate: number | null;
  endDate: number | null;
  sortOrder: number;
  aiProgress: number;
  aiSummary: string | null;
}

interface PageRef {
  id: string;
  title: string;
  summary: string | null;
  milestoneId: string | null;
  updatedAt: number;
}

interface MilestoneTimelineProps {
  milestones: Milestone[];
  pages: PageRef[];
  onEditMilestone: (milestone: Milestone) => void;
  onDeleteMilestone: (milestoneId: string) => void;
  onPageClick: (pageId: string) => void;
}

function formatDate(ts: number | null) {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

export function MilestoneTimeline({
  milestones,
  pages,
  onEditMilestone,
  onDeleteMilestone,
  onPageClick,
}: MilestoneTimelineProps) {
  if (milestones.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
        <p className="text-sm text-gray-500">No milestones yet.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

      {milestones.map((ms, idx) => {
        const msPages = pages.filter((p) => p.milestoneId === ms.id);
        const isLast = idx === milestones.length - 1;

        return (
          <div key={ms.id} className={`relative pl-10 ${isLast ? "" : "pb-6"}`}>
            {/* Timeline dot */}
            <div
              className={`absolute left-2.5 top-1 h-3 w-3 rounded-full border-2 border-white ${
                ms.status === "completed"
                  ? "bg-green-500"
                  : ms.status === "in_progress"
                    ? "bg-blue-500"
                    : "bg-gray-300"
              }`}
            />

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{ms.title}</h4>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[ms.status] || statusColors.pending}`}
                    >
                      {statusLabels[ms.status] || ms.status}
                    </span>
                  </div>

                  {ms.description && (
                    <p className="mt-1 text-sm text-gray-600">{ms.description}</p>
                  )}

                  {(ms.startDate || ms.endDate) && (
                    <p className="mt-1 text-xs text-gray-400">
                      {formatDate(ms.startDate)}
                      {ms.startDate && ms.endDate ? " - " : ""}
                      {formatDate(ms.endDate)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditMilestone(ms)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Edit"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDeleteMilestone(ms.id)}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    title="Delete"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* AI Progress bar */}
              {ms.aiProgress > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">AI Progress</span>
                    <span className="font-medium text-gray-700">{ms.aiProgress}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full bg-brand-500 transition-all"
                      style={{ width: `${ms.aiProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* AI Summary */}
              {ms.aiSummary && (
                <p className="mt-2 text-xs text-gray-500 italic">{ms.aiSummary}</p>
              )}

              {/* Linked pages */}
              {msPages.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-gray-400">Linked Pages</p>
                  {msPages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => onPageClick(page.id)}
                      className="block w-full truncate rounded px-2 py-1 text-left text-sm text-gray-600 hover:bg-gray-50"
                    >
                      {page.title || "Untitled"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
