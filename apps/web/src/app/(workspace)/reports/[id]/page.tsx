"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/header";

interface ReportChange {
  pageId: string;
  pageTitle: string;
  type: "added" | "modified" | "deleted";
  summary?: string;
}

interface ReportDetail {
  id: string;
  type: string;
  title: string;
  content: string;
  periodStart: number;
  periodEnd: number;
  createdAt: number;
  changes?: ReportChange[];
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const diffIndicator: Record<string, { label: string; className: string }> = {
  added: { label: "Added", className: "bg-green-100 text-green-700" },
  modified: { label: "Modified", className: "bg-yellow-100 text-yellow-700" },
  deleted: { label: "Deleted", className: "bg-red-100 text-red-700" },
};

export default function ReportDetailPage() {
  const params = useParams();
  const reportId = params.id as string;
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/reports/${reportId}`);
        if (res.ok) {
          const r = await res.json();
          // Parse content if it contains changes JSON
          let changes: ReportChange[] = r.changes ?? [];
          if (!changes.length && r.content) {
            try {
              const parsed = JSON.parse(r.content);
              if (parsed.changes) {
                changes = parsed.changes;
              }
            } catch {
              // Content is plain text
            }
          }
          setReport({ ...r, changes });
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [reportId]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-400">Loading report...</p>
        </div>
      </>
    );
  }

  if (!report) {
    return (
      <>
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-500">Report not found.</p>
        </div>
      </>
    );
  }

  // Extract summary text from content
  let summaryText = report.content;
  try {
    const parsed = JSON.parse(report.content);
    if (parsed.summary) {
      summaryText = parsed.summary;
    }
  } catch {
    // Content is plain text
  }

  return (
    <>
      <Header />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          {/* Report metadata */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  report.type === "daily"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {report.type}
              </span>
              <h1 className="text-xl font-bold text-gray-900">
                {report.title}
              </h1>
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span>
                Period: {formatDate(report.periodStart)} -{" "}
                {formatDate(report.periodEnd)}
              </span>
              <span>Created: {formatDate(report.createdAt)}</span>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Summary
            </h2>
            <div className="prose prose-sm max-w-none text-gray-700">
              <p className="whitespace-pre-wrap">{summaryText}</p>
            </div>
          </div>

          {/* Changes */}
          {report.changes && report.changes.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-3">
                <h2 className="text-sm font-semibold text-gray-900">
                  Changes ({report.changes.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {report.changes.map((change, i) => {
                  const indicator =
                    diffIndicator[change.type] ?? diffIndicator.modified;
                  return (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${indicator.className}`}
                      >
                        {indicator.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {change.pageTitle}
                        </p>
                        {change.summary && (
                          <p className="mt-0.5 truncate text-xs text-gray-500">
                            {change.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
