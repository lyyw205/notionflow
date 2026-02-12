"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";

interface Report {
  id: string;
  type: string;
  title: string;
  periodStart: number;
  periodEnd: number;
  createdAt: number;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch("/api/reports");
        if (res.ok) {
          const data = await res.json();
          setReports(Array.isArray(data) ? data : data.reports ?? []);
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  return (
    <>
      <Header />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Reports</h2>

          {loading && (
            <p className="text-sm text-gray-400">Loading reports...</p>
          )}

          {!loading && reports.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-gray-500">
                No reports yet. Reports are generated automatically.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {reports.map((report) => (
              <button
                key={report.id}
                onClick={() => router.push(`/reports/${report.id}`)}
                className="block w-full rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
              >
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
                  <h3 className="flex-1 font-medium text-gray-900">
                    {report.title}
                  </h3>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span>
                    Period: {formatDate(report.periodStart)} -{" "}
                    {formatDate(report.periodEnd)}
                  </span>
                  <span>Created: {formatDate(report.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
