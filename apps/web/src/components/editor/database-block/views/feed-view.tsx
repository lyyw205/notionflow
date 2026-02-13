"use client";

import { useMemo, useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { Database, DatabaseRecord } from "../types";
import { CellRenderer } from "../cell-renderer";

interface FeedViewProps {
  database: Database;
  onAddRecord: (values?: Record<string, unknown>) => Promise<any>;
  onUpdateRecord: (
    recordId: string,
    params: { values?: Record<string, unknown> }
  ) => Promise<any>;
  onDeleteRecord: (recordId: string) => Promise<void>;
}

export function FeedView({
  database,
  onAddRecord,
  onDeleteRecord,
}: FeedViewProps) {
  const titleProperty = useMemo(
    () => database.properties.find((p) => p.isTitle),
    [database.properties]
  );

  const otherProperties = useMemo(
    () =>
      [...database.properties]
        .filter((p) => !p.isTitle)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [database.properties]
  );

  const sortedRecords = useMemo(
    () => [...database.records].sort((a, b) => b.createdAt - a.createdAt),
    [database.records]
  );

  const handleAddRecord = useCallback(async () => {
    await onAddRecord();
  }, [onAddRecord]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 7) {
      return formatDistanceToNow(date, { addSuffix: true, locale: ko });
    }
    return format(date, "yyyy-MM-dd HH:mm", { locale: ko });
  };

  const getTitleValue = (record: DatabaseRecord) => {
    if (!titleProperty) return "";
    return String(record.values[titleProperty.id] ?? "");
  };

  if (sortedRecords.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-sm text-gray-400">레코드가 없습니다</p>
        <button
          className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
          onClick={handleAddRecord}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          새 레코드
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="relative ml-4 border-l-2 border-gray-200">
        {sortedRecords.map((record) => (
          <div key={record.id} className="relative mb-6 pl-8">
            {/* Timeline dot */}
            <div className="absolute left-[-7px] top-1 h-3 w-3 rounded-full bg-blue-500" />

            {/* Card */}
            <div className="group rounded-lg border border-gray-200 bg-white p-4">
              {/* Timestamp */}
              <div className="mb-1 text-xs text-gray-400">
                {formatTimestamp(record.createdAt)}
              </div>

              {/* Title */}
              <div className="mb-3 text-sm font-medium text-gray-900">
                {getTitleValue(record) || "제목 없음"}
              </div>

              {/* Properties grid */}
              {otherProperties.length > 0 && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {otherProperties.map((property) => {
                    const value = record.values[property.id];
                    if (value == null || value === "") return null;
                    return (
                      <div
                        key={property.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="shrink-0 text-gray-400">
                          {property.name}
                        </span>
                        <span className="min-w-0 text-gray-600">
                          <CellRenderer
                            value={value}
                            property={property}
                            record={record}
                            properties={database.properties}
                          />
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Delete button */}
              <button
                className="mt-2 text-xs text-red-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                onClick={() => onDeleteRecord(record.id)}
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add record button */}
      <button
        className="ml-4 flex items-center gap-1.5 pl-8 text-sm text-gray-400 hover:text-gray-600"
        onClick={handleAddRecord}
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
        새 레코드
      </button>
    </div>
  );
}
