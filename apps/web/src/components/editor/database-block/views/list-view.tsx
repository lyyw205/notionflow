"use client";

import { useState, useCallback, useMemo } from "react";
import type { Database, DatabaseProperty, DatabaseRecord } from "../types";
import { CellRenderer } from "../cell-renderer";
import { RecordEditor } from "../record-editor";

interface ListViewProps {
  database: Database;
  onAddRecord: (values?: Record<string, unknown>) => Promise<any>;
  onUpdateRecord: (
    recordId: string,
    params: { values?: Record<string, unknown> }
  ) => Promise<any>;
  onDeleteRecord: (recordId: string) => Promise<void>;
}

export function ListView({
  database,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
}: ListViewProps) {
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const titleProperty = database.properties.find((p) => p.isTitle);

  // Up to 3 non-title properties for metadata display
  const metadataProperties = useMemo(
    () =>
      database.properties
        .filter((p) => !p.isTitle)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, 3),
    [database.properties]
  );

  const sortedRecords = useMemo(
    () => [...database.records].sort((a, b) => a.sortOrder - b.sortOrder),
    [database.records]
  );

  const editingRecord = editingRecordId
    ? database.records.find((r) => r.id === editingRecordId) ?? null
    : null;

  const handleRowClick = useCallback((recordId: string) => {
    setEditingRecordId(recordId);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setEditingRecordId(null);
  }, []);

  const handleAddRecord = useCallback(async () => {
    await onAddRecord();
  }, [onAddRecord]);

  const handleDeleteRecord = useCallback(
    async (e: React.MouseEvent, recordId: string) => {
      e.stopPropagation();
      await onDeleteRecord(recordId);
    },
    [onDeleteRecord]
  );

  return (
    <div>
      {/* Record Editor Modal */}
      {editingRecord && (
        <RecordEditor
          record={editingRecord}
          properties={database.properties}
          onUpdate={async (_recordId, values) => {
            await onUpdateRecord(editingRecord.id, { values });
          }}
          onDelete={async (recordId) => {
            await onDeleteRecord(recordId);
            handleCloseEditor();
          }}
          onClose={handleCloseEditor}
        />
      )}

      {/* List */}
      <div className="divide-y divide-gray-200">
        {sortedRecords.map((record) => (
          <div
            key={record.id}
            className="group flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-gray-50"
            onClick={() => handleRowClick(record.id)}
          >
            {/* Title */}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900">
                {titleProperty ? (
                  <CellRenderer
                    value={record.values[titleProperty.id]}
                    property={titleProperty}
                    record={record}
                    properties={database.properties}
                  />
                ) : (
                  <span className="text-gray-400">제목 없음</span>
                )}
              </div>

              {/* Metadata properties */}
              {metadataProperties.length > 0 && (
                <div className="mt-0.5 flex items-center gap-3">
                  {metadataProperties.map((prop) => {
                    const value = record.values[prop.id];
                    if (value == null || value === "") return null;
                    return (
                      <span key={prop.id} className="text-xs text-gray-500">
                        <CellRenderer
                          value={value}
                          property={prop}
                          record={record}
                          properties={database.properties}
                        />
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Delete button */}
            <button
              className="hidden flex-shrink-0 rounded p-1 text-gray-300 hover:bg-gray-200 hover:text-red-500 group-hover:block"
              onClick={(e) => handleDeleteRecord(e, record.id)}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Add record button */}
      <button
        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600"
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
