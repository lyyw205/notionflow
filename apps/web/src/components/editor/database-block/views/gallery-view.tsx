"use client";

import { useState } from "react";
import type { Database, DatabaseRecord, DatabaseProperty } from "../types";
import { CellRenderer } from "../cell-renderer";
import { RecordEditor } from "../record-editor";

interface GalleryViewProps {
  database: Database;
  onAddRecord: (values?: Record<string, unknown>) => Promise<any>;
  onUpdateRecord: (
    recordId: string,
    params: { values?: Record<string, unknown> }
  ) => Promise<any>;
  onDeleteRecord: (recordId: string) => Promise<void>;
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url);
}

function getRecordTitle(
  record: DatabaseRecord,
  titleProperty: DatabaseProperty | undefined
): string {
  if (!titleProperty) return "";
  return String(record.values[titleProperty.id] ?? "");
}

function getRecordImageUrl(
  record: DatabaseRecord,
  properties: DatabaseProperty[]
): string | null {
  for (const prop of properties) {
    if (prop.type === "url") {
      const value = record.values[prop.id];
      if (value && typeof value === "string" && isImageUrl(value)) {
        return value;
      }
    }
  }
  return null;
}

const PLACEHOLDER_COLORS = [
  "bg-blue-100 text-blue-600",
  "bg-green-100 text-green-600",
  "bg-purple-100 text-purple-600",
  "bg-orange-100 text-orange-600",
  "bg-pink-100 text-pink-600",
  "bg-teal-100 text-teal-600",
];

function getPlaceholderColor(index: number): string {
  return PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
}

export function GalleryView({
  database,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
}: GalleryViewProps) {
  const [editingRecord, setEditingRecord] = useState<DatabaseRecord | null>(
    null
  );

  const titleProperty = database.properties.find((p) => p.isTitle === 1);
  const metaProperties = database.properties
    .filter((p) => p.isTitle !== 1)
    .slice(0, 3);

  return (
    <div className="p-4">
      {/* Card grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
        {database.records.map((record, index) => {
          const title = getRecordTitle(record, titleProperty);
          const imageUrl = getRecordImageUrl(record, database.properties);
          const initial = (title || "?").charAt(0).toUpperCase();

          return (
            <div
              key={record.id}
              className="bg-white border rounded-lg shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer"
              onClick={() => setEditingRecord(record)}
            >
              {/* Thumbnail or placeholder */}
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={title || "이미지"}
                  className="w-full h-40 object-cover bg-gray-100"
                />
              ) : (
                <div
                  className={`w-full h-40 flex items-center justify-center text-4xl font-bold ${getPlaceholderColor(index)}`}
                >
                  {initial}
                </div>
              )}

              {/* Content */}
              <div className="p-3">
                <div className="font-medium text-sm truncate">
                  {title || "제목 없음"}
                </div>
                {metaProperties.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {metaProperties.map((prop) => {
                      const value = record.values[prop.id];
                      if (value == null || value === "") return null;
                      return (
                        <div
                          key={prop.id}
                          className="flex items-center gap-2 text-xs text-gray-500"
                        >
                          <span className="flex-shrink-0">{prop.name}:</span>
                          <span className="truncate">
                            <CellRenderer
                              value={value}
                              property={prop}
                              record={record}
                              properties={database.properties}
                            />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add record button */}
      <button
        onClick={() => onAddRecord()}
        className="mt-4 w-full py-2 text-sm text-gray-500 hover:bg-gray-50 border border-dashed border-gray-300 rounded-lg transition"
      >
        + 새 레코드
      </button>

      {/* Record editor modal */}
      {editingRecord && (
        <RecordEditor
          record={editingRecord}
          properties={database.properties}
          onUpdate={async (_recordId, values) => {
            await onUpdateRecord(editingRecord.id, { values });
          }}
          onDelete={async (recordId) => {
            await onDeleteRecord(recordId);
            setEditingRecord(null);
          }}
          onClose={() => setEditingRecord(null)}
        />
      )}
    </div>
  );
}
