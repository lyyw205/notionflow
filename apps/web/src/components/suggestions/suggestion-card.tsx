"use client";

interface Suggestion {
  id: string;
  type: string;
  pageId: string | null;
  payload: string;
  confidence: number | null;
  status: string;
  createdAt: number;
}

const TYPE_LABELS: Record<string, string> = {
  category_change: "Category",
  project_link: "Project Link",
  task_create: "New Task",
  status_update: "Status Update",
};

const TYPE_COLORS: Record<string, string> = {
  category_change: "bg-blue-100 text-blue-700",
  project_link: "bg-purple-100 text-purple-700",
  task_create: "bg-green-100 text-green-700",
  status_update: "bg-orange-100 text-orange-700",
};

function formatPayload(type: string, payload: string): string {
  try {
    const data = JSON.parse(payload);
    switch (type) {
      case "category_change":
        return `Assign to "${data.categoryName || "Unknown"}"`;
      case "project_link":
        return `Link to project "${data.projectName || data.projectId}"`;
      case "task_create":
        return data.title || "New task";
      case "status_update":
        return `Change to "${data.newStatus}"`;
      default:
        return JSON.stringify(data);
    }
  } catch {
    return payload;
  }
}

export function SuggestionCard({
  suggestion,
  onAccept,
  onReject,
}: {
  suggestion: Suggestion;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const label = TYPE_LABELS[suggestion.type] || suggestion.type;
  const colorClass = TYPE_COLORS[suggestion.type] || "bg-gray-100 text-gray-700";
  const description = formatPayload(suggestion.type, suggestion.payload);
  const confidence = suggestion.confidence
    ? `${Math.round(suggestion.confidence * 100)}%`
    : null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${colorClass}`}
          >
            {label}
          </span>
          {confidence && (
            <span className="text-xs text-gray-400">{confidence}</span>
          )}
        </div>
        <p className="text-sm text-gray-700 truncate">{description}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          onClick={() => onAccept(suggestion.id)}
          className="rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 border border-green-200"
        >
          Accept
        </button>
        <button
          onClick={() => onReject(suggestion.id)}
          className="rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 border border-red-200"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
