"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  Database,
  DatabaseView,
  DatabaseRecord,
  DatabaseProperty,
  SelectConfig,
  SelectOption,
  SelectColor,
  BoardViewConfig,
} from "../types";
import { COLOR_CLASSES } from "../types";
import { CellRenderer } from "../cell-renderer";

interface BoardViewProps {
  database: Database;
  activeView: DatabaseView;
  onUpdateRecord: (
    recordId: string,
    params: { values?: Record<string, unknown>; sortOrder?: number }
  ) => Promise<any>;
  onAddRecord: (values?: Record<string, unknown>) => Promise<any>;
  onDeleteRecord: (recordId: string) => Promise<void>;
}

interface KanbanColumn {
  id: string;
  option: SelectOption | null; // null = uncategorized
  records: DatabaseRecord[];
}

/* ------------------------------------------------------------------ */
/*  Sortable Card                                                     */
/* ------------------------------------------------------------------ */

function SortableCard({
  record,
  titleProperty,
  displayProperties,
  allProperties,
  onDelete,
}: {
  record: DatabaseRecord;
  titleProperty: DatabaseProperty | undefined;
  displayProperties: DatabaseProperty[];
  allProperties: DatabaseProperty[];
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: record.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative cursor-grab rounded-md border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md active:cursor-grabbing"
    >
      {/* Delete button */}
      <button
        className="absolute right-2 top-2 hidden rounded p-0.5 text-gray-300 hover:bg-gray-100 hover:text-red-500 group-hover:block"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onDelete(record.id)}
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Title */}
      <div className="mb-1 text-sm font-medium text-gray-900">
        {titleProperty ? (
          <CellRenderer
            value={record.values[titleProperty.id]}
            property={titleProperty}
            record={record}
            properties={allProperties}
          />
        ) : (
          <span className="text-gray-400">제목 없음</span>
        )}
      </div>

      {/* Extra properties (up to 2) */}
      {displayProperties.length > 0 && (
        <div className="flex flex-col gap-1">
          {displayProperties.map((prop) => (
            <div key={prop.id} className="text-xs text-gray-500">
              <CellRenderer
                value={record.values[prop.id]}
                property={prop}
                record={record}
                properties={allProperties}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card overlay (shown while dragging)                               */
/* ------------------------------------------------------------------ */

function CardOverlay({
  record,
  titleProperty,
  allProperties,
}: {
  record: DatabaseRecord;
  titleProperty: DatabaseProperty | undefined;
  allProperties: DatabaseProperty[];
}) {
  return (
    <div className="rounded-md border border-blue-300 bg-white p-3 shadow-lg">
      <div className="text-sm font-medium text-gray-900">
        {titleProperty ? (
          <CellRenderer
            value={record.values[titleProperty.id]}
            property={titleProperty}
            record={record}
            properties={allProperties}
          />
        ) : (
          <span className="text-gray-400">제목 없음</span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Board View                                                        */
/* ------------------------------------------------------------------ */

export function BoardView({
  database,
  activeView,
  onUpdateRecord,
  onAddRecord,
  onDeleteRecord,
}: BoardViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const config = activeView.config as BoardViewConfig | null;
  const kanbanPropertyId = config?.kanbanProperty;

  const kanbanProperty = kanbanPropertyId
    ? database.properties.find((p) => p.id === kanbanPropertyId)
    : undefined;

  const titleProperty = database.properties.find((p) => p.isTitle);
  const displayProperties = database.properties
    .filter((p) => !p.isTitle && p.id !== kanbanPropertyId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 2);

  // Build columns from select options
  const columns: KanbanColumn[] = useMemo(() => {
    if (!kanbanProperty) return [];

    const selectConfig = kanbanProperty.config as SelectConfig | null;
    const options = selectConfig?.options ?? [];

    const columnMap = new Map<string, DatabaseRecord[]>();
    columnMap.set("__uncategorized__", []);
    for (const opt of options) {
      columnMap.set(opt.id, []);
    }

    for (const record of database.records) {
      const val = record.values[kanbanProperty.id] as string | undefined;
      if (val && columnMap.has(val)) {
        columnMap.get(val)!.push(record);
      } else {
        columnMap.get("__uncategorized__")!.push(record);
      }
    }

    // Sort records within each column
    Array.from(columnMap.values()).forEach((records) => {
      records.sort((a, b) => a.sortOrder - b.sortOrder);
    });

    const result: KanbanColumn[] = [];

    // Uncategorized first
    const uncategorized = columnMap.get("__uncategorized__")!;
    if (uncategorized.length > 0) {
      result.push({ id: "__uncategorized__", option: null, records: uncategorized });
    }

    for (const opt of options) {
      result.push({
        id: opt.id,
        option: opt,
        records: columnMap.get(opt.id) ?? [],
      });
    }

    return result;
  }, [database.records, kanbanProperty]);

  const activeRecord = activeId
    ? database.records.find((r) => r.id === activeId)
    : null;

  const findColumnOfRecord = useCallback(
    (recordId: string): string | null => {
      for (const col of columns) {
        if (col.records.some((r) => r.id === recordId)) return col.id;
      }
      return null;
    },
    [columns]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Visual feedback handled by dnd-kit
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || !kanbanProperty) return;

      const activeRecordId = String(active.id);
      const overId = String(over.id);

      // Determine target column
      let targetColumnId: string | null = null;

      // Check if dropped on a column directly
      const droppedOnColumn = columns.find((c) => c.id === overId);
      if (droppedOnColumn) {
        targetColumnId = droppedOnColumn.id;
      } else {
        // Dropped on a record — find its column
        targetColumnId = findColumnOfRecord(overId);
      }

      if (!targetColumnId) return;

      const sourceColumnId = findColumnOfRecord(activeRecordId);
      if (sourceColumnId === targetColumnId && active.id === over.id) return;

      // Determine new select value
      const newSelectValue =
        targetColumnId === "__uncategorized__" ? null : targetColumnId;

      // Calculate new sort order
      const targetColumn = columns.find((c) => c.id === targetColumnId);
      const targetRecords = targetColumn?.records ?? [];
      const newSortOrder =
        targetRecords.length > 0
          ? targetRecords[targetRecords.length - 1].sortOrder + 1
          : 0;

      const record = database.records.find((r) => r.id === activeRecordId);
      if (!record) return;

      await onUpdateRecord(activeRecordId, {
        values: { ...record.values, [kanbanProperty.id]: newSelectValue },
        sortOrder: newSortOrder,
      });
    },
    [columns, database.records, findColumnOfRecord, kanbanProperty, onUpdateRecord]
  );

  const handleAddRecordToColumn = useCallback(
    async (columnId: string) => {
      if (!kanbanProperty) return;
      const selectValue = columnId === "__uncategorized__" ? undefined : columnId;
      const values: Record<string, unknown> = {};
      if (selectValue) {
        values[kanbanProperty.id] = selectValue;
      }
      await onAddRecord(Object.keys(values).length > 0 ? values : undefined);
    },
    [kanbanProperty, onAddRecord]
  );

  // No kanban property configured
  if (!kanbanPropertyId || !kanbanProperty) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 p-12">
        <div className="text-center text-sm text-gray-500">
          <p className="mb-1 font-medium">보드 뷰 설정이 필요합니다</p>
          <p>그룹화할 선택(Select) 속성을 설정해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const colorClasses = column.option
            ? COLOR_CLASSES[column.option.color as SelectColor] ??
              COLOR_CLASSES.gray
            : COLOR_CLASSES.gray;

          return (
            <div
              key={column.id}
              className="flex min-w-[280px] flex-shrink-0 flex-col rounded-lg bg-gray-50"
            >
              {/* Column header */}
              <div className="flex items-center gap-2 px-3 py-2.5">
                <span
                  className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colorClasses.bg} ${colorClasses.text}`}
                >
                  {column.option?.name ?? "미분류"}
                </span>
                <span className="text-xs text-gray-400">
                  {column.records.length}
                </span>
              </div>

              {/* Column body */}
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
                <SortableContext
                  items={column.records.map((r) => r.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {column.records.map((record) => (
                    <SortableCard
                      key={record.id}
                      record={record}
                      titleProperty={titleProperty}
                      displayProperties={displayProperties}
                      allProperties={database.properties}
                      onDelete={onDeleteRecord}
                    />
                  ))}
                </SortableContext>

                {/* Add record button */}
                <button
                  className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  onClick={() => handleAddRecordToColumn(column.id)}
                >
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  추가
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeRecord ? (
          <CardOverlay
            record={activeRecord}
            titleProperty={titleProperty}
            allProperties={database.properties}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
